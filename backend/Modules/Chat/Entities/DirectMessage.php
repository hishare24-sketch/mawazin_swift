<?php

namespace Modules\Chat\Entities;

use Illuminate\Database\Eloquent\Model;

class DirectMessage extends Model
{
    protected $fillable = [
        'sender_id', 'recipient_id', 'sender_name', 'recipient_name', 'body', 'read_at',
    ];

    protected $casts = [
        'read_at' => 'datetime',
    ];
}
