<?php

namespace Modules\Account\Entities;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlatformTransaction extends Model
{
    protected $fillable = ['platform_account_id', 'amount', 'type', 'reference', 'note'];

    protected $casts = [
        'amount' => 'float',
    ];

    public function account(): BelongsTo
    {
        return $this->belongsTo(PlatformAccount::class, 'platform_account_id');
    }
}
