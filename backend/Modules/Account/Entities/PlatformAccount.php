<?php

namespace Modules\Account\Entities;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PlatformAccount extends Model
{
    protected $fillable = ['name', 'type', 'bank_name', 'account_no_masked', 'currency', 'balance', 'is_default', 'active', 'notes'];

    protected $casts = [
        'balance' => 'float',
        'is_default' => 'boolean',
        'active' => 'boolean',
    ];

    public function transactions(): HasMany
    {
        return $this->hasMany(PlatformTransaction::class);
    }

    /** حساب استقبال الإيرادات الافتراضيّ (أو أوّل حساب مفعّل). */
    public static function default(): ?self
    {
        return static::where('is_default', true)->first() ?? static::where('active', true)->first();
    }

    /** يسجّل حركة على الحساب ويحدّث الرصيد ذرّيًّا. */
    public function post(float $amount, string $type, ?string $note = null, ?string $reference = null): PlatformTransaction
    {
        $txn = $this->transactions()->create([
            'amount' => $amount,
            'type' => $type,
            'note' => $note,
            'reference' => $reference,
        ]);
        $this->increment('balance', $amount);

        return $txn;
    }
}
