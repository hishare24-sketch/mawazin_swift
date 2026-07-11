<?php

namespace Modules\Notification\Http\Resources\Api;

use Illuminate\Http\Resources\Json\JsonResource;

class NotificationResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'icon' => $this->icon,
            'title' => $this->title,
            'body' => $this->body ?? '',
            'category' => $this->category,
            'read' => (bool) $this->read,
            'actionTo' => $this->action_to,
            'at' => optional($this->created_at)->toISOString(),
        ];
    }
}
