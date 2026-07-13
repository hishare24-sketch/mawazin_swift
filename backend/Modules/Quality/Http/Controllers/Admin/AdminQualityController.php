<?php

namespace Modules\Quality\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Modules\Quality\Entities\QualityDispatch;
use Modules\Quality\Entities\QualitySnapshot;
use Modules\Quality\Entities\RuntimeError;
use Modules\Quality\Entities\TestCase as TestCaseAtom;
use Modules\Quality\Services\GithubCiService;
use Modules\Quality\Services\QualityAgentService;
use Modules\Quality\Services\TestScaffoldGenerator;

/**
 * مركز قيادة الجودة (الأدمن) — قراءة ذرّات حالات الاختبار وإحصاءاتها + التحويل.
 * تحت /api/admin (auth:sanctum + admin). القراءة: view_quality · التحويل: manage_quality.
 */
class AdminQualityController extends Controller
{
    /** أقسام التحويل (لوحة kanban). */
    public const DEPARTMENTS = ['triage', 'ops', 'testing', 'backend', 'frontend', 'filters'];

    /** دورة حياة البطاقة داخل القسم. */
    public const STATES = ['todo', 'doing', 'review', 'done'];

    public function __construct(private readonly QualityAgentService $agent) {}

    /** بطاقات + توزيعات + اتّجاه التغطية. */
    public function overview()
    {
        $this->authorize('view_quality');

        $total = TestCaseAtom::count();
        $automated = TestCaseAtom::where('status', 'automated')->count();
        $gap = TestCaseAtom::where('status', 'gap')->count();
        $failing = TestCaseAtom::where('status', 'failing')->count();

        return $this->dataResponse([
            'total' => $total,
            'automated' => $automated,
            'gap' => $gap,
            'failing' => $failing,
            'critical' => TestCaseAtom::where('priority', 'critical')->count(),
            'criticalGaps' => TestCaseAtom::where('priority', 'critical')->where('status', 'gap')->count(),
            'coverage' => $total > 0 ? round($automated / $total * 100, 1) : 0.0,
            'byLayer' => $this->countBy('layer'),
            'byType' => $this->countBy('type'),
            'byPriority' => $this->countBy('priority'),
            'byStatus' => $this->countBy('status'),
            'topGapSections' => $this->topGapSections(),
            'series' => $this->series(),
            'runtime' => [
                'open' => RuntimeError::open()->count(),
                'critical' => RuntimeError::open()->whereIn('severity', ['critical', 'high'])->count(),
                'today' => RuntimeError::whereDate('last_seen_at', Carbon::now()->toDateString())->count(),
            ],
        ]);
    }

    /** إشارات وقت-التشغيل المرصودة (مجمّعة بالبصمة) — ف3. */
    public function runtime(Request $request)
    {
        $this->authorize('view_quality');

        $query = RuntimeError::query();

        if ($q = trim((string) $request->query('q', ''))) {
            $query->where(function ($sub) use ($q): void {
                $sub->where('message', 'like', "%{$q}%")->orWhere('route', 'like', "%{$q}%");
            });
        }
        foreach (['type', 'layer', 'scope', 'severity', 'status'] as $filter) {
            if ($value = $request->query($filter)) {
                $query->where($filter, $value);
            }
        }

        [$column, $direction] = $this->parseSort(
            (string) $request->query('sort', '-last_seen_at'),
            ['last_seen_at', 'first_seen_at', 'count', 'severity', 'type', 'status'],
            'last_seen_at',
        );
        $query->orderBy($column, $direction);

        $page = $query->paginate($this->perPage($request));
        $page->getCollection()->transform(fn (RuntimeError $e) => $this->presentError($e));

        return $this->dashboardResponse($page);
    }

    /** قائمة الذرّات مصفّاة/مقسّمة صفحات — يقابل useAdminResource/ResourceScaffold. */
    public function atoms(Request $request)
    {
        $this->authorize('view_quality');

        $query = TestCaseAtom::query();

        if ($q = trim((string) $request->query('q', ''))) {
            $query->where(function ($sub) use ($q): void {
                $sub->where('case_id', 'like', "%{$q}%")
                    ->orWhere('title', 'like', "%{$q}%")
                    ->orWhere('test_file', 'like', "%{$q}%");
            });
        }

        foreach (['layer', 'section', 'module', 'type', 'priority', 'status'] as $filter) {
            if ($value = $request->query($filter)) {
                $query->where($filter, $value);
            }
        }

        [$column, $direction] = $this->parseSort(
            (string) $request->query('sort', 'case_id'),
            ['case_id', 'layer', 'section', 'module', 'type', 'priority', 'status'],
            'case_id',
        );
        $query->orderBy($column, $direction);

        $page = $query->paginate($this->perPage($request));
        $page->getCollection()->transform(fn (TestCaseAtom $a) => $this->present($a));

        return $this->dashboardResponse($page);
    }

    /** الوكيل L2/L3 — تشخيص خطأ وقت-تشغيل + إصلاح مقترح (ف6، بموافقة بشريّة). */
    public function diagnose(RuntimeError $runtimeError)
    {
        $this->authorize('manage_quality');

        $diagnosis = $this->agent->diagnose($runtimeError);
        $runtimeError->update(['diagnosis' => $diagnosis, 'diagnosed_at' => Carbon::now()]);

        return $this->dataResponse($this->presentError($runtimeError->fresh()));
    }

    /** يولّد هيكل اختبار من ذرّة فجوة (ف5). */
    public function scaffold(TestCaseAtom $testCase, TestScaffoldGenerator $generator)
    {
        $this->authorize('view_quality');

        return $this->dataResponse($generator->generate($testCase));
    }

    /** حالة CI حيًّا من GitHub Actions (ف4). */
    public function ci(GithubCiService $github)
    {
        $this->authorize('view_quality');

        return $this->dataResponse($github->latest(15));
    }

    // ═══ التحويل (لوحة الأقسام / kanban) ═══

    /** لوحة الأقسام: الأعمدة + البطاقات المحوّلة لكلّ قسم + العدّادات. */
    public function board()
    {
        $this->authorize('view_quality');

        $dispatches = QualityDispatch::with('testCase')->orderByDesc('updated_at')->get();

        $lanes = [];
        $counts = [];
        foreach (self::DEPARTMENTS as $dept) {
            $lanes[$dept] = [];
            $counts[$dept] = 0;
        }
        foreach ($dispatches as $d) {
            if (! isset($lanes[$d->department]) || $d->testCase === null) {
                continue;
            }
            $lanes[$d->department][] = $this->presentDispatch($d);
            $counts[$d->department]++;
        }

        return $this->dataResponse([
            'departments' => self::DEPARTMENTS,
            'states' => self::STATES,
            'lanes' => $lanes,
            'counts' => $counts,
            'total' => $dispatches->count(),
        ]);
    }

    /** تحويل ذرّة إلى قسم (إنشاء/تحديث — تحويل واحد لكلّ ذرّة). */
    public function dispatchAtom(Request $request, TestCaseAtom $testCase)
    {
        $this->authorize('manage_quality');

        $data = $request->validate([
            'department' => ['required', Rule::in(self::DEPARTMENTS)],
            'state' => ['nullable', Rule::in(self::STATES)],
            'assignee' => ['nullable', 'string', 'max:120'],
            'note' => ['nullable', 'string', 'max:2000'],
        ]);

        $dispatch = QualityDispatch::updateOrCreate(
            ['test_case_id' => $testCase->id],
            [
                'department' => $data['department'],
                'state' => $data['state'] ?? 'todo',
                'assignee' => $data['assignee'] ?? null,
                'note' => $data['note'] ?? null,
            ],
        );

        return $this->dataResponse($this->presentDispatch($dispatch->load('testCase')));
    }

    /** حركة البطاقة: تغيير القسم/الحالة/المكلَّف. */
    public function moveDispatch(Request $request, QualityDispatch $dispatch)
    {
        $this->authorize('manage_quality');

        $data = $request->validate([
            'department' => ['nullable', Rule::in(self::DEPARTMENTS)],
            'state' => ['nullable', Rule::in(self::STATES)],
            'assignee' => ['nullable', 'string', 'max:120'],
            'note' => ['nullable', 'string', 'max:2000'],
        ]);

        $dispatch->fill(array_filter($data, fn ($v) => $v !== null))->save();

        return $this->updatedResponse($this->presentDispatch($dispatch->load('testCase')));
    }

    /** إزالة البطاقة من اللوحة (تعود الذرّة غير محوّلة). */
    public function destroyDispatch(QualityDispatch $dispatch)
    {
        $this->authorize('manage_quality');
        $dispatch->delete();

        return $this->updatedResponse();
    }

    // ═══ مساعدات ═══

    private function presentError(RuntimeError $e): array
    {
        return [
            'id' => $e->id,
            'fingerprint' => $e->fingerprint,
            'type' => $e->type,
            'message' => $e->message,
            'layer' => $e->layer,
            'scope' => $e->scope,
            'route' => $e->route,
            'severity' => $e->severity,
            'status' => $e->status,
            'count' => $e->count,
            'firstSeen' => optional($e->first_seen_at)->toISOString(),
            'lastSeen' => optional($e->last_seen_at)->toISOString(),
            'suggested' => $this->agent->triage($e),          // L1 فرز قاعديّ
            'diagnosis' => $e->diagnosis,                      // L2/L3 (إن شُخّص)
            'diagnosedAt' => optional($e->diagnosed_at)->toISOString(),
        ];
    }

    private function presentDispatch(QualityDispatch $d): array
    {
        return [
            'id' => $d->id,
            'department' => $d->department,
            'state' => $d->state,
            'assignee' => $d->assignee,
            'note' => $d->note,
            'atom' => $d->testCase ? $this->present($d->testCase) : null,
        ];
    }

    private function present(TestCaseAtom $a): array
    {
        return [
            'id' => $a->id,
            'caseId' => $a->case_id,
            'title' => $a->title,
            'layer' => $a->layer,
            'section' => $a->section,
            'module' => $a->module,
            'type' => $a->type,
            'priority' => $a->priority,
            'status' => $a->status,
            'lifecycle' => $a->lifecycle,
            'testFile' => $a->test_file,
        ];
    }

    /** @return array<int,array{key:string,count:int}> */
    private function countBy(string $column): array
    {
        return TestCaseAtom::selectRaw("{$column} as k, COUNT(*) as c")
            ->groupBy($column)->orderByDesc('c')->get()
            ->map(fn ($r) => ['key' => (string) ($r->k ?? '—'), 'count' => (int) $r->c])
            ->all();
    }

    /** أعلى الأقسام فجوةً (للتوجيه). */
    private function topGapSections(): array
    {
        return TestCaseAtom::selectRaw('section, layer, COUNT(*) as gaps')
            ->where('status', 'gap')
            ->groupBy('section', 'layer')->orderByDesc('gaps')->limit(8)->get()
            ->map(fn ($r) => ['section' => $r->section, 'layer' => $r->layer, 'gaps' => (int) $r->gaps])
            ->all();
    }

    /** اتّجاه التغطية من اللقطات (آخر 14 لقطة). */
    private function series(): array
    {
        return QualitySnapshot::orderByDesc('captured_on')->limit(14)->get()->reverse()->values()
            ->map(fn (QualitySnapshot $s) => [
                'date' => $s->captured_on->toDateString(),
                'coverage' => $s->total > 0 ? round($s->automated / $s->total * 100, 1) : 0.0,
                'total' => (int) $s->total,
                'automated' => (int) $s->automated,
            ])->all();
    }
}
