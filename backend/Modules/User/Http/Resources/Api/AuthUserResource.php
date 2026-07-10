<?php

namespace Modules\User\Http\Resources\Api;

use Illuminate\Http\Resources\Json\JsonResource;

class AuthUserResource extends JsonResource
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
            'phone' => $this->phone,
            // هويّة لوحة الأدمن: الواجهة تشتقّ منها دخول الكونسول والصلاحيّات الدقيقة
            'adminRoles' => $this->roles->where('guard_name', 'admin')->pluck('name')->values(),
            'permissions' => $this->getAllPermissions()->where('guard_name', 'admin')->pluck('name')->values(),
            'created_at' => optional($this->created_at)->toISOString(),
        ];
    }
}
