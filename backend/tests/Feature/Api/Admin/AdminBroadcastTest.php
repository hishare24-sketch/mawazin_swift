<?php

namespace Tests\Feature\Api\Admin;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Modules\User\Entities\User;
use Spatie\Permission\Models\Role;
use Tests\Support\Api\AssertsApiJson;
use Tests\TestCase;

class AdminBroadcastTest extends TestCase
{
    use AssertsApiJson, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('permission:insert');
    }

    private function admin(): User
    {
        $admin = User::create(['name' => 'A', 'email' => 'bc'.uniqid().'@rec.test', 'password' => 'secret123', 'role' => 'seeker']);
        $admin->assignRole(Role::where(['name' => 'super_admin', 'guard_name' => 'admin'])->first());
        Sanctum::actingAs($admin);

        return $admin;
    }

    public function test_admin_can_send_broadcast_to_all_and_targeted(): void
    {
        $this->admin(); // seeker
        User::create(['name' => 'C', 'email' => 'c'.uniqid().'@rec.test', 'password' => 'secret123', 'role' => 'company']);

        // للكلّ → 2 مستخدمين
        $this->postJson('/api/admin/broadcasts', ['title' => 'إعلان', 'body' => 'مرحبًا', 'channel' => 'notification', 'audience' => 'all'])
            ->assertStatus(201)
            ->assertJsonPath('data.status', 'sent')
            ->assertJsonPath('data.recipients', 2);

        // لدور company → 1
        $this->postJson('/api/admin/broadcasts', ['title' => 'للشركات', 'body' => 'خبر', 'channel' => 'banner', 'audience' => 'role', 'audience_value' => 'company'])
            ->assertStatus(201)
            ->assertJsonPath('data.recipients', 1);

        // استهداف بلا قيمة → 422
        $this->postJson('/api/admin/broadcasts', ['title' => 'x', 'body' => 'y', 'channel' => 'email', 'audience' => 'tier'])
            ->assertStatus(422);
    }

    public function test_audience_count_and_stats(): void
    {
        $this->admin();

        $this->getJson('/api/admin/broadcasts/audience?audience=all')->assertOk()->assertJsonPath('data.count', 1);

        $this->postJson('/api/admin/broadcasts', ['title' => 't', 'body' => 'b', 'channel' => 'notification', 'audience' => 'all'])->assertStatus(201);

        $this->getJson('/api/admin/broadcasts/stats')
            ->assertOk()
            ->assertJsonStructure(['data' => ['total', 'reach', 'audienceSize', 'byChannel', 'byAudience']])
            ->assertJsonPath('data.total', 1);

        $this->getJson('/api/admin/broadcasts')->assertOk()->assertJsonStructure(['data', 'meta']);
    }

    public function test_notification_channel_creates_and_broadcasts_notifications(): void
    {
        $this->admin(); // seeker + super_admin
        User::create(['name' => 'C', 'email' => 'c'.uniqid().'@rec.test', 'password' => 'secret123', 'role' => 'company', 'tier' => 'pro']);

        \Illuminate\Support\Facades\Event::fake([\Modules\Notification\Events\NotificationSent::class]);

        $this->postJson('/api/admin/broadcasts', ['title' => 'ترقية للمحترفين', 'body' => 'مزايا جديدة', 'channel' => 'notification', 'audience' => 'tier', 'audience_value' => 'pro'])
            ->assertStatus(201);

        // إشعار فعليّ للمستهدف (pro) في قاعدة البيانات
        $this->assertDatabaseHas('notifications', ['title' => 'ترقية للمحترفين', 'category' => 'system']);
        \Illuminate\Support\Facades\Event::assertDispatched(\Modules\Notification\Events\NotificationSent::class);
    }

    public function test_banner_channel_does_not_create_notifications(): void
    {
        $this->admin();
        \Illuminate\Support\Facades\Event::fake([\Modules\Notification\Events\NotificationSent::class]);

        $this->postJson('/api/admin/broadcasts', ['title' => 'لافتة', 'body' => 'نصّ', 'channel' => 'banner', 'audience' => 'all'])
            ->assertStatus(201);

        $this->assertDatabaseMissing('notifications', ['title' => 'لافتة']);
        \Illuminate\Support\Facades\Event::assertNotDispatched(\Modules\Notification\Events\NotificationSent::class);
    }

    public function test_non_admin_cannot_view_broadcasts(): void
    {
        Sanctum::actingAs(User::create(['name' => 'U', 'email' => 'bc'.uniqid().'@rec.test', 'password' => 'secret123']));
        $this->getJson('/api/admin/broadcasts')->assertStatus(403);
    }
}
