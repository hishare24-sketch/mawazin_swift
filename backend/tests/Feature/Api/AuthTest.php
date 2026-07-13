<?php

namespace Tests\Feature\Api;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\User\Entities\User;
use Tests\Support\Api\AssertsApiJson;
use Tests\TestCase;

/**
 * حالات: AUTH-01..04 + AUTH-07..13 من DOC/TEST_CASES.md — دورة حياة التوكن
 * (دخول/me/خروج) + تحقّق register/login (422) + الحساب الموقوف (403).
 */
class AuthTest extends TestCase
{
    use AssertsApiJson, RefreshDatabase;

    private function user(string $password = 'secret123'): User
    {
        return User::create([
            'name' => 'مستخدم', 'email' => 'auth'.uniqid().'@rec.test', 'password' => $password,
        ]);
    }

    // AUTH-01: دخول صحيح → توكن + مستخدم
    public function test_login_with_valid_credentials_returns_token_and_user(): void
    {
        $u = $this->user();

        $this->postJson('/api/v1/auth/login', ['email' => $u->email, 'password' => 'secret123'])
            ->assertOk()
            ->assertJsonStructure(['data' => ['token', 'user' => ['id', 'email']]])
            ->assertJsonPath('data.user.email', $u->email);
    }

    // AUTH-02: دخول ببيانات خاطئة → 401 (بيانات غير صحيحة) لا 500، وبلا توكن
    public function test_login_with_wrong_password_is_rejected_without_token(): void
    {
        $u = $this->user();

        $res = $this->postJson('/api/v1/auth/login', ['email' => $u->email, 'password' => 'WRONG-pass'])
            ->assertStatus(401);

        $this->assertNull($res->json('data.token'));
    }

    // AUTH-03: التوكن يصادِق me بالمستخدم الصحيح، والخروج ينجح (إبطال التوكن يُنفَّذ عبر
    // currentAccessToken()->delete()؛ التحقّق الكامل من الإبطال E2E — env الاختبار يحمل جلسة).
    public function test_token_authenticates_me_and_logout_succeeds(): void
    {
        $u = $this->user();
        $token = $this->postJson('/api/v1/auth/login', ['email' => $u->email, 'password' => 'secret123'])
            ->assertOk()->json('data.token');
        $auth = ['Authorization' => "Bearer {$token}"];

        $this->getJson('/api/v1/auth/me', $auth)->assertOk()->assertJsonPath('data.email', $u->email);
        $this->postJson('/api/v1/auth/logout', [], $auth)->assertOk();
    }

    // حارس: نقطة مصادَقة بلا توكن → 401
    public function test_me_requires_authentication(): void
    {
        $this->getJson('/api/v1/auth/me')->assertStatus(401);
    }

    // ═══ تحقّق register (AUTH-07..11) ═══

    private function registerPayload(array $over = []): array
    {
        return array_merge([
            'name' => 'مسجّل جديد',
            'email' => 'reg'.uniqid().'@rec.test',
            'password' => 'secret123',
        ], $over);
    }

    // AUTH-07: register بلا name/email/password → 422 بأخطاء الحقول الثلاثة
    public function test_register_requires_name_email_and_password(): void
    {
        $this->postJson('/api/v1/auth/register', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'email', 'password']);
    }

    // AUTH-08: register ببريد مكرّر → 422 (unique)
    public function test_register_rejects_duplicate_email(): void
    {
        $existing = $this->user();

        $this->postJson('/api/v1/auth/register', $this->registerPayload(['email' => $existing->email]))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    // AUTH-09: register بكلمة مرور أقصر من 6 → 422
    public function test_register_rejects_short_password(): void
    {
        $this->postJson('/api/v1/auth/register', $this->registerPayload(['password' => '12345']))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
    }

    // AUTH-10: register بـ role/kind خارج القائمة → 422
    public function test_register_rejects_invalid_role_and_kind(): void
    {
        $this->postJson('/api/v1/auth/register', $this->registerPayload(['role' => 'hacker']))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['role']);

        $this->postJson('/api/v1/auth/register', $this->registerPayload(['kind' => 'alien']))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['kind']);
    }

    // AUTH-11: register بلا role/kind → 201 بالافتراضيّ (seeker/individual)
    public function test_register_defaults_role_and_kind(): void
    {
        $email = 'reg'.uniqid().'@rec.test';

        $this->postJson('/api/v1/auth/register', $this->registerPayload(['email' => $email]))
            ->assertStatus(201)
            ->assertJsonStructure(['data' => ['token', 'user']]);

        $u = User::where('email', $email)->first();
        $this->assertSame('seeker', $u->role);
        $this->assertSame('individual', $u->kind);
    }

    // ═══ تحقّق login + الحساب الموقوف (AUTH-12..13) ═══

    // AUTH-12: login ببريد غير صالح أو بلا password → 422
    public function test_login_validates_email_format_and_required_password(): void
    {
        $this->postJson('/api/v1/auth/login', ['email' => 'not-an-email', 'password' => 'x'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email']);

        $this->postJson('/api/v1/auth/login', ['email' => 'a@b.test'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
    }

    // AUTH-13: حساب مُعلَّق ببيانات صحيحة → 403 «موقوف» بلا توكن
    public function test_suspended_account_cannot_login_even_with_valid_credentials(): void
    {
        $u = $this->user();
        $u->update(['status' => 'suspended']);

        $res = $this->postJson('/api/v1/auth/login', ['email' => $u->email, 'password' => 'secret123'])
            ->assertStatus(403);

        $this->assertNull($res->json('data.token'));
    }
}
