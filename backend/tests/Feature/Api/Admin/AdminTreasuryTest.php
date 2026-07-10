<?php

namespace Tests\Feature\Api\Admin;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Modules\Account\Database\Seeders\PlatformAccountSeeder;
use Modules\Account\Entities\PlatformAccount;
use Modules\User\Entities\User;
use Spatie\Permission\Models\Role;
use Tests\Support\Api\AssertsApiJson;
use Tests\TestCase;

class AdminTreasuryTest extends TestCase
{
    use AssertsApiJson, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('permission:insert');
    }

    private function admin(): User
    {
        $admin = User::create(['name' => 'A', 'email' => 'tr'.uniqid().'@rec.test', 'password' => 'secret123']);
        $admin->assignRole(Role::where(['name' => 'super_admin', 'guard_name' => 'admin'])->first());
        Sanctum::actingAs($admin);

        return $admin;
    }

    public function test_admin_can_list_create_and_adjust_platform_accounts(): void
    {
        $this->admin();
        $this->seed(PlatformAccountSeeder::class);

        $this->getJson('/api/admin/platform-accounts')->assertOk()->assertJsonStructure(['data', 'meta']);

        $created = $this->postJson('/api/admin/platform-accounts', [
            'name' => 'حساب الأهلي', 'type' => 'bank', 'bank_name' => 'الأهلي',
        ])->assertStatus(201)->assertJsonPath('data.balance', 0)->json('data.id');

        // إيداع 500 → الرصيد 500 + حركة
        $this->postJson("/api/admin/platform-accounts/{$created}/adjust", ['amount' => 500, 'note' => 'إيداع'])
            ->assertOk()->assertJsonPath('data.balance', 500);

        // منع الرصيد السالب
        $this->postJson("/api/admin/platform-accounts/{$created}/adjust", ['amount' => -9999])->assertStatus(405);

        // دفتر الحركات
        $this->getJson("/api/admin/platform-accounts/{$created}/transactions")
            ->assertOk()->assertJsonPath('meta.total', 1);
    }

    public function test_delete_guards_default_and_nonempty(): void
    {
        $this->admin();
        $this->seed(PlatformAccountSeeder::class);

        $default = PlatformAccount::where('is_default', true)->first();
        $this->deleteJson("/api/admin/platform-accounts/{$default->id}")->assertStatus(405);

        // حساب بحركة → 405
        $funded = PlatformAccount::create(['name' => 'x', 'type' => 'cash']);
        $funded->post(100, 'adjustment');
        $this->deleteJson("/api/admin/platform-accounts/{$funded->id}")->assertStatus(405);

        // حساب فارغ → يُحذف
        $empty = PlatformAccount::create(['name' => 'y', 'type' => 'cash']);
        $this->deleteJson("/api/admin/platform-accounts/{$empty->id}")->assertOk();
        $this->assertDatabaseMissing('platform_accounts', ['id' => $empty->id]);
    }

    public function test_plan_upgrade_credits_treasury_revenue(): void
    {
        // مستخدم عاديّ يرقّي باقته → يُرصَّد الإيراد في الخزينة الافتراضيّة
        $this->seed(PlatformAccountSeeder::class);
        $this->seed(\Modules\Account\Database\Seeders\PlanSeeder::class);
        $user = User::create(['name' => 'P', 'email' => 'p'.uniqid().'@rec.test', 'password' => 'secret123']);
        Sanctum::actingAs($user);

        $this->putJson('/api/v1/account/plan', ['tier' => 'pro'])->assertOk()->assertJsonPath('data.tier', 'pro');

        $default = PlatformAccount::where('is_default', true)->first();
        $this->assertSame(50.0, (float) $default->balance);
        $this->assertDatabaseHas('platform_transactions', ['platform_account_id' => $default->id, 'type' => 'revenue', 'amount' => 50]);
    }

    public function test_wallets_stats_shape(): void
    {
        $this->admin();

        $this->getJson('/api/admin/wallets/stats')
            ->assertOk()
            ->assertJsonStructure(['data' => ['totalBalance', 'wallets', 'avgBalance', 'topHolders']]);
    }

    public function test_treasury_stats_shape(): void
    {
        $this->admin();
        $this->seed(PlatformAccountSeeder::class);

        $this->getJson('/api/admin/platform-accounts/stats')
            ->assertOk()
            ->assertJsonStructure(['data' => ['treasury', 'revenue', 'inflow', 'outflow', 'accounts', 'distribution', 'revenueSeries']]);
    }

    public function test_non_admin_cannot_list_platform_accounts(): void
    {
        Sanctum::actingAs(User::create(['name' => 'U', 'email' => 'tr'.uniqid().'@rec.test', 'password' => 'secret123']));
        $this->getJson('/api/admin/platform-accounts')->assertStatus(403);
    }
}
