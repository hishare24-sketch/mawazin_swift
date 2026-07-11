<?php

namespace Modules\Notification\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * إشعار لحظيّ عبر Reverb — يصل صاحبه على قناته الخاصّة `user.{uuid}`، الحدث `notification.new`.
 */
class NotificationSent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /** @param array<string,mixed> $notification حمولة الإشعار المسطّحة */
    public function __construct(public array $notification, public string $uuid) {}

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel('user.'.$this->uuid);
    }

    public function broadcastAs(): string
    {
        return 'notification.new';
    }

    public function broadcastWith(): array
    {
        return ['notification' => $this->notification];
    }
}
