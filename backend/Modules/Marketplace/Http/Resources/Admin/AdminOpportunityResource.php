<?php

namespace Modules\Marketplace\Http\Resources\Admin;

use Illuminate\Http\Resources\Json\JsonResource;

class AdminOpportunityResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'company' => $this->company,
            'location' => $this->location,
            'salary' => $this->salary,
            'category' => $this->category,
            'skills' => $this->skills ?? [],
            'createdAt' => optional($this->created_at)->toISOString(),
        ];
    }
}
