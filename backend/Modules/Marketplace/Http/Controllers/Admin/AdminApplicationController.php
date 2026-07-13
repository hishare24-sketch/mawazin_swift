<?php

namespace Modules\Marketplace\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Modules\Marketplace\Entities\Application;
use Modules\Marketplace\Entities\ApplicationEvent;
use Modules\Marketplace\Entities\Opportunity;

/**
 * خطّ أنابيب التوظيف (ATS) — إدارة المتقدّمين عبر مراحل التوظيف بلوحة كانبان.
 * ميزة عمق توظيفيّة لا تملكها منصّات الأعمال العامّة.
 */
class AdminApplicationController extends Controller
{
    public const STAGES = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'];

    /** لوحة كانبان — التقديمات مجمّعة بالمرحلة (اختياريّاً لفرصة بعينها). */
    public function board(Request $request)
    {
        $this->authorize('view_pipeline');

        $query = Application::query()->with(['user:id,name,email', 'opportunity:id,title,company']);
        if ($oppId = $request->query('opportunity_id')) {
            $query->where('opportunity_id', $oppId);
        }
        $apps = $query->orderByDesc('id')->get();

        $grouped = collect(self::STAGES)->mapWithKeys(fn ($s) => [$s => []])->toArray();
        foreach ($apps as $a) {
            $stage = in_array($a->stage, self::STAGES, true) ? $a->stage : 'applied';
            $grouped[$stage][] = $this->card($a);
        }

        $stages = collect(self::STAGES)->map(fn ($s) => [
            'key' => $s,
            'count' => count($grouped[$s]),
            'items' => $grouped[$s],
        ])->all();

        return $this->dataResponse(['stages' => $stages]);
    }

    /** إحصاءات خطّ الأنابيب — عدّ بالمرحلة + معدّلات التحويل. */
    public function stats(Request $request)
    {
        $this->authorize('view_pipeline');

        $query = Application::query();
        if ($oppId = $request->query('opportunity_id')) {
            $query->where('opportunity_id', $oppId);
        }
        $all = $query->get(['stage']);
        $total = $all->count();
        $byStage = collect(self::STAGES)->map(fn ($s) => [
            'label' => $s,
            'value' => $all->where('stage', $s)->count(),
        ])->values();

        $hired = $all->where('stage', 'hired')->count();
        $rejected = $all->where('stage', 'rejected')->count();
        $active = $total - $hired - $rejected;

        return $this->dataResponse([
            'total' => $total,
            'active' => $active,
            'hired' => $hired,
            'rejected' => $rejected,
            'hireRate' => round($hired / max(1, $total) * 100, 1),
            'byStage' => $byStage,
        ]);
    }

    /** نقل مرشّح إلى مرحلة — يسجّل حدثًا في السجلّ. */
    public function move(Request $request, Application $application)
    {
        $this->authorize('manage_pipeline');

        $data = $request->validate([
            'to_stage' => ['required', 'in:'.implode(',', self::STAGES)],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $this->applyMove($application, $data['to_stage'], $data['note'] ?? null);

        return $this->updatedResponse($this->card($application->fresh()->load(['user:id,name,email', 'opportunity:id,title,company'])));
    }

    /** نقل جماعيّ لعدّة متقدّمين. */
    public function bulkMove(Request $request)
    {
        $this->authorize('manage_pipeline');

        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer'],
            'to_stage' => ['required', 'in:'.implode(',', self::STAGES)],
        ]);

        $apps = Application::whereIn('id', $data['ids'])->get();
        foreach ($apps as $a) {
            $this->applyMove($a, $data['to_stage'], null);
        }

        return $this->updatedResponse(['moved' => $apps->count()]);
    }

    /** قائمة الفرص لمنتقي اللوحة (مع عدد المتقدّمين). */
    public function opportunities()
    {
        $this->authorize('view_pipeline');

        $items = Opportunity::query()->withCount('applications')->orderByDesc('id')->limit(200)->get()
            ->map(fn (Opportunity $o) => [
                'id' => $o->id,
                'title' => $o->title,
                'company' => $o->company,
                'applications' => $o->applications_count,
            ]);

        return $this->dataResponse($items);
    }

    // ═══ مساعدات ═══

    private function applyMove(Application $a, string $toStage, ?string $note): void
    {
        if ($a->stage === $toStage && $note === null) {
            return;
        }
        $user = current_user();
        ApplicationEvent::create([
            'application_id' => $a->id,
            'from_stage' => $a->stage,
            'to_stage' => $toStage,
            'note' => $note,
            'actor_id' => $user?->id,
            'actor_name' => $user?->name,
            'created_at' => Carbon::now(),
        ]);
        $a->update(['stage' => $toStage, 'note' => $note ?? $a->note, 'stage_changed_at' => Carbon::now()]);
    }

    private function card(Application $a): array
    {
        return [
            'id' => $a->id,
            'candidate' => $a->user?->name ?? '—',
            'candidateEmail' => $a->user?->email,
            'opportunity' => $a->opportunity?->title ?? '—',
            'company' => $a->opportunity?->company,
            'opportunityId' => $a->opportunity_id,
            'stage' => $a->stage,
            'note' => $a->note,
            'appliedAt' => optional($a->created_at)->toISOString(),
            'stageChangedAt' => optional($a->stage_changed_at)->toISOString(),
        ];
    }
}
