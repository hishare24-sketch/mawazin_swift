<?php

namespace Modules\Chat\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class ReadThreadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'peerId' => 'required|string',
        ];
    }
}
