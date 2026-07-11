<?php

namespace Tests\Feature\Api\Admin;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Modules\User\Entities\User;
use Spatie\Permission\Models\Role;
use Tests\Support\Api\AssertsApiJson;
use Tests\TestCase;

class AdminRoleTest extends TestCase
{
    use AssertsApiJson, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('permission:insert');
    }

    private function admin(): User
    {
        $admin = User::create(['name' => 'A', 'email' => 'rl'.uniqid().'@rec.test', 'password' => 'secret123']);
        $admin->assignRole(Role::where(['name' => 'super_admin', 'guard_name' => 'admin'])->first());
        Sanctum::actingAs($admin);

        return $admin;
    }

    public function test_admin_can_create_role_with_permissions(): void
    {
        $this->admin();

        $this->postJson('/api/admin/roles', [
            'name' => 'moderator',
            'permissions' => ['view_users', 'view_surveys', 'not_a_real_permission'],
        ])
            ->assertStatus(201)
            ->assertJsonPath('data.name', 'moderator')
            // الصلاحيّة المجهولة تُصفّى
            ->assertJsonCount(2, 'data.permissions');

        $this->assertDatabaseHas('roles', ['name' => 'moderator', 'guard_name' => 'admin']);

        // اسم مكرّر → 422
        $this->postJson('/api/admin/roles', ['name' => 'moderator'])->assertStatus(422);
        // اسم غير صالح → 422
        $this->postJson('/api/admin/roles', ['name' => 'Bad Name!'])->assertStatus(422);
    }

    public function test_created_role_is_assignable_and_enforces_permissions(): void
    {
        $this->admin();
        $this->postJson('/api/admin/roles', ['name' => 'viewer', 'permissions' => ['view_roles']])->assertStatus(201);

        // مستخدم بالدور الجديد يمرّ view_roles لكن يُرفض على غيره
        $u = User::create(['name' => 'V', 'email' => 'v'.uniqid().'@rec.test', 'password' => 'secret123']);
        $u->assignRole(Role::where(['name' => 'viewer', 'guard_name' => 'admin'])->first());
        Sanctum::actingAs($u);

        $this->getJson('/api/admin/roles')->assertOk();
        $this->getJson('/api/admin/users')->assertStatus(403);
    }

    public function test_delete_role_guards_system_and_populated(): void
    {
        $admin = $this->admin();

        // نظاميّ → 405
        $this->deleteJson('/api/admin/roles/admin')->assertStatus(405);

        // دور جديد بحامل → 405
        $this->postJson('/api/admin/roles', ['name' => 'temp'])->assertStatus(201);
        $holder = User::create(['name' => 'H', 'email' => 'h'.uniqid().'@rec.test', 'password' => 'secret123']);
        $holder->assignRole(Role::where(['name' => 'temp', 'guard_name' => 'admin'])->first());
        $this->deleteJson('/api/admin/roles/temp')->assertStatus(405);

        // دور فارغ → يُحذف
        $this->postJson('/api/admin/roles', ['name' => 'spare'])->assertStatus(201);
        $this->deleteJson('/api/admin/roles/spare')->assertOk();
        $this->assertDatabaseMissing('roles', ['name' => 'spare', 'guard_name' => 'admin']);
    }

    public function test_roles_stats_shape(): void
    {
        $this->admin();

        $this->getJson('/api/admin/roles/stats')
            ->assertOk()
            ->assertJsonStructure(['data' => ['totalRoles', 'systemRoles', 'adminUsers', 'holders', 'permissionCounts']])
            ->assertJsonPath('data.systemRoles', 3);
    }

    public function test_non_admin_cannot_create_role(): void
    {
        Sanctum::actingAs(User::create(['name' => 'U', 'email' => 'rl'.uniqid().'@rec.test', 'password' => 'secret123']));
        $this->postJson('/api/admin/roles', ['name' => 'x'])->assertStatus(403);
    }

    // ═══ C2: تدقيق قبل/بعد + عضويّة الأدوار ═══

    public function test_update_permissions_records_before_after_audit(): void
    {
        $this->admin();
        $this->postJson('/api/admin/roles', ['name' => 'auditor', 'permissions' => ['view_users']])->assertStatus(201);

        $this->putJson('/api/admin/roles/auditor/permissions', ['permissions' => ['view_users', 'view_surveys']])->assertOk();

        $log = \Modules\Audit\Entities\AuditLog::where('resource', 'roles')->where('action', 'permissions')->latest('id')->first();
        $this->assertNotNull($log);
        $this->assertSame(['view_surveys'], $log->meta['added']);
        $this->assertSame([], $log->meta['removed']);
        $this->assertSame('auditor', $log->meta['role']);
    }

    public function test_role_members_assign_and_revoke(): void
    {
        $this->admin();
        $this->postJson('/api/admin/roles', ['name' => 'helper', 'permissions' => ['view_users']])->assertStatus(201);
        $member = User::create(['name' => 'عضو', 'email' => 'mem'.uniqid().'@rec.test', 'password' => 'secret123']);

        // فارغ ابتداءً
        $this->getJson('/api/admin/roles/helper/members')->assertOk()->assertJsonCount(0, 'data.members');

        // إسناد
        $this->postJson('/api/admin/roles/helper/assign', ['userId' => $member->id])
            ->assertOk()->assertJsonPath('data.name', 'عضو');
        $this->getJson('/api/admin/roles/helper/members')->assertOk()->assertJsonCount(1, 'data.members');

        // تدقيق الإسناد
        $log = \Modules\Audit\Entities\AuditLog::where('action', 'assign')->latest('id')->first();
        $this->assertSame($member->id, $log->meta['userId']);

        // نزع
        $this->postJson('/api/admin/roles/helper/revoke', ['userId' => $member->id])->assertOk();
        $this->getJson('/api/admin/roles/helper/members')->assertOk()->assertJsonCount(0, 'data.members');
    }

    public function test_cannot_revoke_last_super_admin(): void
    {
        $admin = $this->admin(); // super_admin وحيد

        $this->postJson('/api/admin/roles/super_admin/revoke', ['userId' => $admin->id])
            ->assertStatus(405);
    }
}
