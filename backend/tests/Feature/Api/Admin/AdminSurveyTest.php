<?php

namespace Tests\Feature\Api\Admin;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Modules\Survey\Entities\Survey;
use Modules\User\Entities\User;
use Spatie\Permission\Models\Role;
use Tests\Support\Api\AssertsApiJson;
use Tests\TestCase;

/**
 * حالات SURV (أدمن): list/فلترة + stats + close + delete + 403 — كان الملفّ مفقودًا كليًّا.
 */
class AdminSurveyTest extends TestCase
{
    use AssertsApiJson, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('permission:insert');
    }

    private function admin(): User
    {
        $admin = User::create(['name' => 'S', 'email' => 'sv'.uniqid().'@rec.test', 'password' => 'secret123']);
        $admin->assignRole(Role::where(['name' => 'super_admin', 'guard_name' => 'admin'])->first());
        Sanctum::actingAs($admin);

        return $admin;
    }

    private function survey(array $over = []): Survey
    {
        $owner = User::create(['name' => 'O', 'email' => 'ow'.uniqid().'@rec.test', 'password' => 'secret123']);

        return Survey::create(array_merge([
            'user_id' => $owner->id,
            'title' => 'استبيان تجريبيّ',
            'state' => 'active',
            'points_pool' => 100,
            'targeting' => [],
            'questions' => [['type' => 'text', 'label' => 'سؤال؟']],
            'responses' => [],
        ], $over));
    }

    public function test_index_lists_surveys_with_meta_and_state_filter(): void
    {
        $this->admin();
        $this->survey();
        $this->survey(['state' => 'closed', 'title' => 'مغلق']);

        $this->getJson('/api/admin/surveys')
            ->assertOk()
            ->assertJsonStructure(['data', 'meta' => ['current_page', 'total']]);

        $rows = $this->getJson('/api/admin/surveys?state=closed')->assertOk()->json('data');
        $this->assertCount(1, $rows);
    }

    public function test_stats_returns_counters_distribution_and_series(): void
    {
        $this->admin();
        $this->survey();
        $this->survey(['state' => 'closed']);

        $res = $this->getJson('/api/admin/surveys/stats')
            ->assertOk()
            ->assertJsonStructure(['data' => ['total', 'active', 'responses', 'avgResponses', 'distribution', 'series']]);

        $this->assertSame(2, $res->json('data.total'));
        $this->assertSame(1, $res->json('data.active'));
    }

    public function test_close_stops_an_active_survey(): void
    {
        $this->admin();
        $s = $this->survey();

        $this->postJson("/api/admin/surveys/{$s->id}/close")->assertOk();
        $this->assertSame('closed', $s->fresh()->state);
    }

    public function test_destroy_deletes_survey(): void
    {
        $this->admin();
        $s = $this->survey();

        $this->deleteJson("/api/admin/surveys/{$s->id}")->assertOk();
        $this->assertNull(Survey::find($s->id));
    }

    public function test_non_admin_is_forbidden_on_all_endpoints(): void
    {
        $s = $this->survey();
        Sanctum::actingAs(User::create(['name' => 'U', 'email' => 'u'.uniqid().'@rec.test', 'password' => 'secret123']));

        $this->getJson('/api/admin/surveys')->assertStatus(403);
        $this->getJson('/api/admin/surveys/stats')->assertStatus(403);
        $this->postJson("/api/admin/surveys/{$s->id}/close")->assertStatus(403);
        $this->deleteJson("/api/admin/surveys/{$s->id}")->assertStatus(403);
    }
}
