<?php

namespace Modules\Marketplace\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Modules\Marketplace\Entities\MarketRequest;
use Modules\Marketplace\Http\Resources\Admin\AdminMarketRequestResource;

class AdminRequestController extends Controller
{
    private const SORTABLE = ['id', 'type', 'title', 'org', 'state', 'compensation', 'created_at'];

    /** إحصاءات الطلبات — العدد + التوزيع بالنوع والحالة + سلسلة زمنيّة. */
    public function stats()
    {
        $this->authorize('view_requests');

        $all = MarketRequest::get(['type', 'state', 'created_at']);
        $byType = $all->groupBy('type')->map->count()->map(fn ($c, $x) => ['label' => $x ?: '—', 'value' => (int) $c])->values();
        $byState = $all->groupBy('state')->map->count()->map(fn ($c, $x) => ['label' => $x ?: '—', 'value' => (int) $c])->values();

        $raw = MarketRequest::where('created_at', '>=', Carbon::now()->subDays(13)->startOfDay())
            ->selectRaw('DATE(created_at) as d, COUNT(*) as c')->groupBy('d')->pluck('c', 'd');
        $series = [];
        for ($i = 13; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i)->toDateString();
            $series[] = ['date' => $date, 'value' => (int) ($raw[$date] ?? 0)];
        }

        return $this->dataResponse([
            'total' => $all->count(),
            'types' => $all->pluck('type')->filter()->unique()->count(),
            'open' => (int) $all->where('state', 'open')->count(),
            'byType' => $byType,
            'byState' => $byState,
            'series' => $series,
        ]);
    }

    /** قائمة الطلبات — بحث + فلترة نوع/حالة + فرز + ترقيم خادميّ. */
    public function index(Request $request)
    {
        $this->authorize('view_requests');

        $query = MarketRequest::query();

        if ($q = trim((string) $request->query('q', ''))) {
            $query->where(function ($sub) use ($q): void {
                $sub->where('title', like_op(), "%{$q}%")
                    ->orWhere('org', like_op(), "%{$q}%");
            });
        }
        foreach (['type', 'state'] as $filter) {
            if ($value = $request->query($filter)) {
                $query->where($filter, $value);
            }
        }

        [$column, $dir] = $this->parseSort((string) $request->query('sort', '-id'), self::SORTABLE);
        $query->orderBy($column, $dir);

        $items = $query->paginate((int) $request->query('perPage', 15));
        $items->setCollection(
            $items->getCollection()->map(fn (MarketRequest $r) => (new AdminMarketRequestResource($r))->resolve())
        );

        return $this->dashboardResponse($items);
    }

    /** حذف طلب (إشراف). */
    public function destroy(MarketRequest $request)
    {
        $this->authorize('delete_requests');
        $request->delete();

        return $this->updatedResponse(null, __('Deleted successfully'));
    }
}
