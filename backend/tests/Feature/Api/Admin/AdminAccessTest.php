<?php

namespace Tests\Feature\Api\Admin;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Modules\User\Entities\User;
use Spatie\Permission\Models\Role;
use Tests\Support\Api\AssertsApiJson;
use Tests\TestCase;

class AdminAccessTest extends TestCase
{
    use AssertsApiJson, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('permission:insert');
    }

    private function user(): User
    {
        return User::create([
            'name' => 'U',
            'email' => 'a'.uniqid().'@rec.test',
            'password' => 'secret123',
        ]);
    }

    public function test_admin_route_requires_authentication(): void
    {
        $this->assertApiUnauthenticated($this->getJson('/api/admin/users'));
    }

    public function test_non_admin_user_is_forbidden(): void
    {
        Sanctum::actingAs($this->user());

        $this->getJson('/api/admin/users')->assertStatus(403);
    }

    public function test_admin_can_list_users_paginated(): void
    {
        $admin = $this->user();
        $admin->assignRole(Role::where(['name' => 'super_admin', 'guard_name' => 'admin'])->first());
        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/users')
            ->assertOk()
            ->assertJsonStructure(['data', 'meta' => ['current_page', 'last_page', 'total']]);
    }

    public function test_admin_with_role_but_missing_permission_gets_403(): void
    {
        // دور بلا صلاحية view_users → يمرّ الحارس لكن authorize يرفض
        $admin = $this->user();
        Role::firstOrCreate(['name' => 'empty_admin', 'guard_name' => 'admin']);
        $admin->assignRole(Role::where(['name' => 'empty_admin', 'guard_name' => 'admin'])->first());
        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/users')->assertStatus(403);
    }

    private function superAdmin(): User
    {
        $admin = $this->user();
        $admin->assignRole(Role::where(['name' => 'super_admin', 'guard_name' => 'admin'])->first());
        Sanctum::actingAs($admin);

        return $admin;
    }

    public function test_admin_can_read_stats(): void
    {
        $this->superAdmin();

        $this->getJson('/api/admin/stats')
            ->assertOk()
            ->assertJsonStructure(['data' => ['totals' => ['users'], 'usersByRole', 'signups']]);
    }

    public function test_admin_can_update_and_suspend_user(): void
    {
        $this->superAdmin();
        $target = $this->user();

        $this->patchJson("/api/admin/users/{$target->id}", ['tier' => 'pro'])
            ->assertOk()
            ->assertJsonPath('data.tier', 'pro');

        $this->postJson("/api/admin/users/{$target->id}/suspend")
            ->assertOk()
            ->assertJsonPath('data.status', 'suspended');

        $this->postJson("/api/admin/users/{$target->id}/activate")
            ->assertOk()
            ->assertJsonPath('data.status', 'active');
    }

    public function test_admin_cannot_suspend_self(): void
    {
        $admin = $this->superAdmin();

        $this->postJson("/api/admin/users/{$admin->id}/suspend")->assertStatus(405);
    }

    public function test_suspended_user_cannot_login(): void
    {
        $this->superAdmin();
        $target = User::create(['name' => 'S', 'email' => 'sus@rec.test', 'password' => 'secret123']);

        $this->postJson("/api/admin/users/{$target->id}/suspend")->assertOk();

        $this->postJson('/api/v1/auth/login', ['email' => 'sus@rec.test', 'password' => 'secret123'])
            ->assertStatus(403);
    }

    public function test_admin_can_assign_and_remove_admin_role(): void
    {
        $this->superAdmin();
        $target = $this->user();

        $this->putJson("/api/admin/users/{$target->id}/admin-role", ['role' => 'governance'])
            ->assertOk()
            ->assertJsonPath('data.adminRoles', ['governance']);

        $this->putJson("/api/admin/users/{$target->id}/admin-role", ['role' => null])
            ->assertOk()
            ->assertJsonPath('data.adminRoles', []);
    }

    public function test_admin_can_read_roles_matrix(): void
    {
        $this->superAdmin();

        $this->getJson('/api/admin/roles')
            ->assertOk()
            ->assertJsonStructure(['data' => ['roles' => [['name', 'usersCount', 'permissions']], 'permissions']]);
    }
}
