<?php

namespace Modules\Reports\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * مركز الرؤى والتقارير — يجمع بيانات كل المديولات في قمع توظيف ومؤشّرات عابرة
 * وتقارير مجاليّة قابلة للتصدير. لا جداول جديدة؛ تجميع دفاعيّ (أيّ مصدر غائب = 0).
 */
class AdminReportController extends Controller
{
    /** لقطة تنفيذيّة عابرة: قمع التوظيف + معدّلات التحويل + مؤشّرات + سلاسل. */
    public function overview()
    {
        $this->authorize('view_reports');

        $opportunities = $this->safe(fn () => \Modules\Marketplace\Entities\Opportunity::count());
        $applications = $this->safe(fn () => \Modules\Marketplace\Entities\Application::count());
        $interviews = $this->safe(fn () => \Modules\Interview\Entities\Interview::count());
        $completed = $this->safe(fn () => \Modules\Interview\Entities\Interview::where('status', 'completed')->count());

        $funnel = [
            ['stage' => 'opportunities', 'value' => $opportunities],
            ['stage' => 'applications', 'value' => $applications],
            ['stage' => 'interviews', 'value' => $interviews],
            ['stage' => 'completed', 'value' => $completed],
        ];
        $conversion = [
            'applicationsPerOpportunity' => round($applications / max(1, $opportunities), 2),
            'interviewRate' => round($interviews / max(1, $applications) * 100, 1),
            'completionRate' => round($completed / max(1, $interviews) * 100, 1),
        ];

        $kpis = [
            'users' => $this->safe(fn () => \Modules\User\Entities\User::count()),
            'newUsers30d' => $this->safe(fn () => \Modules\User\Entities\User::where('created_at', '>=', Carbon::now()->subDays(30))->count()),
            'opportunities' => $opportunities,
            'applications' => $applications,
            'interviews' => $interviews,
            'avgInterviewScore' => $this->safe(fn () => round((float) \Modules\Interview\Entities\Interview::avg('score'), 1)),
            'revenue' => $this->safe(fn () => round((float) \Modules\Billing\Entities\Invoice::where('status', 'paid')->sum('amount'), 2)),
            'surveys' => $this->safe(fn () => \Modules\Survey\Entities\Survey::count()),
            'assistantMessages' => $this->safe(fn () => \Modules\Ai\Entities\AssistantMessage::count()),
            'openTickets' => $this->safe(fn () => \Modules\Support\Entities\Ticket::whereIn('status', ['open', 'pending'])->count()),
            'resolvedTickets' => $this->safe(fn () => \Modules\Support\Entities\Ticket::whereIn('status', ['resolved', 'closed'])->count()),
            'approvedInterviewers' => $this->safe(fn () => \Modules\Interviewer\Entities\Interviewer::where('status', 'approved')->count()),
            'pendingGovernance' => $this->safe(fn () => \Modules\Governance\Entities\ModerationItem::where('status', 'pending')->count()),
        ];

        return $this->dataResponse([
            'funnel' => $funnel,
            'conversion' => $conversion,
            'kpis' => $kpis,
            'growthSeries' => $this->dailySeries(\Modules\User\Entities\User::class, Carbon::now()->subDays(29), Carbon::now()),
            'revenueSeries' => $this->dailySeries(\Modules\Billing\Entities\Invoice::class, Carbon::now()->subDays(29), Carbon::now(), 'amount', ['status' => 'paid']),
        ]);
    }

    /** تقرير مجاليّ بنطاق زمنيّ — يعيد ملخّصًا + سلسلة + توزيعًا + جدولًا للتصدير. */
    public function report(Request $request)
    {
        $this->authorize('view_reports');

        $data = $request->validate([
            'domain' => ['required', 'in:growth,finance,funnel,engagement,quality'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        $to = isset($data['to']) ? Carbon::parse($data['to'])->endOfDay() : Carbon::now();
        $from = isset($data['from']) ? Carbon::parse($data['from'])->startOfDay() : (clone $to)->subDays(29)->startOfDay();

        return $this->dataResponse(match ($data['domain']) {
            'growth' => $this->growthReport($from, $to),
            'finance' => $this->financeReport($from, $to),
            'engagement' => $this->engagementReport($from, $to),
            'quality' => $this->qualityReport($from, $to),
            default => $this->funnelReport($from, $to),
        });
    }

    // ═══ تقارير المجالات ═══

    private function growthReport(Carbon $from, Carbon $to): array
    {
        $series = $this->dailySeries(\Modules\User\Entities\User::class, $from, $to);
        $byRole = $this->safeCollect(fn () => \Modules\User\Entities\User::whereBetween('created_at', [$from, $to])
            ->selectRaw('role, COUNT(*) c')->groupBy('role')->get()
            ->map(fn ($r) => ['label' => $r->role ?: '—', 'value' => (int) $r->c])->all());

        return [
            'domain' => 'growth',
            'summary' => [
                ['label' => 'مستخدمون جدد', 'value' => array_sum(array_column($series, 'value'))],
                ['label' => 'أعلى يوم', 'value' => max(array_column($series, 'value') ?: [0])],
            ],
            'series' => $series,
            'breakdown' => $byRole,
            'columns' => ['التاريخ', 'مستخدمون جدد'],
            'rows' => array_map(fn ($p) => [$p['date'], $p['value']], $series),
        ];
    }

    private function financeReport(Carbon $from, Carbon $to): array
    {
        $series = $this->dailySeries(\Modules\Billing\Entities\Invoice::class, $from, $to, 'amount', ['status' => 'paid']);
        $byPlan = $this->safeCollect(fn () => \Modules\Billing\Entities\Invoice::whereBetween('created_at', [$from, $to])->where('status', 'paid')
            ->selectRaw('plan_name, SUM(amount) s')->groupBy('plan_name')->get()
            ->map(fn ($r) => ['label' => $r->plan_name ?: '—', 'value' => round((float) $r->s, 2)])->all());

        return [
            'domain' => 'finance',
            'summary' => [
                ['label' => 'الإيراد', 'value' => round(array_sum(array_column($series, 'value')), 2)],
                ['label' => 'فواتير مدفوعة', 'value' => $this->safe(fn () => \Modules\Billing\Entities\Invoice::whereBetween('created_at', [$from, $to])->where('status', 'paid')->count())],
            ],
            'series' => $series,
            'breakdown' => $byPlan,
            'columns' => ['التاريخ', 'الإيراد'],
            'rows' => array_map(fn ($p) => [$p['date'], $p['value']], $series),
        ];
    }

    private function funnelReport(Carbon $from, Carbon $to): array
    {
        $opp = $this->safe(fn () => \Modules\Marketplace\Entities\Opportunity::whereBetween('created_at', [$from, $to])->count());
        $app = $this->safe(fn () => \Modules\Marketplace\Entities\Application::whereBetween('created_at', [$from, $to])->count());
        $intv = $this->safe(fn () => \Modules\Interview\Entities\Interview::whereBetween('created_at', [$from, $to])->count());
        $done = $this->safe(fn () => \Modules\Interview\Entities\Interview::whereBetween('created_at', [$from, $to])->where('status', 'completed')->count());

        return [
            'domain' => 'funnel',
            'summary' => [
                ['label' => 'معدّل التقديم/الفرصة', 'value' => round($app / max(1, $opp), 2)],
                ['label' => 'نسبة المقابلة %', 'value' => round($intv / max(1, $app) * 100, 1)],
                ['label' => 'نسبة الإكمال %', 'value' => round($done / max(1, $intv) * 100, 1)],
            ],
            'breakdown' => [
                ['label' => 'الفرص', 'value' => $opp], ['label' => 'التقديمات', 'value' => $app],
                ['label' => 'المقابلات', 'value' => $intv], ['label' => 'المكتملة', 'value' => $done],
            ],
            'columns' => ['المرحلة', 'العدد'],
            'rows' => [['الفرص', $opp], ['التقديمات', $app], ['المقابلات', $intv], ['المكتملة', $done]],
        ];
    }

    private function engagementReport(Carbon $from, Carbon $to): array
    {
        $assistant = $this->dailySeries(\Modules\Ai\Entities\AssistantMessage::class, $from, $to);
        $tickets = $this->safe(fn () => \Modules\Support\Entities\Ticket::whereBetween('created_at', [$from, $to])->count());
        $resolved = $this->safe(fn () => \Modules\Support\Entities\Ticket::whereBetween('created_at', [$from, $to])->whereIn('status', ['resolved', 'closed'])->count());

        return [
            'domain' => 'engagement',
            'summary' => [
                ['label' => 'رسائل المساعد', 'value' => array_sum(array_column($assistant, 'value'))],
                ['label' => 'تذاكر الدعم', 'value' => $tickets],
                ['label' => 'نسبة الحلّ %', 'value' => round($resolved / max(1, $tickets) * 100, 1)],
            ],
            'series' => $assistant,
            'breakdown' => [['label' => 'محلولة', 'value' => $resolved], ['label' => 'مفتوحة', 'value' => max(0, $tickets - $resolved)]],
            'columns' => ['التاريخ', 'رسائل المساعد'],
            'rows' => array_map(fn ($p) => [$p['date'], $p['value']], $assistant),
        ];
    }

    private function qualityReport(Carbon $from, Carbon $to): array
    {
        $avg = $this->safe(fn () => round((float) \Modules\Interview\Entities\Interview::whereBetween('created_at', [$from, $to])->avg('score'), 1));
        $approved = $this->safe(fn () => \Modules\Interviewer\Entities\Interviewer::where('status', 'approved')->count());
        $totalIntw = $this->safe(fn () => \Modules\Interviewer\Entities\Interviewer::count());
        $scoreBuckets = $this->safeCollect(fn () => \Modules\Interview\Entities\Interview::whereBetween('created_at', [$from, $to])->get(['score'])
            ->groupBy(fn ($i) => $i->score >= 80 ? 'ممتاز (80+)' : ($i->score >= 60 ? 'جيّد (60-79)' : 'يحتاج تحسين (<60)'))
            ->map->count()->map(fn ($v, $k) => ['label' => $k, 'value' => $v])->values()->all());

        return [
            'domain' => 'quality',
            'summary' => [
                ['label' => 'متوسّط تقييم المقابلات', 'value' => $avg],
                ['label' => 'مقيّمون معتمدون', 'value' => $approved],
                ['label' => 'نسبة الاعتماد %', 'value' => round($approved / max(1, $totalIntw) * 100, 1)],
            ],
            'breakdown' => $scoreBuckets,
            'columns' => ['الفئة', 'العدد'],
            'rows' => array_map(fn ($b) => [$b['label'], $b['value']], $scoreBuckets),
        ];
    }

    // ═══ مساعدات ═══

    /** سلسلة يوميّة (عدد أو مجموع حقل) بين تاريخين — يملأ الأيّام الفارغة بصفر. */
    private function dailySeries(string $model, Carbon $from, Carbon $to, ?string $sumColumn = null, array $where = []): array
    {
        return $this->safeCollect(function () use ($model, $from, $to, $sumColumn, $where) {
            $agg = $sumColumn ? "SUM($sumColumn) v" : 'COUNT(*) v';
            $q = $model::query()->whereBetween('created_at', [$from, $to]);
            foreach ($where as $col => $val) {
                $q->where($col, $val);
            }
            $raw = $q->selectRaw("DATE(created_at) d, $agg")->groupBy('d')->pluck('v', 'd');
            $series = [];
            $cursor = (clone $from)->startOfDay();
            $end = (clone $to)->startOfDay();
            while ($cursor->lte($end)) {
                $date = $cursor->toDateString();
                $series[] = ['date' => $date, 'value' => round((float) ($raw[$date] ?? 0), 2)];
                $cursor->addDay();
            }

            return $series;
        }) ?: [];
    }

    private function safe(callable $fn): float|int
    {
        try {
            return $fn();
        } catch (\Throwable) {
            return 0;
        }
    }

    private function safeCollect(callable $fn): array
    {
        try {
            return $fn() ?? [];
        } catch (\Throwable) {
            return [];
        }
    }
}
