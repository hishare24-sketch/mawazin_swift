<?php

namespace Tests\Feature\Api\Notification;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Modules\Notification\Entities\DeviceToken;
use Modules\Notification\Services\FcmService;
use Modules\Notification\Services\NotificationService;
use Modules\User\Entities\User;
use Tests\Support\Api\AssertsApiJson;
use Tests\TestCase;

class DeviceTokenFcmTest extends TestCase
{
    use AssertsApiJson, RefreshDatabase;

    private function user(): User
    {
        $u = User::create(['name' => 'D', 'email' => 'dev'.uniqid().'@rec.test', 'password' => 'secret123']);
        Sanctum::actingAs($u);

        return $u;
    }

    public function test_user_can_register_and_deregister_device_token(): void
    {
        $user = $this->user();

        $this->postJson('/api/v1/device-tokens', ['token' => 'tok-abc', 'platform' => 'web'])->assertStatus(201);
        $this->assertDatabaseHas('device_tokens', ['user_id' => $user->id, 'token' => 'tok-abc', 'platform' => 'web']);

        // إعادة التسجيل لا تُكرّر الصفّ (updateOrCreate)
        $this->postJson('/api/v1/device-tokens', ['token' => 'tok-abc', 'platform' => 'android'])->assertStatus(201);
        $this->assertSame(1, DeviceToken::where('token', 'tok-abc')->count());

        $this->deleteJson('/api/v1/device-tokens', ['token' => 'tok-abc'])->assertStatus(204);
        $this->assertDatabaseMissing('device_tokens', ['token' => 'tok-abc']);
    }

    public function test_register_validates_token(): void
    {
        $this->user();
        $this->assertApiValidation($this->postJson('/api/v1/device-tokens', ['platform' => 'web']), 'token');
    }

    public function test_fcm_is_safe_noop_when_not_configured(): void
    {
        $user = $this->user();
        DeviceToken::create(['user_id' => $user->id, 'token' => 'tok-x', 'platform' => 'web']);

        $svc = app(FcmService::class);
        $this->assertFalse($svc->configured());          // لا اعتماد Firebase في الاختبار
        $this->assertSame(0, $svc->sendToUser($user->id, 'عنوان', 'نصّ')); // no-op آمن
    }

    public function test_push_invokes_fcm_send(): void
    {
        $user = $this->user();

        $mock = \Mockery::mock(FcmService::class);
        $mock->shouldReceive('sendToUser')->once()->with($user->id, 'تنبيه', \Mockery::any(), \Mockery::any())->andReturn(1);
        $this->app->instance(FcmService::class, $mock);

        app(NotificationService::class)->push($user->id, ['title' => 'تنبيه', 'body' => 'محتوى']);
    }
}
