<?php

namespace Modules\Marketplace\Http\Resources\Admin;

use Illuminate\Http\Resources\Json\JsonResource;

class AdminMarketRequestResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'title' => $this->title,
            'org' => $this->org,
            'state' => $this->state,
            'compensation' => $this->compensation,
            'remote' => (bool) $this->remote,
            'createdAt' => optional($this->created_at)->toISOString(),
        ];
    }
}
