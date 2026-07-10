<?php

namespace Modules\Account\Http\Resources\Admin;

use Illuminate\Http\Resources\Json\JsonResource;

class AdminPlatformTransactionResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'amount' => (float) $this->amount,
            'type' => $this->type,
            'reference' => $this->reference,
            'note' => $this->note,
            'at' => optional($this->created_at)->toISOString(),
        ];
    }
}
