<?php

namespace Tests\Feature\Api\Admin;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Modules\Quality\Entities\QualityDispatch;
use Modules\Quality\Entities\TestCase as TestCaseAtom;
use Modules\User\Entities\User;
use Spatie\Permission\Models\Role;
use Tests\Support\Api\AssertsApiJson;
use Tests\TestCase;

class AdminQualityTest extends TestCase
{
    use AssertsApiJson, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('permission:insert');
    }

    private function admin(): User
    {
        $admin = User::create(['name' => 'Q', 'email' => 'q'.uniqid().'@rec.test', 'password' => 'secret123']);
        $admin->assignRole(Role::where(['name' => 'super_admin', 'guard_name' => 'admin'])->first());
        Sanctum::actingAs($admin);

        return $admin;
    }

    public function test_import_populates_atoms_from_registry(): void
    {
        $this->artisan('quality:import')->assertSuccessful();

        // السجلّ الحقيقيّ يحوي مئات الحالات عبر الطبقتين
        $this->assertGreaterThan(300, TestCaseAtom::count());
        $this->assertGreaterThan(0, TestCaseAtom::where('status', 'automated')->count());
        $this->assertGreaterThan(0, TestCaseAtom::where('status', 'gap')->count());
        $this->assertContains('backend', TestCaseAtom::distinct()->pluck('layer')->all());
        $this->assertContains('frontend', TestCaseAtom::distinct()->pluck('layer')->all());
    }

    public function test_import_is_idempotent(): void
    {
        $this->artisan('quality:import')->assertSuccessful();
        $first = TestCaseAtom::count();
        $this->artisan('quality:import')->assertSuccessful();

        $this->assertSame($first, TestCaseAtom::count());
    }

    public function test_overview_returns_counters_breakdowns_and_series(): void
    {
        $this->admin();
        $this->artisan('quality:import');

        $res = $this->getJson('/api/admin/quality/overview')
            ->assertOk()
            ->assertJsonStructure(['data' => [
                'total', 'automated', 'gap', 'failing', 'critical', 'criticalGaps', 'coverage',
                'byLayer' => [['key', 'count']],
                'byStatus' => [['key', 'count']],
                'topGapSections',
                'series' => [['date', 'coverage', 'total', 'automated']],
            ]]);

        $this->assertGreaterThan(0, $res->json('data.total'));
        // التغطية = مؤتمَت / الإجمالي × 100 (تناسق)
        $data = $res->json('data');
        $expected = round($data['automated'] / $data['total'] * 100, 1);
        $this->assertEquals($expected, $data['coverage']); // مرن على int/float من ترميز JSON
    }

    public function test_atoms_list_paginates_and_filters(): void
    {
        $this->admin();
        $this->artisan('quality:import');

        // بلا فلتر → صفحة + meta
        $this->getJson('/api/admin/quality/atoms')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [['caseId', 'title', 'layer', 'section', 'type', 'priority', 'status']],
                'meta' => ['current_page', 'last_page', 'itemPerPage', 'total'],
            ]);

        // فلتر layer=backend & status=gap → كلّ الصفوف مطابقة
        $rows = $this->getJson('/api/admin/quality/atoms?layer=backend&status=gap&perPage=50')
            ->assertOk()->json('data');

        $this->assertNotEmpty($rows);
        foreach ($rows as $row) {
            $this->assertSame('backend', $row['layer']);
            $this->assertSame('gap', $row['status']);
        }
    }

    public function test_atoms_search_matches_case_id(): void
    {
        $this->admin();
        $this->artisan('quality:import');

        $rows = $this->getJson('/api/admin/quality/atoms?q=AUTH-01')
            ->assertOk()->json('data');

        $this->assertNotEmpty($rows);
        $this->assertStringContainsString('AUTH', $rows[0]['caseId']);
    }

    public function test_non_admin_cannot_view_quality(): void
    {
        Sanctum::actingAs(User::create(['name' => 'U', 'email' => 'u'.uniqid().'@rec.test', 'password' => 'secret123']));
        $this->getJson('/api/admin/quality/overview')->assertStatus(403);
        $this->getJson('/api/admin/quality/atoms')->assertStatus(403);
    }

    public function test_snapshot_command_writes_daily_coverage_row(): void
    {
        $this->atom('SNAP-A'); // gap (افتراضيّ)
        TestCaseAtom::create([
            'case_id' => 'SNAP-B', 'title' => 't', 'layer' => 'backend', 'section' => 'S',
            'module' => 'M', 'type' => 'F', 'priority' => 'normal', 'status' => 'automated', 'lifecycle' => 'ongoing',
        ]);

        $this->artisan('quality:snapshot')->assertSuccessful();

        $snap = \Modules\Quality\Entities\QualitySnapshot::first();
        $this->assertNotNull($snap);
        $this->assertSame(2, $snap->total);
        $this->assertSame(1, $snap->automated);
        $this->assertSame(1, $snap->gap);
    }

    // ═══ توليد الفجوة → اختبار (ف5) ═══

    public function test_scaffold_generates_test_code_for_atom(): void
    {
        $this->admin();
        $atom = $this->atom('AUTH-07');

        $res = $this->getJson("/api/admin/quality/atoms/{$atom->id}/scaffold")
            ->assertOk()
            ->assertJsonStructure(['data' => ['caseId', 'framework', 'language', 'filename', 'code']]);

        $this->assertSame('AUTH-07', $res->json('data.caseId'));
        $this->assertSame('phpunit', $res->json('data.framework'));
        $this->assertStringContainsString('AUTH-07', $res->json('data.code'));
        $this->assertStringContainsString('class', $res->json('data.code'));
    }

    public function test_non_admin_cannot_scaffold(): void
    {
        $atom = $this->atom();
        Sanctum::actingAs(User::create(['name' => 'U', 'email' => 'u'.uniqid().'@rec.test', 'password' => 'secret123']));
        $this->getJson("/api/admin/quality/atoms/{$atom->id}/scaffold")->assertStatus(403);
    }

    // ═══ التحويل (ف2) ═══

    private function atom(string $caseId = 'X-01'): TestCaseAtom
    {
        return TestCaseAtom::create([
            'case_id' => $caseId, 'title' => 'حالة', 'layer' => 'backend',
            'section' => 'S', 'module' => 'M', 'type' => 'F', 'priority' => 'critical',
            'status' => 'gap', 'lifecycle' => 'new',
        ]);
    }

    public function test_board_returns_all_lanes_and_states(): void
    {
        $this->admin();

        $res = $this->getJson('/api/admin/quality/board')
            ->assertOk()
            ->assertJsonStructure(['data' => ['departments', 'states', 'lanes', 'counts', 'total']]);

        $this->assertSame(['triage', 'ops', 'testing', 'backend', 'frontend', 'filters'], $res->json('data.departments'));
        $this->assertSame(['todo', 'doing', 'review', 'done'], $res->json('data.states'));
        $this->assertSame(0, $res->json('data.total'));
    }

    public function test_dispatch_atom_creates_card_on_lane(): void
    {
        $this->admin();
        $atom = $this->atom();

        $this->postJson("/api/admin/quality/atoms/{$atom->id}/dispatch", ['department' => 'testing'])
            ->assertOk()
            ->assertJsonPath('data.department', 'testing')
            ->assertJsonPath('data.state', 'todo')
            ->assertJsonPath('data.atom.caseId', 'X-01');

        $board = $this->getJson('/api/admin/quality/board')->assertOk();
        $this->assertSame(1, $board->json('data.counts.testing'));
        $this->assertSame(1, $board->json('data.total'));
    }

    public function test_dispatch_is_single_per_atom(): void
    {
        $this->admin();
        $atom = $this->atom();

        $this->postJson("/api/admin/quality/atoms/{$atom->id}/dispatch", ['department' => 'testing'])->assertOk();
        $this->postJson("/api/admin/quality/atoms/{$atom->id}/dispatch", ['department' => 'backend', 'state' => 'doing'])->assertOk();

        $this->assertSame(1, QualityDispatch::where('test_case_id', $atom->id)->count());
        $this->assertSame('backend', QualityDispatch::where('test_case_id', $atom->id)->first()->department);
    }

    public function test_move_dispatch_changes_department_and_state(): void
    {
        $this->admin();
        $atom = $this->atom();
        $id = $this->postJson("/api/admin/quality/atoms/{$atom->id}/dispatch", ['department' => 'triage'])->json('data.id');

        $this->patchJson("/api/admin/quality/dispatches/{$id}", ['department' => 'frontend', 'state' => 'review'])
            ->assertOk();

        $d = QualityDispatch::find($id);
        $this->assertSame('frontend', $d->department);
        $this->assertSame('review', $d->state);
    }

    public function test_destroy_dispatch_removes_card(): void
    {
        $this->admin();
        $atom = $this->atom();
        $id = $this->postJson("/api/admin/quality/atoms/{$atom->id}/dispatch", ['department' => 'ops'])->json('data.id');

        $this->deleteJson("/api/admin/quality/dispatches/{$id}")->assertOk();
        $this->assertNull(QualityDispatch::find($id));
    }

    public function test_dispatch_rejects_invalid_department(): void
    {
        $this->admin();
        $atom = $this->atom();

        $this->postJson("/api/admin/quality/atoms/{$atom->id}/dispatch", ['department' => 'nowhere'])
            ->assertStatus(422);
    }

    public function test_viewer_without_manage_cannot_dispatch(): void
    {
        // مستخدم بدور أدمن يحمل view_quality فقط (بلا manage_quality)
        $role = Role::create(['name' => 'q_viewer', 'guard_name' => 'admin']);
        $role->givePermissionTo('view_quality');
        $user = User::create(['name' => 'V', 'email' => 'v'.uniqid().'@rec.test', 'password' => 'secret123']);
        $user->assignRole($role);
        Sanctum::actingAs($user);

        $atom = $this->atom();
        // يقرأ اللوحة (view_quality) لكن لا يحوّل (يفتقر manage_quality)
        $this->getJson('/api/admin/quality/board')->assertOk();
        $this->postJson("/api/admin/quality/atoms/{$atom->id}/dispatch", ['department' => 'testing'])->assertStatus(403);
    }
}
