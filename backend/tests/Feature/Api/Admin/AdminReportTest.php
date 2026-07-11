<?php

namespace Tests\Feature\Api\Admin;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Modules\User\Entities\User;
use Spatie\Permission\Models\Role;
use Tests\Support\Api\AssertsApiJson;
use Tests\TestCase;

class AdminReportTest extends TestCase
{
    use AssertsApiJson, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('permission:insert');
    }

    private function admin(): User
    {
        $admin = User::create(['name' => 'A', 'email' => 'rp'.uniqid().'@rec.test', 'password' => 'secret123']);
        $admin->assignRole(Role::where(['name' => 'super_admin', 'guard_name' => 'admin'])->first());
        Sanctum::actingAs($admin);

        return $admin;
    }

    public function test_overview_returns_funnel_conversion_and_kpis(): void
    {
        $this->admin();

        $this->getJson('/api/admin/reports/overview')
            ->assertOk()
            ->assertJsonStructure(['data' => [
                'funnel' => [['stage', 'value']],
                'conversion' => ['applicationsPerOpportunity', 'interviewRate', 'completionRate'],
                'kpis' => ['users', 'opportunities', 'applications', 'interviews', 'revenue', 'assistantMessages', 'openTickets'],
                'growthSeries' => [['date', 'value']],
                'revenueSeries',
            ]]);
    }

    public function test_growth_report_returns_series_and_table(): void
    {
        $this->admin();

        $this->getJson('/api/admin/reports/report?domain=growth')
            ->assertOk()
            ->assertJsonStructure(['data' => ['domain', 'summary', 'series', 'columns', 'rows']])
            ->assertJsonPath('data.domain', 'growth');
    }

    public function test_funnel_report_has_stage_rows(): void
    {
        $this->admin();

        $this->getJson('/api/admin/reports/report?domain=funnel')
            ->assertOk()
            ->assertJsonPath('data.domain', 'funnel')
            ->assertJsonStructure(['data' => ['summary', 'breakdown', 'rows']]);
    }

    public function test_invalid_domain_rejected(): void
    {
        $this->admin();
        $this->getJson('/api/admin/reports/report?domain=bogus')->assertStatus(422);
    }

    public function test_non_admin_cannot_view_reports(): void
    {
        Sanctum::actingAs(User::create(['name' => 'U', 'email' => 'rp'.uniqid().'@rec.test', 'password' => 'secret123']));
        $this->getJson('/api/admin/reports/overview')->assertStatus(403);
    }
}
