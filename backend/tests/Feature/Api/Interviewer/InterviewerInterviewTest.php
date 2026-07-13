<?php

namespace Tests\Feature\Api\Interviewer;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Modules\Interviewer\Entities\Booking;
use Modules\Interviewer\Entities\Interviewer;
use Modules\User\Entities\User;
use Tests\Support\Api\AssertsApiJson;
use Tests\TestCase;

class InterviewerInterviewTest extends TestCase
{
    use AssertsApiJson, RefreshDatabase;

    private function user(?string $email = null): User
    {
        return User::create([
            'name' => 'U',
            'email' => $email ?? 'iv'.uniqid().'@rec.test',
            'password' => 'secret123',
        ]);
    }

    public function test_interviewers_seeded_ordered_by_rating_desc(): void
    {
        Sanctum::actingAs($this->user());

        $this->getJson('/api/v1/interviewers')
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('data.0.rating', 4.9);
    }

    public function test_book_creates_pending_booking(): void
    {
        Sanctum::actingAs($this->user());
        $interviewer = Interviewer::create(['name' => 'X', 'specialty' => 'tech']);

        $this->postJson("/api/v1/interviewers/{$interviewer->id}/bookings", ['day' => 'Sun', 'slot' => '10:00', 'type' => 'tech'])
            ->assertStatus(201)
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.interviewerId', $interviewer->id);
    }

    public function test_book_missing_interviewer_returns_404(): void
    {
        Sanctum::actingAs($this->user());

        $this->postJson('/api/v1/interviewers/9999/bookings', ['day' => 'Sun', 'slot' => '10:00'])->assertStatus(404);
    }

    public function test_owner_can_complete_booking_with_report(): void
    {
        $owner = $this->user();
        Sanctum::actingAs($owner);
        $interviewer = Interviewer::create(['name' => 'X', 'specialty' => 'tech']);
        $booking = Booking::create(['user_id' => $owner->id, 'interviewer_id' => $interviewer->id, 'day' => 'Sun', 'slot' => '10:00']);

        $this->patchJson("/api/v1/bookings/{$booking->id}", ['status' => 'completed', 'report' => ['score' => 9]])
            ->assertOk()
            ->assertJsonPath('data.status', 'completed')
            ->assertJsonPath('data.report.score', 9);
    }

    public function test_other_user_cannot_update_booking(): void
    {
        $owner = $this->user();
        $interviewer = Interviewer::create(['name' => 'X', 'specialty' => 'tech']);
        $booking = Booking::create(['user_id' => $owner->id, 'interviewer_id' => $interviewer->id, 'day' => 'Sun', 'slot' => '10:00']);

        Sanctum::actingAs($this->user()); // مستخدم آخر
        $this->patchJson("/api/v1/bookings/{$booking->id}", ['status' => 'accepted'])->assertStatus(403);
    }

    public function test_create_and_list_interviews(): void
    {
        Sanctum::actingAs($this->user());

        $this->postJson('/api/v1/interviews', ['track' => 'tech'])
            ->assertStatus(201)
            ->assertJsonPath('data.track', 'tech')
            ->assertJsonPath('data.status', 'scheduled');

        $this->getJson('/api/v1/interviews')->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_create_interview_validates_track(): void
    {
        Sanctum::actingAs($this->user());

        $this->assertApiValidation($this->postJson('/api/v1/interviews', ['track' => 'invalid']), 'track');
    }

    public function test_interviewers_list_exposes_pagination_meta(): void
    {
        Sanctum::actingAs($this->user());

        $this->getJson('/api/v1/interviewers?perPage=2&page=1') // يبذر 3 معتمدين
            ->assertOk()
            ->assertJsonStructure(['data', 'meta' => ['current_page', 'last_page', 'itemPerPage', 'total']])
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.total', 3)
            ->assertJsonPath('meta.last_page', 2);
    }

    public function test_interviews_list_exposes_pagination_meta(): void
    {
        Sanctum::actingAs($this->user());
        $this->postJson('/api/v1/interviews', ['track' => 'tech']);
        $this->postJson('/api/v1/interviews', ['track' => 'management']);

        $this->getJson('/api/v1/interviews?perPage=1&page=1')
            ->assertOk()
            ->assertJsonStructure(['data', 'meta' => ['current_page', 'last_page', 'itemPerPage', 'total']])
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('meta.total', 2);
    }
}
