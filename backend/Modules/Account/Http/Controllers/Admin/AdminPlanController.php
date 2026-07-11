<?php

namespace Modules\Account\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Modules\Account\Entities\Plan;
use Modules\Account\Http\Resources\Admin\AdminPlanResource;
use Modules\User\Entities\User;

class AdminPlanController extends Controller
{
    private const SORTABLE = ['id', 'key', 'name', 'price', 'sort'];

    /** كتالوج الباقات — كلّها (فرز بالترتيب افتراضًا). */
    public function index(Request $request)
    {
        $this->authorize('view_plans');

        $query = Plan::query();

        if ($q = trim((string) $request->query('q', ''))) {
            $query->where(function ($sub) use ($q): void {
                $sub->where('name', like_op(), "%{$q}%")->orWhere('key', like_op(), "%{$q}%");
            });
        }

        [$column, $dir] = $this->parseSort((string) $request->query('sort', 'sort'), self::SORTABLE, 'sort');
        $query->orderBy($column, $dir);

        $items = $query->paginate((int) $request->query('perPage', 15));
        $items->setCollection(
            $items->getCollection()->map(fn (Plan $p) => (new AdminPlanResource($p))->resolve())
        );

        return $this->dashboardResponse($items);
    }

    /** إحصاءات الباقات — عدّادات + إيراد شهريّ تقديريّ + توزيع المشتركين. */
    public function stats()
    {
        $this->authorize('view_plans');

        $plans = Plan::orderBy('sort')->get();
        $subs = User::selectRaw('tier, COUNT(*) as c')->groupBy('tier')->pluck('c', 'tier');

        $distribution = $plans->map(fn (Plan $p) => [
            'label' => $p->name,
            'value' => (int) ($subs[$p->key] ?? 0),
        ])->values();

        $mrr = $plans->sum(fn (Plan $p) => (float) $p->price * (int) ($subs[$p->key] ?? 0));

        return $this->dataResponse([
            'totalPlans' => $plans->count(),
            'activePlans' => $plans->where('active', true)->count(),
            'subscribers' => (int) $subs->sum(),
            'mrr' => round($mrr, 2),
            'distribution' => $distribution,
        ]);
    }

    /** إنشاء باقة جديدة — key فريد وغير قابل للتعديل لاحقًا. */
    public function store(Request $request)
    {
        $this->authorize('create_plans');

        $data = $request->validate([
            'key' => ['required', 'string', 'max:40', 'alpha_dash', Rule::unique('plans', 'key')],
            'name' => ['required', 'string', 'max:80'],
            'price' => ['required', 'numeric', 'min:0'],
            'survey_limit' => ['nullable', 'integer', 'min:0'],
            'features' => ['nullable', 'array'],
            'features.*' => ['string', 'max:200'],
            'active' => ['boolean'],
            'sort' => ['nullable', 'integer', 'min:0'],
        ]);
        $data['sort'] ??= (int) (Plan::max('sort') ?? 0) + 1;

        $plan = Plan::create($data);

        return $this->createdResponse((new AdminPlanResource($plan))->resolve());
    }

    /** حذف باقة — يُمنع إن كان لها مشتركون (نمط الفريق 405). */
    public function destroy(Plan $plan)
    {
        $this->authorize('delete_plans');

        if (User::where('tier', $plan->key)->exists()) {
            return $this->forbiddenResponse(__('Cannot delete a plan that still has subscribers.'));
        }

        $plan->delete();

        return $this->updatedResponse(null, __('Deleted successfully'));
    }

    /** تعديل باقة — السعر/الاسم/حدّ الاستبيانات/المزايا/التفعيل. */
    public function update(Request $request, Plan $plan)
    {
        $this->authorize('update_plans');

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:80'],
            'price' => ['sometimes', 'numeric', 'min:0'],
            'survey_limit' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'features' => ['sometimes', 'array'],
            'features.*' => ['string', 'max:200'],
            'active' => ['sometimes', 'boolean'],
        ]);

        $plan->update($data);

        return $this->updatedResponse((new AdminPlanResource($plan->fresh()))->resolve());
    }
}
