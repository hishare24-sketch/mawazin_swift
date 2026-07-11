<?php

namespace Modules\Interview\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Modules\Interview\Entities\Interview;
use Modules\Interview\Entities\InterviewRubric;
use Modules\Interview\Services\InterviewQualityService;

/**
 * كونسول جودة المقابلات (B3) — معايير موزونة + طابور مراجعة بإشارات نزاهة + معايرة تحيّز.
 */
class AdminInterviewQualityController extends Controller
{
    private const BOARD_SORTABLE = ['id', 'score', 'review_status', 'created_at'];

    private const REVIEW_STATUSES = ['pending', 'approved', 'flagged'];

    public function __construct(private readonly InterviewQualityService $quality) {}

    // ═══ الطابور والتفصيل ═══

    /** طابور المقابلات — بحث/فلترة (مسار/حالة مراجعة/مستوى نزاهة) + فرز + ترقيم. */
    public function board(Request $request)
    {
        $this->authorize('view_interviews');

        $query = Interview::query();

        if ($q = trim((string) $request->query('q', ''))) {
            $query->where(function ($sub) use ($q): void {
                $sub->where('candidate_name', like_op(), "%{$q}%")->orWhere('track', like_op(), "%{$q}%");
            });
        }
        foreach (['track', 'review_status'] as $filter) {
            if ($v = $request->query($filter)) {
                $query->where($filter, $v);
            }
        }

        [$column, $dir] = $this->parseSort((string) $request->query('sort', '-id'), self::BOARD_SORTABLE);
        $query->orderBy($column, $dir);

        $perPage = (int) $request->query('perPage', 15);
        $level = $request->query('integrity');

        // مستوى النزاهة مشتقّ (لا عمود) فلا يُرشَّح في SQL: عند طلبه نُرشّح كامل المجموعة يدويًّا
        // ثمّ نُرقّم — وإلّا لصار الترقيم يشمل صفوفًا لا تطابق والعدّادات خاطئة.
        if ($level) {
            $all = $query->get()
                ->map(fn (Interview $i) => $this->rowFor($i))
                ->where('integrityLevel', $level)
                ->values();

            $page = max(1, (int) $request->query('page', 1));
            $items = new \Illuminate\Pagination\LengthAwarePaginator(
                $all->forPage($page, $perPage)->values(),
                $all->count(),
                $perPage,
                $page,
                ['path' => $request->url(), 'query' => $request->query()]
            );

            return $this->dashboardResponse($items);
        }

        $items = $query->paginate($perPage);
        $items->setCollection(collect($items->items())->map(fn (Interview $i) => $this->rowFor($i))->values());

        return $this->dashboardResponse($items);
    }

    /** تفصيل مقابلة — تفكيك المعايير + إشارات النزاهة + المعيار المستخدم. */
    public function show(Interview $interview)
    {
        $this->authorize('view_interviews');

        $interview->load('rubric');
        $integrity = $this->quality->integrity($interview->integrity);

        $breakdown = [];
        $criteria = $interview->rubric?->criteria ?? [];
        $scores = $interview->criteria_scores ?? [];
        foreach ($criteria as $c) {
            $key = $c['key'] ?? '';
            $breakdown[] = [
                'key' => $key,
                'label' => $c['label'] ?? $key,
                'weight' => (float) ($c['weight'] ?? 0),
                'score' => (float) ($scores[$key] ?? 0),
            ];
        }

        return $this->dataResponse([
            'id' => $interview->id,
            'track' => $interview->track,
            'candidateName' => $interview->candidate_name,
            'status' => $interview->status,
            'score' => (float) $interview->score,
            'weightedScore' => $this->quality->weightedScore($criteria, $scores),
            'reviewStatus' => $interview->review_status,
            'rubric' => $interview->rubric ? ['id' => $interview->rubric->id, 'name' => $interview->rubric->name] : null,
            'breakdown' => $breakdown,
            'integrity' => $integrity,
            'reviewedAt' => optional($interview->reviewed_at)->toISOString(),
            'createdAt' => optional($interview->created_at)->toISOString(),
        ]);
    }

    /** مراجعة — اعتماد أو تعليم مقابلة (يسجّل المُراجِع والوقت). */
    public function review(Request $request, Interview $interview)
    {
        $this->authorize('manage_interview_quality');

        $data = $request->validate(['status' => ['required', 'in:approved,flagged,pending']]);
        $interview->update([
            'review_status' => $data['status'],
            'reviewed_by' => current_user()?->id,
            'reviewed_at' => Carbon::now(),
        ]);

        return $this->updatedResponse($this->rowFor($interview->fresh()));
    }

    // ═══ الإحصاءات والمعايرة ═══

    /** شريط الإحصاءات — عدّادات + متوسّط + معلّقة + عالية الخطر + توزيعات. */
    public function stats()
    {
        $this->authorize('view_interviews');

        $all = Interview::get(['track', 'score', 'review_status', 'integrity']);
        $highRisk = $all->filter(fn (Interview $i) => $this->quality->integrity($i->integrity)['level'] === 'high')->count();

        $byStatus = $all->groupBy('review_status')->map->count()
            ->map(fn ($c, $x) => ['label' => $x, 'value' => (int) $c])->values();
        $byLevel = $all->groupBy(fn (Interview $i) => $this->quality->integrity($i->integrity)['level'])
            ->map->count()->map(fn ($c, $x) => ['label' => $x, 'value' => (int) $c])->values();

        return $this->dataResponse([
            'total' => $all->count(),
            'avgScore' => round((float) $all->avg('score'), 1),
            'flagged' => (int) $all->where('review_status', 'flagged')->count(),
            'pending' => (int) $all->where('review_status', 'pending')->count(),
            'highRisk' => $highRisk,
            'byStatus' => $byStatus,
            'byIntegrity' => $byLevel,
        ]);
    }

    /** المعايرة — تحيّز المسارات (تساهل/تشدّد) ونسبة الخطر لكلّ مسار. */
    public function calibration()
    {
        $this->authorize('view_interviews');

        return $this->dataResponse($this->quality->calibration(Interview::get(['track', 'score', 'integrity'])));
    }

    // ═══ مكتبة المعايير (rubrics) ═══

    public function rubrics()
    {
        $this->authorize('view_interviews');

        $items = InterviewRubric::orderBy('track')->orderBy('sort')->get()
            ->map(fn (InterviewRubric $r) => $this->rubricRow($r));

        return $this->dataResponse($items);
    }

    public function storeRubric(Request $request)
    {
        $this->authorize('manage_interview_quality');

        $data = $this->validateRubric($request);
        $rubric = InterviewRubric::create([
            'key' => Str::slug($data['name']).'-'.Str::lower(Str::random(4)),
            'name' => $data['name'],
            'track' => $data['track'],
            'criteria' => $data['criteria'],
            'active' => $data['active'] ?? true,
            'is_system' => false,
            'sort' => (int) (InterviewRubric::where('track', $data['track'])->max('sort') + 1),
        ]);

        return $this->createdResponse($this->rubricRow($rubric));
    }

    public function updateRubric(Request $request, InterviewRubric $rubric)
    {
        $this->authorize('manage_interview_quality');

        $data = $this->validateRubric($request, partial: true);
        $rubric->update(array_filter([
            'name' => $data['name'] ?? null,
            'track' => $data['track'] ?? null,
            'criteria' => $data['criteria'] ?? null,
            'active' => array_key_exists('active', $data) ? $data['active'] : null,
        ], fn ($v) => $v !== null));

        return $this->updatedResponse($this->rubricRow($rubric->fresh()));
    }

    public function destroyRubric(InterviewRubric $rubric)
    {
        $this->authorize('manage_interview_quality');

        if ($rubric->is_system) {
            return $this->forbiddenResponse('لا يمكن حذف معيار نظاميّ.');
        }
        $rubric->delete();

        return $this->updatedResponse();
    }

    // ═══ مساعدات ═══

    private function validateRubric(Request $request, bool $partial = false): array
    {
        $rule = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'name' => [$rule, 'string', 'max:120'],
            'track' => [$rule, 'string', 'max:60'],
            'criteria' => [$rule, 'array', 'min:1'],
            'criteria.*.key' => ['required', 'string', 'max:60'],
            'criteria.*.label' => ['required', 'string', 'max:120'],
            'criteria.*.weight' => ['required', 'numeric', 'min:0', 'max:100'],
            'active' => ['sometimes', 'boolean'],
        ]);
    }

    private function rowFor(Interview $i): array
    {
        $integrity = $this->quality->integrity($i->integrity);

        return [
            'id' => $i->id,
            'track' => $i->track,
            'candidateName' => $i->candidate_name,
            'status' => $i->status,
            'score' => (float) $i->score,
            'reviewStatus' => $i->review_status,
            'integrityScore' => $integrity['score'],
            'integrityLevel' => $integrity['level'],
            'createdAt' => optional($i->created_at)->toISOString(),
        ];
    }

    private function rubricRow(InterviewRubric $r): array
    {
        return [
            'id' => $r->id,
            'key' => $r->key,
            'name' => $r->name,
            'track' => $r->track,
            'criteria' => $r->criteria ?? [],
            'active' => $r->active,
            'isSystem' => $r->is_system,
        ];
    }
}
