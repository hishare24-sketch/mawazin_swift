<?php

namespace Modules\Billing\Entities;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\User\Entities\User;

class Invoice extends Model
{
    protected $fillable = ['user_id', 'user_name', 'plan_key', 'plan_name', 'amount', 'status', 'reference', 'refunded_at'];

    protected $casts = [
        'amount' => 'float',
        'refunded_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
