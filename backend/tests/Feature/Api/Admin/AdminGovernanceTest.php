<?php

namespace Tests\Feature\Api\Admin;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Modules\Governance\Database\Seeders\ModerationSeeder;
use Modules\Governance\Entities\ModerationItem;
use Modules\User\Entities\User;
use Spatie\Permission\Models\Role;
use Tests\Support\Api\AssertsApiJson;
use Tests\TestCase;

class AdminGovernanceTest extends TestCase
{
    use AssertsApiJson, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('permission:insert');
    }

    private function admin(): User
    {
        $admin = User::create(['name' => 'Reviewer', 'email' => 'gv'.uniqid().'@rec.test', 'password' => 'secret123']);
        $admin->assignRole(Role::where(['name' => 'super_admin', 'guard_name' => 'admin'])->first());
        Sanctum::actingAs($admin);

        return $admin;
    }

    public function test_admin_can_list_and_filter_queue(): void
    {
        $this->admin();
        $this->seed(ModerationSeeder::class);

        $this->getJson('/api/admin/moderation')->assertOk()->assertJsonStructure(['data' => [['type', 'subject', 'status']], 'meta']);
        $this->getJson('/api/admin/moderation?type=content_report')->assertOk()->assertJsonPath('meta.total', 2);
    }

    public function test_stats_shape(): void
    {
        $this->admin();
        $this->seed(ModerationSeeder::class);

        $this->getJson('/api/admin/moderation/stats')
            ->assertOk()
            ->assertJsonStructure(['data' => ['total', 'pending', 'approved', 'rejected', 'byType', 'byStatus', 'series']])
            ->assertJsonPath('data.pending', 7);
    }

    public function test_resolve_sets_decision_and_guards_double_review(): void
    {
        $reviewer = $this->admin();
        $item = ModerationItem::create(['type' => 'expert_application', 'subject' => 'X', 'status' => 'pending']);

        $this->postJson("/api/admin/moderation/{$item->id}/resolve", ['decision' => 'approved'])
            ->assertOk()
            ->assertJsonPath('data.status', 'approved')
            ->assertJsonPath('data.resolver', $reviewer->name);

        // مراجعة مكرّرة → 405
        $this->postJson("/api/admin/moderation/{$item->id}/resolve", ['decision' => 'rejected'])->assertStatus(405);

        // قرار غير صالح → 422
        $item2 = ModerationItem::create(['type' => 'content_report', 'subject' => 'Y', 'status' => 'pending']);
        $this->postJson("/api/admin/moderation/{$item2->id}/resolve", ['decision' => 'bogus'])->assertStatus(422);
    }

    public function test_non_admin_cannot_view_queue(): void
    {
        Sanctum::actingAs(User::create(['name' => 'U', 'email' => 'gv'.uniqid().'@rec.test', 'password' => 'secret123']));
        $this->getJson('/api/admin/moderation')->assertStatus(403);
    }

    // ===== إشراف المحتوى م2-ب: بلاغ العميل + فعل على الهدف + إخطار + جماعيّ =====

    private function reporter(): User
    {
        $u = User::create(['name' => 'Reporter', 'email' => 'rep'.uniqid().'@rec.test', 'password' => 'secret123']);
        Sanctum::actingAs($u);

        return $u;
    }

    public function test_user_can_report_content_creating_pending_item(): void
    {
        $reporter = $this->reporter();

        $this->postJson('/api/v1/reports', ['targetRef' => 'opportunity:5', 'subject' => 'بلاغ عن فرصة', 'reason' => 'مضلّل'])
            ->assertStatus(201)
            ->assertJsonPath('data.status', 'pending');

        $this->assertDatabaseHas('moderation_items', [
            'type' => 'content_report',
            'target_ref' => 'opportunity:5',
            'submitted_by' => $reporter->id,
            'status' => 'pending',
        ]);
    }

    public function test_report_requires_auth_and_validates_ref(): void
    {
        $this->postJson('/api/v1/reports', ['targetRef' => 'opportunity:1', 'subject' => 'x'])->assertStatus(401);

        $this->reporter();
        $this->assertApiValidation($this->postJson('/api/v1/reports', ['targetRef' => 'not-a-ref', 'subject' => 'x']), 'targetRef');
    }

    public function test_report_is_deduped_per_user_and_target(): void
    {
        $u = $this->reporter();
        $this->postJson('/api/v1/reports', ['targetRef' => 'opportunity:9', 'subject' => 'a'])->assertStatus(201);
        $this->postJson('/api/v1/reports', ['targetRef' => 'opportunity:9', 'subject' => 'b'])->assertStatus(201);

        $this->assertSame(1, ModerationItem::where('submitted_by', $u->id)->where('target_ref', 'opportunity:9')->count());
    }

    public function test_approving_content_report_takes_down_target_and_notifies_reporter(): void
    {
        $reporter = $this->reporter();
        $owner = User::create(['name' => 'Owner', 'email' => 'own'.uniqid().'@rec.test', 'password' => 'secret123']);
        $opp = \Modules\Marketplace\Entities\Opportunity::create(['title' => 'Bad job', 'user_id' => $owner->id]);
        $this->postJson('/api/v1/reports', ['targetRef' => "opportunity:{$opp->id}", 'subject' => 'بلاغ', 'reason' => 'مضلّل'])->assertStatus(201);
        $item = ModerationItem::where('target_ref', "opportunity:{$opp->id}")->firstOrFail();

        // الأدمن يقبل البلاغ → يُزال المحتوى (حذف ناعم) + يُخطَر المُبلِّغ
        $this->admin();
        $this->postJson("/api/admin/moderation/{$item->id}/resolve", ['decision' => 'approved'])
            ->assertOk()
            ->assertJsonPath('data.status', 'approved')
            ->assertJsonPath('data.removed', true);

        $this->assertSoftDeleted('opportunities', ['id' => $opp->id]);
        $this->assertDatabaseHas('notifications', ['user_id' => $reporter->id, 'category' => 'governance']);
    }

    public function test_detail_includes_target_snapshot(): void
    {
        $admin = $this->admin();
        $opp = \Modules\Marketplace\Entities\Opportunity::create(['title' => 'Snap', 'user_id' => $admin->id]);
        $item = ModerationItem::create(['type' => 'content_report', 'subject' => 'S', 'target_ref' => "opportunity:{$opp->id}", 'status' => 'pending']);

        $this->getJson("/api/admin/moderation/{$item->id}")
            ->assertOk()
            ->assertJsonPath('data.target.type', 'opportunity')
            ->assertJsonPath('data.target.title', 'Snap')
            ->assertJsonPath('data.target.removed', false);
    }

    public function test_bulk_resolve_resolves_pending_only(): void
    {
        $this->admin();
        $a = ModerationItem::create(['type' => 'endorsement', 'subject' => 'A', 'status' => 'pending']);
        $b = ModerationItem::create(['type' => 'endorsement', 'subject' => 'B', 'status' => 'pending']);
        $c = ModerationItem::create(['type' => 'endorsement', 'subject' => 'C', 'status' => 'approved']);

        $this->postJson('/api/admin/moderation/bulk-resolve', ['ids' => [$a->id, $b->id, $c->id], 'decision' => 'resolved'])
            ->assertOk()
            ->assertJsonPath('data.resolved', 2);

        $this->assertSame('resolved', $a->fresh()->status);
        $this->assertSame('resolved', $b->fresh()->status);
        $this->assertSame('approved', $c->fresh()->status); // لم يُمَسّ
    }
}
