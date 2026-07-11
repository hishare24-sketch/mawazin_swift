<?php

namespace Modules\Marketplace\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Modules\Marketplace\Entities\Opportunity;
use Modules\Marketplace\Http\Resources\Admin\AdminOpportunityResource;

class AdminOpportunityController extends Controller
{
    private const SORTABLE = ['id', 'title', 'company', 'location', 'salary', 'category', 'created_at'];

    /** إحصاءات الفرص — العدد + التوزيع بالقطاع + سلسلة زمنيّة. */
    public function stats()
    {
        $this->authorize('view_opportunities');

        $all = Opportunity::get(['category', 'location', 'created_at']);
        $byCategory = $all->groupBy('category')->map->count()
            ->map(fn ($c, $x) => ['label' => $x ?: '—', 'value' => (int) $c])->values();

        $raw = Opportunity::where('created_at', '>=', Carbon::now()->subDays(13)->startOfDay())
            ->selectRaw('DATE(created_at) as d, COUNT(*) as c')->groupBy('d')->pluck('c', 'd');
        $series = [];
        for ($i = 13; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i)->toDateString();
            $series[] = ['date' => $date, 'value' => (int) ($raw[$date] ?? 0)];
        }

        return $this->dataResponse([
            'total' => $all->count(),
            'categories' => $all->pluck('category')->filter()->unique()->count(),
            'locations' => $all->pluck('location')->filter()->unique()->count(),
            'byCategory' => $byCategory,
            'series' => $series,
        ]);
    }

    /** قائمة الفرص — بحث + فلترة قطاع + فرز + ترقيم خادميّ. */
    public function index(Request $request)
    {
        $this->authorize('view_opportunities');

        $query = Opportunity::query();

        if ($q = trim((string) $request->query('q', ''))) {
            $query->where(function ($sub) use ($q): void {
                $sub->where('title', like_op(), "%{$q}%")
                    ->orWhere('company', like_op(), "%{$q}%")
                    ->orWhere('location', like_op(), "%{$q}%");
            });
        }
        if ($category = $request->query('category')) {
            $query->where('category', $category);
        }

        [$column, $dir] = $this->parseSort((string) $request->query('sort', '-id'), self::SORTABLE);
        $query->orderBy($column, $dir);

        $items = $query->paginate((int) $request->query('perPage', 15));
        $items->setCollection(
            $items->getCollection()->map(fn (Opportunity $o) => (new AdminOpportunityResource($o))->resolve())
        );

        return $this->dashboardResponse($items);
    }

    /** حذف فرصة (إشراف). */
    public function destroy(Opportunity $opportunity)
    {
        $this->authorize('delete_opportunities');
        $opportunity->delete();

        return $this->updatedResponse(null, __('Deleted successfully'));
    }
}
