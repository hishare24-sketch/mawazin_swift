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
            'kind' => $this->kind,
            'tier' => $this->tier,
            'status' => $this->status ?? 'active',
            // أدوار لوحة الأدمن المُسندة (guard=admin): super_admin/admin/governance
            'adminRoles' => $this->roles
                ->where('guard_name', 'admin')
                ->pluck('name')
                ->values(),
            'createdAt' => optional($this->created_at)->toISOString(),
        ];
    }
}
