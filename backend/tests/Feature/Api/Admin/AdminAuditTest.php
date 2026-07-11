<?php

namespace Tests\Feature\Api\Admin;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Modules\Account\Database\Seeders\PlanSeeder;
use Modules\User\Entities\User;
use Spatie\Permission\Models\Role;
use Tests\Support\Api\AssertsApiJson;
use Tests\TestCase;

class AdminAuditTest extends TestCase
{
    use AssertsApiJson, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('permission:insert');
    }

    private function admin(): User
    {
        $admin = User::create(['name' => 'Auditor', 'email' => 'au'.uniqid().'@rec.test', 'password' => 'secret123']);
        $admin->assignRole(Role::where(['name' => 'super_admin', 'guard_name' => 'admin'])->first());
        Sanctum::actingAs($admin);

        return $admin;
    }

    public function test_mutating_admin_action_is_audited(): void
    {
        $this->admin();

        // فعل مُعدِّل: إنشاء باقة → يُسجَّل تلقائيًّا
        $this->postJson('/api/admin/plans', ['key' => 'audit', 'name' => 'تدقيق', 'price' => 10])->assertStatus(201);

        $this->assertDatabaseHas('audit_logs', ['method' => 'POST', 'resource' => 'plans', 'action' => 'create', 'status' => 201]);

        // القراءة (GET) لا تُسجَّل
        $this->getJson('/api/admin/plans')->assertOk();
        $this->assertDatabaseCount('audit_logs', 1);
    }

    public function test_action_verb_derived_from_path(): void
    {
        $this->admin();
        $this->seed(PlanSeeder::class);

        // POST plans/{id}/... غير موجود؛ نختبر close على استبيان
        $owner = User::first();
        $survey = \Modules\Survey\Entities\Survey::create(['user_id' => $owner->id, 'title' => 'S', 'state' => 'active']);
        $this->postJson("/api/admin/surveys/{$survey->id}/close")->assertOk();

        $this->assertDatabaseHas('audit_logs', ['resource' => 'surveys', 'action' => 'close', 'target_id' => $survey->id]);
    }

    public function test_admin_can_list_and_stat_audit_logs(): void
    {
        $this->admin();
        $this->postJson('/api/admin/plans', ['key' => 'a1', 'name' => 'x', 'price' => 1])->assertStatus(201);

        $this->getJson('/api/admin/audit-logs')
            ->assertOk()
            ->assertJsonStructure(['data' => [['actor', 'method', 'action', 'resource', 'status', 'at']], 'meta'])
            // resource يجب أن يكون اسم المورد نصًّا لا الموديل الملفوف (تعارض $this->resource على JsonResource)
            ->assertJsonPath('data.0.resource', 'plans')
            ->assertJsonPath('data.0.action', 'create');

        $this->getJson('/api/admin/audit-logs/stats')
            ->assertOk()
            ->assertJsonStructure(['data' => ['total', 'today', 'actors', 'byAction', 'byResource', 'series']]);

        // فلترة بالمورد
        $this->getJson('/api/admin/audit-logs?resource=plans')->assertOk()->assertJsonPath('meta.total', 1);
    }

    public function test_non_admin_cannot_view_audit(): void
    {
        Sanctum::actingAs(User::create(['name' => 'U', 'email' => 'au'.uniqid().'@rec.test', 'password' => 'secret123']));
        $this->getJson('/api/admin/audit-logs')->assertStatus(403);
        $this->getJson('/api/admin/audit-logs/export')->assertStatus(403);
    }

    public function test_export_streams_csv_of_all_matching_rows(): void
    {
        $this->admin();
        $this->postJson('/api/admin/plans', ['key' => 'e1', 'name' => 'x', 'price' => 1])->assertStatus(201);
        $this->postJson('/api/admin/plans', ['key' => 'e2', 'name' => 'y', 'price' => 2])->assertStatus(201);

        $res = $this->get('/api/admin/audit-logs/export');
        $res->assertOk();
        $res->assertHeader('content-type', 'text/csv; charset=UTF-8');

        $csv = $res->streamedContent();
        // ترويسة + صفّان مطابقان
        $this->assertStringContainsString('id,at,actor,actor_id,method,resource,action,path', $csv);
        $lines = array_values(array_filter(explode("\n", trim($csv))));
        $this->assertCount(3, $lines); // header + 2 rows
        $this->assertStringContainsString('plans', $csv);
    }

    public function test_export_respects_resource_filter(): void
    {
        $admin = $this->admin();
        $this->postJson('/api/admin/plans', ['key' => 'f1', 'name' => 'x', 'price' => 1])->assertStatus(201);
        // فعل على مورد آخر (surveys/close) كي لا يظهر في تصدير plans
        $survey = \Modules\Survey\Entities\Survey::create(['user_id' => $admin->id, 'title' => 'S', 'state' => 'active']);
        $this->postJson("/api/admin/surveys/{$survey->id}/close")->assertOk();

        $csv = $this->get('/api/admin/audit-logs/export?resource=plans')->assertOk()->streamedContent();
        $lines = array_values(array_filter(explode("\n", trim($csv))));
        $this->assertCount(2, $lines); // header + plans row only
        $this->assertStringNotContainsString('surveys', $csv);
    }

    public function test_date_range_filter_narrows_results(): void
    {
        $this->admin();
        $this->postJson('/api/admin/plans', ['key' => 'd1', 'name' => 'x', 'price' => 1])->assertStatus(201);

        // اليوم يُرجِع القيد؛ نطاق ماضٍ لا يُرجِع شيئًا
        $today = \Illuminate\Support\Carbon::now()->toDateString();
        $this->getJson("/api/admin/audit-logs?from={$today}&to={$today}")->assertOk()->assertJsonPath('meta.total', 1);

        $past = \Illuminate\Support\Carbon::now()->subDays(5)->toDateString();
        $this->getJson("/api/admin/audit-logs?from={$past}&to={$past}")->assertOk()->assertJsonPath('meta.total', 0);
    }
}
