<?php

namespace Modules\Billing\Http\Resources\Admin;

use Illuminate\Http\Resources\Json\JsonResource;

class AdminInvoiceResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'user' => $this->user_name ?? optional($this->user)->name ?? '—',
            'userId' => $this->user_id,
            'plan_key' => $this->plan_key,
            'plan_name' => $this->plan_name,
            'amount' => (float) $this->amount,
            'status' => $this->status,
            'reference' => $this->reference,
            'refundedAt' => optional($this->refunded_at)->toISOString(),
            'createdAt' => optional($this->created_at)->toISOString(),
        ];
    }
}
