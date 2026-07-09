<?php

namespace Modules\Chat\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class SendMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'recipientId' => 'required|string',
            'recipientName' => 'required|string|max:255',
            'body' => 'required|string|max:5000',
        ];
    }
}
