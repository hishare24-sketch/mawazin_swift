<?php

namespace Modules\Compliance\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Modules\Audit\Entities\AuditLog;
use Modules\Compliance\Services\ComplianceService;
use Modules\Marketplace\Entities\MatchSetting;
use Modules\Marketplace\Services\MatchService;

/**
 * كونسول العدالة والامتثال (B4) — الأثر التمييزيّ + التمثيل + الإشراف على قرارات الذكاء + أثر التدقيق.
 */
class AdminComplianceController extends Controller
{
    /** موارد التدقيق المؤثّرة في القرارات (لأثر العدالة). */
    private const DECISION_RESOURCES = ['matching', 'interview-quality', 'moderation', 'governance', 'pipeline', 'applications', 'ai'];

    public function __construct(private readonly ComplianceService $service) {}

    /** نظرة عامّة — KPIs + خيارات الأبعاد + حالة الإشراف على الذكاء + أعلام الأثر (بعد افتراضيّ). */
    public function overview()
    {
        $this->authorize('view_compliance');

        $totals = $this->service->totals();
        $impact = $this->service->adverseImpact('category');

        return $this->dataResponse([
            'totals' => $totals,
            'dimensions' => ComplianceService::DIMENSIONS,
            'adverseFlags' => $impact['adverseFlags'],
            'compliant' => $impact['compliant'],
            'aiOversight' => $this->aiOversightPayload(),
        ]);
    }

    /** الأثر التمييزيّ لبُعد محدّد (قاعدة الأربعة أخماس). */
    public function adverseImpact(Request $request)
    {
        $this->authorize('view_compliance');

        return $this->dataResponse($this->service->adverseImpact($this->dim($request)));
    }

    /** القمع لكلّ مجموعة + التمثيل (دائريّ). */
    public function funnel(Request $request)
    {
        $this->authorize('view_compliance');

        $dim = $this->dim($request);

        return $this->dataResponse([
            ...$this->service->funnel($dim),
            'representation' => $this->service->representation($dim),
        ]);
    }

    /** الإشراف على قرارات الذكاء — أوزان المطابقة + التعزيز + الحوكمة. */
    public function aiOversight()
    {
        $this->authorize('view_compliance');

        return $this->dataResponse($this->aiOversightPayload());
    }

    /** أثر تدقيق القرارات — أحدث أفعال الأدمن المؤثّرة في العدالة. */
    public function auditTrail()
    {
        $this->authorize('view_compliance');

        $logs = AuditLog::query()
            ->whereIn('resource', self::DECISION_RESOURCES)
            ->orderByDesc('id')->limit(25)->get()
            ->map(fn ($l) => [
                'id' => $l->id,
                'actor' => $l->actor_name,
                'action' => $l->action,
                'resource' => $l->getAttribute('resource'),
                'targetId' => $l->target_id,
                'status' => $l->status,
                'at' => optional($l->created_at)->toISOString(),
            ]);

        return $this->dataResponse($logs);
    }

    // ═══ مساعدات ═══

    private function dim(Request $request): string
    {
        $dim = (string) $request->query('dimension', 'category');

        return in_array($dim, ComplianceService::DIMENSIONS, true) ? $dim : 'category';
    }

    private function aiOversightPayload(): array
    {
        $match = app(MatchService::class);
        $settings = MatchSetting::current();
        $aiActive = $match->aiActive();

        return [
            'weights' => [
                'skills' => (int) $settings->skills_weight,
                'experience' => (int) $settings->experience_weight,
                'category' => (int) $settings->category_weight,
            ],
            'threshold' => (int) $settings->threshold,
            'aiBoost' => (bool) $settings->ai_boost,
            'aiActive' => $aiActive,
            // الحوكمة: التعزيز يؤثّر فعليًّا فقط حين قدرة الذكاء مفعّلة + مفتاح التعزيز.
            'boostEffective' => $aiActive && (bool) $settings->ai_boost,
            'governed' => $aiActive, // موصول بحوكمة الذكاء (candidate_matching)
        ];
    }
}
