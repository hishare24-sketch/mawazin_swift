<?php

namespace Tests\Feature\Api\AccountState;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Modules\User\Entities\User;
use Tests\Support\Api\AssertsApiJson;
use Tests\TestCase;

class AccountStateTest extends TestCase
{
    use AssertsApiJson, RefreshDatabase;

    private function actingAsUser(): User
    {
        $user = User::create([
            'name' => 'S',
            'email' => 'st'.uniqid().'@rec.test',
            'password' => 'secret123',
        ]);
        Sanctum::actingAs($user);

        return $user;
    }

    public function test_get_returns_null_when_not_saved(): void
    {
        $this->actingAsUser();

        $this->getJson('/api/v1/account-states/candidates')
            ->assertOk()
            ->assertJsonPath('data', null);
    }

    public function test_put_then_get_roundtrips(): void
    {
        $this->actingAsUser();

        $this->putJson('/api/v1/account-states/gamification', ['data' => ['points' => 360, 'level' => 3]])
            ->assertOk();

        $this->getJson('/api/v1/account-states/gamification')
            ->assertOk()
            ->assertJsonPath('data.points', 360)
            ->assertJsonPath('data.level', 3);
    }

    public function test_upsert_overwrites_same_store(): void
    {
        $this->actingAsUser();
        $this->putJson('/api/v1/account-states/wishes', ['data' => [1, 2]]);
        $this->putJson('/api/v1/account-states/wishes', ['data' => [9]]);

        $this->getJson('/api/v1/account-states/wishes')->assertJsonPath('data', [9]);
    }

    public function test_scoped_per_user(): void
    {
        $this->actingAsUser();
        $this->putJson('/api/v1/account-states/saved', ['data' => ['mine']]);

        $this->actingAsUser(); // مستخدم آخر
        $this->getJson('/api/v1/account-states/saved')->assertJsonPath('data', null);
    }
}
