<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;
use Modules\User\Entities\User;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * تخويل قنوات Reverb الخاصّة (DOC/TEST_CASES.md RT-001..006) عبر POST /broadcasting/auth.
 *
 * 🔎 حسم التحقيق الأمنيّ السابق: الـ«200 لقناة الغير» كان **أثر بيئة اختبار لا ثغرة** —
 * phpunit.xml يضبط BROADCAST_CONNECTION=null، وNullBroadcaster::auth() فارغ فيعيد 200
 * لأيّ قناة بلا تحقّق. الإنتاج يعمل بـreverb الذي يمرّ بـBroadcaster::verifyUserCanAccessChannel
 * (ردود routes/channels.php) فيرفض 403 صحيحًا. هنا نبدّل المذيع إلى reverb ببيانات وهميّة
 * (توقيع التخويل محليّ — لا اتّصال شبكيًّا) لنختبر مسار التخويل الحقيقيّ نفسه.
 */
class BroadcastChannelsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('permission:insert');

        config([
            'broadcasting.default' => 'reverb',
            'broadcasting.connections.reverb.key' => 'test-key',
            'broadcasting.connections.reverb.secret' => 'test-secret',
            'broadcasting.connections.reverb.app_id' => 'test-app',
            'broadcasting.connections.reverb.options.host' => '127.0.0.1',
            'broadcasting.connections.reverb.options.port' => 8080,
            'broadcasting.connections.reverb.options.scheme' => 'http',
            'broadcasting.connections.reverb.options.useTLS' => false,
        ]);

        // القنوات سُجّلت عند الإقلاع على مذيع null (الافتراضيّ في phpunit.xml)؛ بعد
        // التبديل إلى reverb يُنشأ مذيع جديد بلا قنوات → نعيد تسجيلها عليه.
        require base_path('routes/channels.php');
    }

    private function user(): User
    {
        return User::create(['name' => 'U', 'email' => 'ch'.uniqid().'@rec.test', 'password' => 'secret123']);
    }

    private function auth(string $channel): TestResponse
    {
        return $this->postJson('/broadcasting/auth', ['socket_id' => '1234.5678', 'channel_name' => $channel]);
    }

    // RT-001: قناة المستخدم تُصرَّح لصاحب الـuuid — 200 مع توقيع
    public function test_user_channel_authorizes_the_owner(): void
    {
        $owner = $this->user();
        Sanctum::actingAs($owner);

        $this->auth("private-user.{$owner->uuid}")
            ->assertOk()
            ->assertJsonStructure(['auth']);
    }

    // RT-002: قناة user.{uuid} تخصّ الغير → 403 (جوهر التحقيق الأمنيّ)
    public function test_user_channel_rejects_other_users(): void
    {
        Sanctum::actingAs($this->user());

        $this->auth('private-user.'.$this->user()->uuid)->assertForbidden();
    }

    // RT-003: support.admin تتطلّب view_support على guard admin
    public function test_support_admin_channel_requires_view_support(): void
    {
        $admin = $this->user();
        $role = Role::create(['name' => 'sup_'.uniqid(), 'guard_name' => 'admin']);
        $role->givePermissionTo('view_support');
        $admin->assignRole($role);
        Sanctum::actingAs($admin);
        $this->auth('private-support.admin')->assertOk();

        Sanctum::actingAs($this->user());
        $this->auth('private-support.admin')->assertForbidden();
    }

    // RT-004: admin.governance تتطلّب view_governance على guard admin
    public function test_governance_channel_requires_view_governance(): void
    {
        $admin = $this->user();
        $role = Role::create(['name' => 'gov_'.uniqid(), 'guard_name' => 'admin']);
        $role->givePermissionTo('view_governance');
        $admin->assignRole($role);
        Sanctum::actingAs($admin);
        $this->auth('private-admin.governance')->assertOk();

        Sanctum::actingAs($this->user());
        $this->auth('private-admin.governance')->assertForbidden();
    }

    // RT-005: التخويل يتطلّب مصادقة — بلا توكن → 401 (auth:sanctum على مسار البثّ)
    public function test_channel_auth_requires_authentication(): void
    {
        $this->auth('private-admin.governance')->assertStatus(401);
    }

    // RT-006: قناة غير معرَّفة في channels.php → رفض (لا تصريح افتراضيّ)
    public function test_unknown_channel_is_rejected(): void
    {
        Sanctum::actingAs($this->user());

        $this->auth('private-not-a-real-channel')->assertForbidden();
    }
}
