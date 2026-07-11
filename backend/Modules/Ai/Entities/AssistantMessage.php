<?php

namespace Modules\Ai\Entities;

use Illuminate\Database\Eloquent\Model;

class AssistantMessage extends Model
{
    protected $fillable = ['conversation_id', 'role', 'body', 'meta'];

    protected $casts = [
        'meta' => 'array',
    ];
}
