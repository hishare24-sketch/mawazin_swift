<?php

namespace Tests\Feature\Api\Admin;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Modules\Audit\Entities\AuditLog;
use Modules\Settings\Database\Seeders\PlatformSettingSeeder;
use Modules\User\Entities\User;
use Spatie\Permission\Models\Role;
use Tests\Support\Api\AssertsApiJson;
use Tests\TestCase;

class AdminSettingTest extends TestCase
{
    use AssertsApiJson, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('permission:insert');
    }

    private function admin(): User
    {
        $admin = User::create(['name' => 'A', 'email' => 'se'.uniqid().'@rec.test', 'password' => 'secret123']);
        $admin->assignRole(Role::where(['name' => 'super_admin', 'guard_name' => 'admin'])->first());
        Sanctum::actingAs($admin);

        return $admin;
    }

    public function test_admin_can_list_and_update_settings(): void
    {
        $this->admin();
        $this->seed(PlatformSettingSeeder::class);

        $this->getJson('/api/admin/settings')
            ->assertOk()
            ->assertJsonStructure(['data' => [['key', 'value', 'type', 'group', 'label']]]);

        $this->putJson('/api/admin/settings', ['settings' => [
            'general.platform_name' => 'اسم جديد',
            'finance.welcome_balance' => 250,
            'registration.allow_signups' => false,
        ]])->assertOk();

        $this->assertDatabaseHas('platform_settings', ['key' => 'general.platform_name', 'value' => 'اسم جديد']);
        $this->assertDatabaseHas('platform_settings', ['key' => 'finance.welcome_balance', 'value' => '250']);
        $this->assertDatabaseHas('platform_settings', ['key' => 'registration.allow_signups', 'value' => 'false']);
    }

    public function test_setting_helper_falls_back_when_unseeded(): void
    {
        // بلا بذر — الرصيد الترحيبيّ يعود للافتراضيّ 100
        $this->admin();
        $u = User::create(['name' => 'W', 'email' => 'w'.uniqid().'@rec.test', 'password' => 'secret123']);
        Sanctum::actingAs($u);
        $this->getJson('/api/v1/wallet')->assertOk()->assertJsonPath('data.balance', 100);
    }

    public function test_welcome_balance_setting_governs_new_wallets(): void
    {
        $this->admin();
        $this->seed(PlatformSettingSeeder::class);
        $this->putJson('/api/admin/settings', ['settings' => ['finance.welcome_balance' => 300]])->assertOk();

        $u = User::create(['name' => 'W2', 'email' => 'w'.uniqid().'@rec.test', 'password' => 'secret123']);
        Sanctum::actingAs($u);
        $this->getJson('/api/v1/wallet')->assertOk()->assertJsonPath('data.balance', 300);
    }

    public function test_disabling_signups_blocks_registration(): void
    {
        $this->admin();
        $this->seed(PlatformSettingSeeder::class);
        $this->putJson('/api/admin/settings', ['settings' => ['registration.allow_signups' => false]])->assertOk();

        $this->postJson('/api/v1/auth/register', ['name' => 'X', 'email' => 'blocked'.uniqid().'@rec.test', 'password' => 'secret123'])
            ->assertStatus(403);
    }

    public function test_non_admin_cannot_view_settings(): void
    {
        Sanctum::actingAs(User::create(['name' => 'U', 'email' => 'se'.uniqid().'@rec.test', 'password' => 'secret123']));
        $this->getJson('/api/admin/settings')->assertStatus(403);
        $this->getJson('/api/admin/settings/overview')->assertStatus(403);
        $this->postJson('/api/admin/settings/reset', [])->assertStatus(403);
    }

    public function test_overview_reports_modified_count(): void
    {
        $this->admin();
        $this->seed(PlatformSettingSeeder::class);

        $this->getJson('/api/admin/settings/overview')
            ->assertOk()
            ->assertJsonStructure(['data' => ['total', 'groups', 'modified', 'byGroup']])
            ->assertJsonPath('data.modified', 0); // كلّها على الافتراضيّ بعد البذر

        $this->putJson('/api/admin/settings', ['settings' => ['general.platform_name' => 'X']])->assertOk();

        $this->getJson('/api/admin/settings/overview')->assertOk()->assertJsonPath('data.modified', 1);
    }

    public function test_update_records_before_after_in_audit(): void
    {
        $this->admin();
        $this->seed(PlatformSettingSeeder::class);

        $this->putJson('/api/admin/settings', ['settings' => ['general.support_email' => 'new@rec.test']])->assertOk();

        $log = AuditLog::where('resource', 'settings')->latest('id')->first();
        $this->assertNotNull($log);
        $this->assertSame('support@rec.test', $log->meta['settings']['general.support_email']['from']);
        $this->assertSame('new@rec.test', $log->meta['settings']['general.support_email']['to']);
    }

    public function test_index_exposes_modified_flag(): void
    {
        $this->admin();
        $this->seed(PlatformSettingSeeder::class);
        $this->putJson('/api/admin/settings', ['settings' => ['general.platform_name' => 'مُعدَّل']])->assertOk();

        $this->getJson('/api/admin/settings')
            ->assertOk()
            ->assertJsonFragment(['key' => 'general.platform_name', 'modified' => true]);
    }

    public function test_reset_restores_default_and_audits(): void
    {
        $this->admin();
        $this->seed(PlatformSettingSeeder::class);
        $this->putJson('/api/admin/settings', ['settings' => ['general.platform_name' => 'مُغيَّر']])->assertOk();
        $this->assertDatabaseHas('platform_settings', ['key' => 'general.platform_name', 'value' => 'مُغيَّر']);

        $this->postJson('/api/admin/settings/reset', ['keys' => ['general.platform_name']])
            ->assertOk()
            ->assertJsonFragment(['key' => 'general.platform_name', 'modified' => false]);

        $this->assertDatabaseHas('platform_settings', ['key' => 'general.platform_name', 'value' => 'منظومة التوظيف الذكية']);

        $log = AuditLog::where('resource', 'settings')->where('action', 'reset')->latest('id')->first();
        $this->assertNotNull($log);
        $this->assertArrayHasKey('general.platform_name', $log->meta['reset']);
    }

    public function test_reset_by_group_restores_all_group_defaults(): void
    {
        $this->admin();
        $this->seed(PlatformSettingSeeder::class);
        $this->putJson('/api/admin/settings', ['settings' => [
            'registration.allow_signups' => false,
            'registration.email_verification' => true,
        ]])->assertOk();

        $this->postJson('/api/admin/settings/reset', ['group' => 'registration'])->assertOk();

        $this->assertDatabaseHas('platform_settings', ['key' => 'registration.allow_signups', 'value' => 'true']);
        $this->assertDatabaseHas('platform_settings', ['key' => 'registration.email_verification', 'value' => 'false']);
    }
}
