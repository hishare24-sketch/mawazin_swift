<?php

namespace Modules\Audit\Http\Resources\Admin;

use Illuminate\Http\Resources\Json\JsonResource;

class AuditLogResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'actor' => $this->actor_name ?? '—',
            'actorId' => $this->actor_id,
            'method' => $this->method,
            // ملاحظة: $this->resource على JsonResource هو الموديل الملفوف — نصل العمود صراحةً
            'resource' => $this->getAttribute('resource'),
            'action' => $this->action,
            'path' => $this->path,
            'targetId' => $this->target_id,
            'status' => (int) $this->status,
            'meta' => $this->meta, // فرق قبل/بعد (added/removed/from/to) إن وُجد
            'ip' => $this->ip,
            'at' => optional($this->created_at)->toISOString(),
        ];
    }
}
