<?php

namespace Tests\Feature\Api\Notification;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
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
}
