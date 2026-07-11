<?php

namespace Modules\Interview\Services;

use Illuminate\Support\Collection;
use Modules\Interview\Entities\Interview;

/**
 * جودة المقابلات — تحليل النزاهة (من integrity json) + التقييم الموزون + المعايرة.
 */
class InterviewQualityService
{
    /** إشارات النزاهة المعروفة وأوزانها في درجة الخطر (0..100). */
    private const SIGNALS = [
        'tabSwitches' => ['weight' => 8, 'label' => 'تبديل التبويبات'],
        'pasteEvents' => ['weight' => 10, 'label' => 'لصق'],
        'copyEvents' => ['weight' => 4, 'label' => 'نسخ'],
        'windowBlurs' => ['weight' => 5, 'label' => 'مغادرة النافذة'],
        'fullscreenExits' => ['weight' => 6, 'label' => 'خروج من ملء الشاشة'],
    ];

    /** يحلّل حمولة النزاهة إلى درجة/مستوى/إشارات مفصّلة (دفاعيّ ضدّ الشكل الحرّ). */
    public function integrity(?array $integrity): array
    {
        $integrity ??= [];
        $signals = [];
        $score = 0;

        foreach (self::SIGNALS as $key => $meta) {
            $count = (int) ($integrity[$key] ?? 0);
            if ($count > 0) {
                $contribution = min(40, $count * $meta['weight']);
                $score += $contribution;
                $signals[] = ['key' => $key, 'label' => $meta['label'], 'count' => $count];
            }
        }

        // ثوانٍ غياب الوجه — عتبة 30ث.
        $faceMissing = (int) ($integrity['faceMissingSecs'] ?? 0);
        if ($faceMissing > 30) {
            $score += min(30, (int) floor($faceMissing / 30) * 15);
            $signals[] = ['key' => 'faceMissingSecs', 'label' => 'غياب الوجه (ثوانٍ)', 'count' => $faceMissing];
        }

        // تعدّد الوجوه — إشارة قويّة.
        if (! empty($integrity['multipleFaces'])) {
            $score += 25;
            $signals[] = ['key' => 'multipleFaces', 'label' => 'أكثر من وجه', 'count' => 1];
        }

        $score = min(100, $score);

        return [
            'score' => $score,
            'level' => $score >= 60 ? 'high' : ($score >= 25 ? 'medium' : 'low'),
            'signals' => $signals,
        ];
    }

    /** النتيجة الموزونة من معايير المعيار + درجات المعايير (0..100). */
    public function weightedScore(?array $criteria, ?array $scores): ?float
    {
        if (empty($criteria) || empty($scores)) {
            return null;
        }
        $total = max(0.0001, collect($criteria)->sum(fn ($c) => (float) ($c['weight'] ?? 0)));
        $sum = collect($criteria)->sum(function ($c) use ($scores): float {
            $key = $c['key'] ?? '';

            return (float) ($scores[$key] ?? 0) * (float) ($c['weight'] ?? 0);
        });

        return round($sum / $total, 2);
    }

    /**
     * المعايرة — لكلّ مسار: عدد/متوسّط/أدنى/أعلى + نسبة إشارات النزاهة، وانحراف المتوسّط عن العامّ
     * لرصد التساهل (bias موجب) أو التشدّد (bias سالب).
     */
    public function calibration(Collection $interviews): array
    {
        $overallAvg = round((float) $interviews->avg('score'), 2);

        $rows = $interviews->groupBy('track')->map(function (Collection $group, string $track) use ($overallAvg): array {
            $avg = round((float) $group->avg('score'), 2);
            $flagged = $group->filter(fn (Interview $i) => $this->integrity($i->integrity)['level'] === 'high')->count();

            return [
                'track' => $track,
                'count' => $group->count(),
                'avgScore' => $avg,
                'minScore' => round((float) $group->min('score'), 2),
                'maxScore' => round((float) $group->max('score'), 2),
                'highRiskRate' => $group->count() ? round($flagged / $group->count() * 100, 1) : 0.0,
                'bias' => round($avg - $overallAvg, 2), // موجب=تساهل، سالب=تشدّد
            ];
        })->values()->all();

        return ['overallAvg' => $overallAvg, 'tracks' => $rows];
    }
}
