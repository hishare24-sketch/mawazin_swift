<?php

namespace Modules\Governance\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class CreateReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // محميّ بـ auth:sanctum على المسار
    }

    public function rules(): array
    {
        return [
            'targetRef' => ['required', 'string', 'max:120', 'regex:/^[a-z_]+:\d+$/'],
            'subject' => ['required', 'string', 'max:180'],
            'reason' => ['nullable', 'string', 'max:500'],
            'type' => ['sometimes', 'in:content_report'],
        ];
    }
}
