<?php

namespace Modules\Interview\Entities;

use Illuminate\Database\Eloquent\Model;

/**
 * معيار تقييم مقابلة — مجموعة معايير موزونة لمسار محدّد.
 */
class InterviewRubric extends Model
{
    protected $fillable = ['key', 'name', 'track', 'criteria', 'active', 'is_system', 'sort'];

    protected $casts = [
        'criteria' => 'array',
        'active' => 'boolean',
        'is_system' => 'boolean',
        'sort' => 'integer',
    ];

    /** مجموع الأوزان (لتطبيع النتيجة الموزونة). */
    public function totalWeight(): float
    {
        return max(0.0001, collect($this->criteria ?? [])->sum(fn ($c) => (float) ($c['weight'] ?? 0)));
    }
}
