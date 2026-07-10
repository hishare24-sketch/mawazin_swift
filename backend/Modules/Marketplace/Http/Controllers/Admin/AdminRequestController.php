<?php

namespace Modules\Marketplace\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Modules\Marketplace\Entities\MarketRequest;
use Modules\Marketplace\Http\Resources\Admin\AdminMarketRequestResource;

class AdminRequestController extends Controller
{
    private const SORTABLE = ['id', 'type', 'title', 'org', 'state', 'compensation', 'created_at'];

    /** قائمة الطلبات — بحث + فلترة نوع/حالة + فرز + ترقيم خادميّ. */
    public function index(Request $request)
    {
        $this->authorize('view_requests');

        $query = MarketRequest::query();

        if ($q = trim((string) $request->query('q', ''))) {
            $query->where(function ($sub) use ($q): void {
                $sub->where('title', 'like', "%{$q}%")
                    ->orWhere('org', 'like', "%{$q}%");
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
