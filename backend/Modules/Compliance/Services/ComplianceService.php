<?php

namespace Modules\Compliance\Services;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * محرّك العدالة والامتثال — يحسب الأثر التمييزيّ (قاعدة الأربعة أخماس)، القمع لكلّ مجموعة،
 * والتمثيل — عبر أبعاد متاحة (قطاع الفرصة/باقة المرشّح/نوعه). قراءة فقط (تجميع دفاعيّ).
 */
class ComplianceService
{
    public const DIMENSIONS = ['category', 'tier', 'kind'];

    private const STAGES = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'];

    private const MIN_SAMPLE = 5; // عيّنة أدنى لاعتماد النسبة (وإلّا تُعلَّم كصغيرة)

    /** صفوف التقديمات مُثراة بقيمة كلّ بُعد + المرحلة (استعلام واحد دفاعيّ). */
    private function rows(): Collection
    {
        return DB::table('applications')
            ->join('opportunities', 'applications.opportunity_id', '=', 'opportunities.id')
            ->join('users', 'applications.user_id', '=', 'users.id')
            ->selectRaw("applications.stage as stage,
                CASE WHEN opportunities.category IS NULL OR opportunities.category = '' THEN 'غير مصنّف' ELSE opportunities.category END as g_category,
                COALESCE(users.tier, 'free') as g_tier,
                COALESCE(users.kind, 'individual') as g_kind")
            ->get();
    }

    private function keyFor(string $dim): string
    {
        return 'g_'.(in_array($dim, self::DIMENSIONS, true) ? $dim : 'category');
    }

    /**
     * الأثر التمييزيّ (قاعدة الأربعة أخماس): لكلّ مجموعة نسبة الاختيار = المُوظَّفون/المتقدّمون،
     * والنسبة النسبيّة = نسبة المجموعة/أعلى نسبة؛ يُعلَّم ما دون 0.8.
     */
    public function adverseImpact(string $dim): array
    {
        $key = $this->keyFor($dim);
        $grouped = $this->rows()->groupBy($key);

        $groups = $grouped->map(function (Collection $g, $label) {
            $applicants = $g->count();
            $hired = $g->where('stage', 'hired')->count();

            return [
                'group' => (string) $label,
                'applicants' => $applicants,
                'hired' => $hired,
                'selectionRate' => $applicants ? round($hired / $applicants * 100, 1) : 0.0,
                'smallSample' => $applicants < self::MIN_SAMPLE,
            ];
        })->values();

        // الأساس المرجعيّ من المجموعات ذات العيّنة الكافية فقط (وإلّا مجموعة صغيرة 100% تشوّه المقياس).
        $eligible = $groups->where('smallSample', false);
        $maxRate = (float) ($eligible->isNotEmpty() ? $eligible->max('selectionRate') : $groups->max('selectionRate'));

        $groups = $groups->map(function (array $row) use ($maxRate) {
            $ratio = $maxRate > 0 ? round($row['selectionRate'] / $maxRate, 2) : null;
            $row['impactRatio'] = $ratio;
            $row['adverse'] = $ratio !== null && $ratio < 0.8 && ! $row['smallSample'];

            return $row;
        })->sortByDesc('selectionRate')->values();

        $flags = $groups->where('adverse', true)->count();

        return [
            'dimension' => in_array($dim, self::DIMENSIONS, true) ? $dim : 'category',
            'groups' => $groups->all(),
            'maxSelectionRate' => $maxRate,
            'adverseFlags' => $flags,
            'compliant' => $flags === 0,
            'minSample' => self::MIN_SAMPLE,
        ];
    }

    /** القمع لكلّ مجموعة — عدد بكلّ مرحلة (تمثيل عبر خطّ الأنابيب). */
    public function funnel(string $dim): array
    {
        $key = $this->keyFor($dim);

        $groups = $this->rows()->groupBy($key)->map(function (Collection $g, $label) {
            $byStage = [];
            foreach (self::STAGES as $stage) {
                $byStage[$stage] = $g->where('stage', $stage)->count();
            }

            return ['group' => (string) $label, 'total' => $g->count(), 'stages' => $byStage];
        })->sortByDesc('total')->values()->all();

        return ['dimension' => in_array($dim, self::DIMENSIONS, true) ? $dim : 'category', 'stages' => self::STAGES, 'groups' => $groups];
    }

    /** تمثيل المُوظَّفين عبر المجموعات (لرسم دائريّ). */
    public function representation(string $dim): Collection
    {
        $key = $this->keyFor($dim);

        return $this->rows()->where('stage', 'hired')->groupBy($key)
            ->map(fn (Collection $g, $label) => ['label' => (string) $label, 'value' => $g->count()])
            ->values();
    }

    /** إجماليّات عامّة. */
    public function totals(): array
    {
        $rows = $this->rows();
        $applicants = $rows->count();
        $hired = $rows->where('stage', 'hired')->count();

        return [
            'applicants' => $applicants,
            'hired' => $hired,
            'hireRate' => $applicants ? round($hired / $applicants * 100, 1) : 0.0,
        ];
    }
}
