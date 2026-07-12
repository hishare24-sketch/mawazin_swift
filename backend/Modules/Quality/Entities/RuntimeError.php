<?php

namespace Modules\Quality\Entities;

use Illuminate\Database\Eloquent\Model;

/**
 * إشارة خطأ وقت-تشغيل مجمّعة بالبصمة — دورة حياة new→ongoing→resolved→regressed.
 */
class RuntimeError extends Model
{
    protected $table = 'runtime_errors';

    protected $fillable = [
        'fingerprint', 'type', 'message', 'layer', 'scope', 'route',
        'severity', 'status', 'count', 'first_seen_at', 'last_seen_at', 'meta',
    ];

    protected $casts = [
        'meta' => 'array',
        'count' => 'integer',
        'first_seen_at' => 'datetime',
        'last_seen_at' => 'datetime',
    ];

    /** الحالات الحيّة (غير المحلولة). */
    public function scopeOpen($query)
    {
        return $query->whereIn('status', ['new', 'ongoing', 'regressed']);
    }
}
