<?php

namespace Modules\Governance\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class BulkResolveRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // الصلاحيّة تُفرض عبر authorize() في الكنترولر (guard admin)
    }

    public function rules(): array
    {
        return [
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer'],
            'decision' => ['required', 'in:approved,rejected,resolved'],
        ];
    }
}
