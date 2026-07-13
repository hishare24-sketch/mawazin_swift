<?php

namespace Tests\Feature\Api\Notification;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Laravel\Sanctum\Sanctum;
use Modules\Notification\Events\NotificationSent;
use Modules\Notification\Services\NotificationService;
use Modules\User\Entities\User;
use Tests\Support\Api\AssertsApiJson;
use Tests\TestCase;

class NotificationTest extends TestCase
{
    use AssertsApiJson, RefreshDatabase;

    private function actingAsUser(): User
    {
        $user = User::create([
            'name' => 'N',
            'email' => 'notif'.uniqid().'@rec.test',
            'password' => 'secret123',
        ]);
        Sanctum::actingAs($user);

        return $user;
    }

    public function test_first_list_creates_welcome_notification(): void
    {
        $this->actingAsUser();

        $this->getJson('/api/v1/notifications')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.category', 'system')
            ->assertJsonPath('data.0.actionTo', '/profile')
            ->assertJsonPath('data.0.read', false);
    }

    public function test_read_all_marks_notifications_read(): void
    {
        $this->actingAsUser();
        $this->getJson('/api/v1/notifications'); // welcome

        $this->postJson('/api/v1/notifications/read-all')->assertStatus(204);

        $this->getJson('/api/v1/notifications')->assertJsonPath('data.0.read', true);
    }

    public function test_notifications_are_scoped_to_user(): void
    {
        $this->actingAsUser();
        $this->getJson('/api/v1/notifications'); // welcome for user A

        $this->actingAsUser(); // user B
        $this->getJson('/api/v1/notifications')->assertJsonCount(1, 'data'); // فقط ترحيب B
    }

    public function test_index_returns_unread_count(): void
    {
        $this->actingAsUser();

        $this->getJson('/api/v1/notifications')
            ->assertOk()
            ->assertJsonPath('unread', 1)
            ->assertJsonStructure(['data' => [['id', 'title', 'read', 'at']], 'unread', 'meta' => ['current_page', 'last_page', 'itemPerPage', 'total']]);
    }

    public function test_index_paginates_while_preserving_unread_total(): void
    {
        $user = $this->actingAsUser();
        $svc = app(NotificationService::class);
        foreach (range(1, 4) as $i) {
            $svc->push($user->id, ['title' => "إشعار {$i}", 'category' => 'system']);
        }

        // الدفع المسبق يتخطّى بذر الترحيب (العدّاد > 0) → 4 إشعارات حتميًّا، كلّها غير مقروءة
        $res = $this->getJson('/api/v1/notifications?perPage=2&page=1')->assertOk();
        $res->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.total', 4)
            ->assertJsonPath('meta.last_page', 2)
            ->assertJsonPath('unread', 4); // العدّ إجماليّ لا صفحيّ
    }

    public function test_read_one_marks_single_and_enforces_ownership(): void
    {
        $owner = $this->actingAsUser();
        $id = $this->getJson('/api/v1/notifications')->json('data.0.id');

        // مالك آخر لا يستطيع
        $this->actingAsUser();
        $this->postJson("/api/v1/notifications/{$id}/read")->assertStatus(403);

        // المالك يعلّمه مقروءًا
        Sanctum::actingAs($owner);
        $this->postJson("/api/v1/notifications/{$id}/read")->assertStatus(204);
        $this->getJson('/api/v1/notifications')->assertJsonPath('unread', 0);
    }

    public function test_push_broadcasts_notification_sent(): void
    {
        $user = $this->actingAsUser();
        Event::fake([NotificationSent::class]);

        app(NotificationService::class)->push($user->id, ['title' => 'تنبيه حيّ', 'category' => 'system']);

        Event::assertDispatched(
            NotificationSent::class,
            fn ($e) => $e->uuid === $user->fresh()->uuid && $e->notification['title'] === 'تنبيه حيّ',
        );
    }
}
