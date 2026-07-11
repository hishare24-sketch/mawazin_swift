<?php

namespace Tests\Feature\Api\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Modules\User\Emails\WelcomeMail;
use Tests\Support\Api\AssertsApiJson;
use Tests\TestCase;

class WelcomeEmailTest extends TestCase
{
    use AssertsApiJson, RefreshDatabase;

    public function test_registration_queues_welcome_email(): void
    {
        Mail::fake();

        $email = 'welcome'.uniqid().'@rec.test';
        $this->postJson('/api/v1/auth/register', ['name' => 'وافد جديد', 'email' => $email, 'password' => 'secret123'])
            ->assertStatus(201);

        // البريد الترحيبيّ (عبر Resend في الإنتاج) مُصفَّر للمستخدم الصحيح
        Mail::assertQueued(WelcomeMail::class, fn (WelcomeMail $m) => $m->hasTo($email));
    }

    public function test_no_welcome_email_when_signups_disabled(): void
    {
        Mail::fake();
        \Modules\Settings\Entities\PlatformSetting::create([
            'key' => 'registration.allow_signups', 'value' => 'false', 'default_value' => 'true', 'type' => 'boolean', 'group' => 'registration', 'label' => 'x',
        ]);

        $this->postJson('/api/v1/auth/register', ['name' => 'X', 'email' => 'no'.uniqid().'@rec.test', 'password' => 'secret123'])
            ->assertStatus(403);

        Mail::assertNothingQueued();
    }
}
