<?php

namespace Modules\Notification\Entities;

use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    protected $fillable = ['user_id', 'icon', 'title', 'body', 'category', 'read', 'action_to'];

    protected $casts = ['read' => 'boolean'];
}
