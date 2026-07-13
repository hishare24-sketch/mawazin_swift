<?php

namespace Tests\Feature\Api\Interview;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Modules\Interview\Entities\Interview;
use Modules\User\Entities\User;
use Tests\Support\Api\AssertsApiJson;
use Tests\TestCase;

/**
 * حالات INTVQ (عميل المقابلات): index/store/track 422/401 — كان الملفّ مفقودًا كليًّا.
 */
class InterviewTest extends TestCase
{
    use AssertsApiJson, RefreshDatabase;

    private function user(): User
    {
        return User::create(['name' => 'I', 'email' => 'iv'.uniqid().'@rec.test', 'password' => 'secret123']);
    }

    public function test_store_creates_interview_with_defaults(): void
    {
        Sanctum::actingAs($this->user());

        $this->postJson('/api/v1/interviews', ['track' => 'tech'])
            ->assertStatus(201)
            ->assertJsonPath('data.track', 'tech');

        $iv = Interview::first();
        $this->assertSame('scheduled', $iv->status); // الافتراضيّ
        $this->assertEquals(0, $iv->score);
    }

    public function test_index_lists_only_own_interviews_paginated(): void
    {
        $me = $this->user();
        $other = $this->user();
        Interview::create(['user_id' => $me->id, 'track' => 'tech', 'status' => 'done', 'score' => 80, 'integrity' => []]);
        Interview::create(['user_id' => $other->id, 'track' => 'design', 'status' => 'done', 'score' => 60, 'integrity' => []]);

        Sanctum::actingAs($me);
        $res = $this->getJson('/api/v1/interviews')
            ->assertOk()
            ->assertJsonStructure(['data', 'meta' => ['current_page', 'total']]);

        $this->assertSame(1, $res->json('meta.total')); // عزل: مقابلاتي فقط
        $this->assertSame('tech', $res->json('data.0.track'));
    }

    public function test_store_rejects_invalid_track(): void
    {
        Sanctum::actingAs($this->user());

        $this->postJson('/api/v1/interviews', ['track' => 'astrology'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['track']);

        $this->postJson('/api/v1/interviews', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['track']);
    }

    public function test_endpoints_require_authentication(): void
    {
        $this->getJson('/api/v1/interviews')->assertStatus(401);
        $this->postJson('/api/v1/interviews', ['track' => 'tech'])->assertStatus(401);
    }
}
