<?php

namespace Tests\Feature\Api\Chat;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Laravel\Sanctum\Sanctum;
use Modules\Chat\Entities\DirectMessage;
use Modules\Chat\Events\MessageSent;
use Modules\User\Entities\User;
use Tests\Support\Api\AssertsApiJson;
use Tests\TestCase;

class ChatTest extends TestCase
{
    use AssertsApiJson, RefreshDatabase;

    private function user(string $name = 'U'): User
    {
        return User::create([
            'name' => $name,
            'email' => 'ch'.uniqid().'@rec.test',
            'password' => 'secret123',
        ]);
    }

    public function test_send_creates_message_and_returns_201(): void
    {
        $sender = $this->user('Sender');
        $recipient = $this->user('Recipient');
        Sanctum::actingAs($sender);

        $this->postJson('/api/v1/direct-messages', [
            'recipientId' => $recipient->uuid,
            'recipientName' => $recipient->name,
            'body' => 'Hello',
        ])
            ->assertStatus(201)
            ->assertJsonPath('data.senderId', $sender->uuid)
            ->assertJsonPath('data.recipientId', $recipient->uuid)
            ->assertJsonPath('data.body', 'Hello')
            ->assertJsonPath('data.read_at', null);
    }

    public function test_send_broadcasts_message_sent_event(): void
    {
        Event::fake([MessageSent::class]);
        $sender = $this->user('Sender');
        $recipient = $this->user('Recipient');
        Sanctum::actingAs($sender);

        $this->postJson('/api/v1/direct-messages', [
            'recipientId' => $recipient->uuid,
            'recipientName' => $recipient->name,
            'body' => 'Ping',
        ])->assertStatus(201);

        Event::assertDispatched(MessageSent::class, function (MessageSent $event) use ($recipient) {
            return $event->message['recipientId'] === $recipient->uuid
                && $event->broadcastOn()->name === 'private-user.'.$recipient->uuid;
        });
    }

    public function test_list_mine_returns_sent_and_received_sorted(): void
    {
        $a = $this->user('A');
        $b = $this->user('B');
        DirectMessage::create(['sender_id' => $a->uuid, 'recipient_id' => $b->uuid, 'sender_name' => 'A', 'recipient_name' => 'B', 'body' => 'first']);
        DirectMessage::create(['sender_id' => $b->uuid, 'recipient_id' => $a->uuid, 'sender_name' => 'B', 'recipient_name' => 'A', 'body' => 'second']);

        Sanctum::actingAs($a);
        $this->getJson('/api/v1/direct-messages')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.body', 'first');
    }

    public function test_mark_thread_read_marks_incoming_from_peer(): void
    {
        $me = $this->user('Me');
        $peer = $this->user('Peer');
        $msg = DirectMessage::create(['sender_id' => $peer->uuid, 'recipient_id' => $me->uuid, 'sender_name' => 'Peer', 'recipient_name' => 'Me', 'body' => 'hi']);

        Sanctum::actingAs($me);
        $this->postJson('/api/v1/direct-messages/read', ['peerId' => $peer->uuid])->assertStatus(204);

        $this->assertNotNull($msg->fresh()->read_at);
    }

    public function test_resolve_owner_from_slug(): void
    {
        $owner = $this->user('Nora');
        Sanctum::actingAs($owner);
        $slug = $this->getJson('/api/v1/public-profiles/me')->json('data.slug');

        $this->getJson("/api/v1/direct-messages/resolve/{$slug}")
            ->assertOk()
            ->assertJsonPath('data.ownerId', $owner->uuid)
            ->assertJsonPath('data.name', 'Nora');
    }
}
