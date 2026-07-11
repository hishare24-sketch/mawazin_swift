<?php

namespace Modules\Ai\Entities;

use Illuminate\Database\Eloquent\Model;

/**
 * صفّ استهلاك توكن واحد لكلّ تبادل مساعد — أساس إنفاذ حصص الباقات (يوميّ/أسبوعيّ/شهريّ).
 */
class AiUsage extends Model
{
    protected $table = 'ai_usage';

    protected $fillable = [
        'user_id', 'tokens', 'request_tokens', 'response_tokens', 'provider', 'model',
    ];

    protected $casts = [
        'tokens' => 'integer',
        'request_tokens' => 'integer',
        'response_tokens' => 'integer',
    ];
}
