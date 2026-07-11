<?php

namespace Tests\Feature\Api\Admin;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Modules\Account\Database\Seeders\PlanSeeder;
use Modules\Account\Database\Seeders\PlatformAccountSeeder;
use Modules\Account\Entities\PlatformAccount;
use Modules\Account\Entities\Wallet;
use Modules\Billing\Entities\Invoice;
use Modules\User\Entities\User;
use Spatie\Permission\Models\Role;
use Tests\Support\Api\AssertsApiJson;
use Tests\TestCase;

class AdminBillingTest extends TestCase
{
    use AssertsApiJson, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('permission:insert');
    }

    private function admin(): User
    {
        $admin = User::create(['name' => 'A', 'email' => 'bl'.uniqid().'@rec.test', 'password' => 'secret123']);
        $admin->assignRole(Role::where(['name' => 'super_admin', 'guard_name' => 'admin'])->first());
        Sanctum::actingAs($admin);

        return $admin;
    }

    public function test_plan_upgrade_creates_paid_invoice(): void
    {
        $this->seed(PlanSeeder::class);
        $user = User::create(['name' => 'Payer', 'email' => 'p'.uniqid().'@rec.test', 'password' => 'secret123']);
        Sanctum::actingAs($user);

        $this->putJson('/api/v1/account/plan', ['tier' => 'pro'])->assertOk();

        $this->assertDatabaseHas('invoices', ['user_id' => $user->id, 'plan_key' => 'pro', 'amount' => 50, 'status' => 'paid']);
    }

    public function test_admin_can_list_and_stat_invoices(): void
    {
        $owner = $this->admin();
        Invoice::create(['user_id' => $owner->id, 'user_name' => 'A', 'plan_key' => 'pro', 'plan_name' => 'الاحترافية', 'amount' => 50, 'status' => 'paid', 'reference' => 'INV-1']);

        $this->getJson('/api/admin/invoices')->assertOk()->assertJsonStructure(['data' => [['user', 'plan_key', 'amount', 'status']], 'meta']);

        $this->getJson('/api/admin/invoices/stats')
            ->assertOk()
            ->assertJsonStructure(['data' => ['revenue', 'invoices', 'paid', 'refunded', 'byPlan', 'series']])
            ->assertJsonPath('data.revenue', 50);
    }

    public function test_refund_reverses_wallet_and_treasury(): void
    {
        $this->admin();
        $this->seed(PlatformAccountSeeder::class);

        $user = User::create(['name' => 'R', 'email' => 'r'.uniqid().'@rec.test', 'password' => 'secret123']);
        $wallet = Wallet::create(['user_id' => $user->id, 'balance' => 20, 'transactions' => []]);
        $treasury = PlatformAccount::where('is_default', true)->first();
        $treasury->update(['balance' => 100]);

        $invoice = Invoice::create(['user_id' => $user->id, 'user_name' => 'R', 'plan_key' => 'pro', 'plan_name' => 'الاحترافية', 'amount' => 50, 'status' => 'paid', 'reference' => 'INV-R']);

        $this->postJson("/api/admin/invoices/{$invoice->id}/refund")
            ->assertOk()
            ->assertJsonPath('data.status', 'refunded');

        $this->assertSame(70.0, (float) $wallet->fresh()->balance);       // 20 + 50
        $this->assertSame(50.0, (float) $treasury->fresh()->balance);      // 100 - 50
        $this->assertDatabaseHas('invoices', ['id' => $invoice->id, 'status' => 'refunded']);

        // استرداد مرّتين ممنوع
        $this->postJson("/api/admin/invoices/{$invoice->id}/refund")->assertStatus(405);
    }

    public function test_non_admin_cannot_view_invoices(): void
    {
        Sanctum::actingAs(User::create(['name' => 'U', 'email' => 'bl'.uniqid().'@rec.test', 'password' => 'secret123']));
        $this->getJson('/api/admin/invoices')->assertStatus(403);
    }
}
