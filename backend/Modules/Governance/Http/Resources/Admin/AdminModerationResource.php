<?php

namespace Modules\Governance\Http\Resources\Admin;

use Illuminate\Http\Resources\Json\JsonResource;

class AdminModerationResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'subject' => $this->subject,
            'submitter' => $this->submitter_name ?? '—',
            'targetRef' => $this->target_ref,
            'reason' => $this->reason,
            'status' => $this->status,
            'resolver' => $this->resolver_name,
            'removed' => (bool) data_get($this->meta, 'takedown.removed', false),
            'resolvedAt' => optional($this->resolved_at)->toISOString(),
            'createdAt' => optional($this->created_at)->toISOString(),
        ];
    }
}
