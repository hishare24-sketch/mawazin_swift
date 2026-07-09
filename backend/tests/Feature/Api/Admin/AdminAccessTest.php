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
}
