<?php

namespace Tests\Feature\Api\Admin;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Modules\Account\Database\Seeders\PlanSeeder;
use Modules\Account\Entities\Plan;
use Modules\User\Entities\User;
use Spatie\Permission\Models\Role;
use Tests\Support\Api\AssertsApiJson;
use Tests\TestCase;

class AdminPlanTest extends TestCase
{
    use AssertsApiJson, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('permission:insert');
        $this->seed(PlanSeeder::class);
    }

    private function admin(): User
    {
        $admin = User::create(['name' => 'A', 'email' => 'pl'.uniqid().'@rec.test', 'password' => 'secret123']);
        $admin->assignRole(Role::where(['name' => 'super_admin', 'guard_name' => 'admin'])->first());
        Sanctum::actingAs($admin);

        return $admin;
    }

    public function test_admin_can_list_plans_ordered(): void
    {
        $this->admin();

        $this->getJson('/api/admin/plans')
            ->assertOk()
            ->assertJsonStructure(['data', 'meta'])
            ->assertJsonPath('meta.total', 3)
            ->assertJsonPath('data.0.key', 'free')
            ->assertJsonPath('data.2.key', 'elite');
    }

    public function test_admin_can_update_plan_price_and_features(): void
    {
        $this->admin();
        $plan = Plan::where('key', 'pro')->first();

        $this->putJson("/api/admin/plans/{$plan->id}", [
            'price' => 75,
            'active' => false,
            'features' => ['ميزة أولى', 'ميزة ثانية'],
        ])
            ->assertOk()
            ->assertJsonPath('data.price', 75)
            ->assertJsonPath('data.active', false)
            ->assertJsonPath('data.features.0', 'ميزة أولى');

        $this->assertDatabaseHas('plans', ['key' => 'pro', 'price' => 75, 'active' => false]);
    }

    public function test_non_admin_cannot_list_plans(): void
    {
        Sanctum::actingAs(User::create(['name' => 'U', 'email' => 'pl'.uniqid().'@rec.test', 'password' => 'secret123']));
        $this->getJson('/api/admin/plans')->assertStatus(403);
    }

    public function test_admin_can_create_plan(): void
    {
        $this->admin();

        $this->postJson('/api/admin/plans', [
            'key' => 'team',
            'name' => 'الفريق',
            'price' => 300,
            'survey_limit' => 50,
            'features' => ['ميزة'],
            'active' => true,
        ])
            ->assertStatus(201)
            ->assertJsonPath('data.key', 'team')
            ->assertJsonPath('data.price', 300);

        $this->assertDatabaseHas('plans', ['key' => 'team', 'price' => 300]);

        // key مكرّر → 422
        $this->postJson('/api/admin/plans', ['key' => 'team', 'name' => 'x', 'price' => 1])->assertStatus(422);
    }

    public function test_admin_can_delete_empty_plan_but_not_one_with_subscribers(): void
    {
        $this->admin();
        $empty = Plan::create(['key' => 'ghost', 'name' => 'شبح', 'price' => 10, 'sort' => 9]);

        // free له مشترك (المستخدم الأدمن نفسه tier=free) → 405
        $free = Plan::where('key', 'free')->first();
        $this->deleteJson("/api/admin/plans/{$free->id}")->assertStatus(405);

        // ghost بلا مشتركين → يُحذف
        $this->deleteJson("/api/admin/plans/{$empty->id}")->assertOk();
        $this->assertDatabaseMissing('plans', ['id' => $empty->id]);
    }

    public function test_plans_stats_shape(): void
    {
        $this->admin();

        $this->getJson('/api/admin/plans/stats')
            ->assertOk()
            ->assertJsonStructure(['data' => ['totalPlans', 'activePlans', 'subscribers', 'mrr', 'distribution']])
            ->assertJsonPath('data.totalPlans', 3);
    }
}
