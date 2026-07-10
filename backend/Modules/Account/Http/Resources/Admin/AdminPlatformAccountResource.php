<?php

namespace Modules\Account\Http\Resources\Admin;

use Illuminate\Http\Resources\Json\JsonResource;

class AdminPlatformAccountResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'type' => $this->type,
            'bank_name' => $this->bank_name,
            'account_no_masked' => $this->account_no_masked,
            'currency' => $this->currency,
            'balance' => (float) $this->balance,
            'is_default' => (bool) $this->is_default,
            'active' => (bool) $this->active,
            'notes' => $this->notes,
            'transactions' => $this->transactions_count ?? $this->transactions()->count(),
            'updatedAt' => optional($this->updated_at)->toISOString(),
        ];
    }
}
