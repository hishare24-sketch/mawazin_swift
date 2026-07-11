<?php

namespace Modules\Ai\Entities;

use Illuminate\Database\Eloquent\Model;

class AssistantPreference extends Model
{
    protected $fillable = ['user_id', 'data_access', 'proactive'];

    protected $casts = [
        'data_access' => 'boolean',
        'proactive' => 'boolean',
    ];

    /** تفضيلات مستخدم — تُنشأ بالافتراضيّات عند أوّل وصول. */
    public static function forUser(int $userId): self
    {
        $p = static::query()->where('user_id', $userId)->first();
        if ($p === null) {
            $p = static::create(['user_id' => $userId]);
            $p->refresh();
        }

        return $p;
    }
}
