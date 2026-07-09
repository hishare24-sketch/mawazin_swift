<?php

namespace Modules\Chat\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageSent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /** @param array<string,mixed> $message حمولة DirectMessageResource المُسطّحة */
    public function __construct(public array $message) {}

    public function broadcastOn(): PrivateChannel
    {
        // يصل المستقبِل لحظيًّا على قناته الخاصّة
        return new PrivateChannel('user.'.$this->message['recipientId']);
    }

    public function broadcastAs(): string
    {
        return 'message.sent';
    }

    public function broadcastWith(): array
    {
        return ['message' => $this->message];
    }
}
