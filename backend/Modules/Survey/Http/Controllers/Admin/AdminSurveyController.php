<?php

namespace Modules\Survey\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Modules\Survey\Entities\Survey;
use Modules\Survey\Http\Resources\Admin\AdminSurveyResource;

class AdminSurveyController extends Controller
{
    private const SORTABLE = ['id', 'title', 'state', 'points_pool', 'created_at'];

    /** إحصاءات الاستبيانات — عدّادات + التوزيع بالحالة + الردود + سلسلة زمنيّة. */
    public function stats()
    {
        $this->authorize('view_surveys');

        $surveys = Survey::get(['state', 'responses', 'created_at']);
        $byState = $surveys->groupBy('state')->map->count();
        $distribution = $byState->map(fn ($c, $s) => ['label' => $s, 'value' => (int) $c])->values();

        $totalResponses = $surveys->sum(fn ($s) => is_array($s->responses) ? count($s->responses) : 0);

        $raw = Survey::where('created_at', '>=', Carbon::now()->subDays(13)->startOfDay())
            ->selectRaw('DATE(created_at) as d, COUNT(*) as c')->groupBy('d')->pluck('c', 'd');
        $series = [];
        for ($i = 13; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i)->toDateString();
            $series[] = ['date' => $date, 'value' => (int) ($raw[$date] ?? 0)];
        }

        return $this->dataResponse([
            'total' => $surveys->count(),
            'active' => (int) ($byState['active'] ?? 0),
            'responses' => $totalResponses,
            'avgResponses' => $surveys->count() > 0 ? round($totalResponses / $surveys->count(), 1) : 0,
            'distribution' => $distribution,
            'series' => $series,
        ]);
    }

    /** قائمة الاستبيانات — بحث + فلترة حالة + فرز + ترقيم. */
    public function index(Request $request)
    {
        $this->authorize('view_surveys');

        $query = Survey::with('user');

        if ($q = trim((string) $request->query('q', ''))) {
            $query->where('title', like_op(), "%{$q}%");
        }
        if ($state = $request->query('state')) {
            $query->where('state', $state);
        }

        [$column, $dir] = $this->parseSort((string) $request->query('sort', '-id'), self::SORTABLE);
        $query->orderBy($column, $dir);

        $items = $query->paginate((int) $request->query('perPage', 15));
        $items->setCollection(
            $items->getCollection()->map(fn (Survey $s) => (new AdminSurveyResource($s))->resolve())
        );

        return $this->dashboardResponse($items);
    }

    /** إغلاق استبيان (إيقاف الاستجابات). */
    public function close(Survey $survey)
    {
        $this->authorize('close_surveys');
        $survey->update(['state' => 'closed']);

        return $this->updatedResponse((new AdminSurveyResource($survey->load('user')))->resolve());
    }

    /** حذف استبيان. */
    public function destroy(Survey $survey)
    {
        $this->authorize('delete_surveys');
        $survey->delete();

        return $this->updatedResponse(null, __('Deleted successfully'));
    }
}
