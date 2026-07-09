<?php

namespace Modules\Admin\Http\Resources\Admin;

use Illuminate\Http\Resources\Json\JsonResource;

class AdminUserResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role,
            'tier' => $this->tier,
            'createdAt' => optional($this->created_at)->toISOString(),
        ];
    }
}
