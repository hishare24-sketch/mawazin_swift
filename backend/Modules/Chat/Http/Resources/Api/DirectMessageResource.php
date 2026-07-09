<?php

namespace Modules\Chat\Http\Resources\Api;

use Illuminate\Http\Resources\Json\JsonResource;

class DirectMessageResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'senderId' => $this->sender_id,
            'recipientId' => $this->recipient_id,
            'senderName' => $this->sender_name,
            'recipientName' => $this->recipient_name,
            'body' => $this->body,
            'created_at' => optional($this->created_at)->toISOString(),
            'read_at' => optional($this->read_at)->toISOString(),
        ];
    }
}
