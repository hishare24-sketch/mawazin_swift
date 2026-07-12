<?php

namespace Modules\Governance\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Modules\Governance\Entities\ModerationItem;

/**
 * بلاغ/عنصر إشراف جديد لحظيّ عبر Reverb — يُبثّ لقناة الأدمن `admin.governance`
 * (تخويل بصلاحية view_governance) كي يظهر في كنسول الإشراف فور وروده. الحدث `moderation.created`.
 */
class ModerationItemCreated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public array $payload) {}

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel('admin.governance');
    }

    public function broadcastAs(): string
    {
        return 'moderation.created';
    }

    public function broadcastWith(): array
    {
        return $this->payload;
    }

    /** حمولة موحّدة مسطّحة (camelCase) من عنصر الإشراف. */
    public static function payloadFor(ModerationItem $item): array
    {
        return [
            'id' => $item->id,
            'type' => $item->type,
            'subject' => $item->subject,
            'submitter' => $item->submitter_name,
            'targetRef' => $item->target_ref,
            'reason' => $item->reason,
            'status' => $item->status,
            'at' => optional($item->created_at)->toISOString(),
        ];
    }
}
