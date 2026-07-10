<?php

namespace Modules\Marketplace\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Modules\Marketplace\Entities\Opportunity;
use Modules\Marketplace\Http\Resources\Admin\AdminOpportunityResource;

class AdminOpportunityController extends Controller
{
    private const SORTABLE = ['id', 'title', 'company', 'location', 'salary', 'category', 'created_at'];

    /** قائمة الفرص — بحث + فلترة قطاع + فرز + ترقيم خادميّ. */
    public function index(Request $request)
    {
        $this->authorize('view_opportunities');

        $query = Opportunity::query();

        if ($q = trim((string) $request->query('q', ''))) {
            $query->where(function ($sub) use ($q): void {
                $sub->where('title', 'like', "%{$q}%")
                    ->orWhere('company', 'like', "%{$q}%")
                    ->orWhere('location', 'like', "%{$q}%");
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
