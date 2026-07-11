<?php

namespace Tests\Feature\Api\Admin;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Modules\Settings\Database\Seeders\BrandingSettingSeeder;
use Modules\User\Entities\User;
use Spatie\Permission\Models\Role;
use Tests\Support\Api\AssertsApiJson;
use Tests\TestCase;

class AdminBrandingTest extends TestCase
{
    use AssertsApiJson, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('permission:insert');
    }

    private function admin(): User
    {
        $admin = User::create(['name' => 'A', 'email' => 'br'.uniqid().'@rec.test', 'password' => 'secret123']);
        $admin->assignRole(Role::where(['name' => 'super_admin', 'guard_name' => 'admin'])->first());
        Sanctum::actingAs($admin);

        return $admin;
    }

    public function test_admin_can_read_branding(): void
    {
        $this->admin();
        $this->seed(BrandingSettingSeeder::class);

        $this->getJson('/api/admin/branding')
            ->assertOk()
            ->assertJsonStructure(['data' => ['platformName', 'preset', 'mode', 'primaryColor', 'loginHeadline']])
            ->assertJsonPath('data.preset', 'littlebee');
    }

    public function test_admin_can_update_branding_and_normalizes_hex(): void
    {
        $this->admin();

        $this->putJson('/api/admin/branding', [
            'platform_name' => 'بوّابة التوظيف',
            'default_preset' => 'ocean',
            'primary_color' => '1e88e5',
            'default_mode' => 'light',
        ])->assertOk()
            ->assertJsonPath('data.platformName', 'بوّابة التوظيف')
            ->assertJsonPath('data.preset', 'ocean')
            ->assertJsonPath('data.primaryColor', '#1e88e5');

        $this->assertDatabaseHas('branding_settings', ['default_preset' => 'ocean', 'primary_color' => '#1e88e5']);
    }

    public function test_invalid_preset_and_color_rejected(): void
    {
        $this->admin();
        $this->putJson('/api/admin/branding', ['default_preset' => 'bogus'])->assertStatus(422);
        $this->putJson('/api/admin/branding', ['primary_color' => 'zzz'])->assertStatus(422);
    }

    public function test_public_branding_endpoint_is_open(): void
    {
        $this->seed(BrandingSettingSeeder::class);

        // بلا مصادقة
        $this->getJson('/api/v1/branding')
            ->assertOk()
            ->assertJsonPath('data.platformName', 'منظومة التوظيف الذكية');
    }

    public function test_non_admin_cannot_manage_branding(): void
    {
        Sanctum::actingAs(User::create(['name' => 'U', 'email' => 'br'.uniqid().'@rec.test', 'password' => 'secret123']));
        $this->putJson('/api/admin/branding', ['platform_name' => 'x'])->assertStatus(403);
    }
}
