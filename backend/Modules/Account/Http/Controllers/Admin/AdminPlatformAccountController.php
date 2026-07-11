<?php

namespace Modules\Account\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Modules\Account\Entities\PlatformAccount;
use Modules\Account\Http\Resources\Admin\AdminPlatformAccountResource;
use Modules\Account\Http\Resources\Admin\AdminPlatformTransactionResource;

class AdminPlatformAccountController extends Controller
{
    private const SORTABLE = ['id', 'name', 'type', 'balance', 'created_at'];
    private const TYPES = ['bank', 'cash', 'gateway'];

    /** قائمة حسابات المنصّة (خزينة). */
    public function index(Request $request)
    {
        $this->authorize('view_platform_accounts');

        $query = PlatformAccount::withCount('transactions');

        if ($q = trim((string) $request->query('q', ''))) {
            $query->where(function ($sub) use ($q): void {
                $sub->where('name', like_op(), "%{$q}%")->orWhere('bank_name', like_op(), "%{$q}%");
            });
        }
        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }

        [$column, $dir] = $this->parseSort((string) $request->query('sort', '-balance'), self::SORTABLE);
        $query->orderBy($column, $dir);

        $items = $query->paginate((int) $request->query('perPage', 15));
        $items->setCollection(
            $items->getCollection()->map(fn (PlatformAccount $a) => (new AdminPlatformAccountResource($a))->resolve())
        );

        return $this->dashboardResponse($items);
    }

    /** إحصاءات الخزينة — إجمالي الرصيد + الإيراد/الوارد/الصادر + توزيع + سلسلة زمنيّة. */
    public function stats()
    {
        $this->authorize('view_platform_accounts');

        $accounts = PlatformAccount::withSum('transactions', 'amount')->get();
        $treasury = (float) $accounts->sum('balance');

        $revenue = (float) \Modules\Account\Entities\PlatformTransaction::where('type', 'revenue')->sum('amount');
        $inflow = (float) \Modules\Account\Entities\PlatformTransaction::where('amount', '>', 0)->sum('amount');
        $outflow = (float) \Modules\Account\Entities\PlatformTransaction::where('amount', '<', 0)->sum('amount');

        $distribution = $accounts->map(fn (PlatformAccount $a) => [
            'label' => $a->name,
            'value' => round((float) $a->balance, 2),
        ])->values();

        // سلسلة الإيراد 14 يومًا (مملوءة الفجوات، LTR للرسم)
        $raw = \Modules\Account\Entities\PlatformTransaction::where('type', 'revenue')
            ->where('created_at', '>=', Carbon::now()->subDays(13)->startOfDay())
            ->selectRaw('DATE(created_at) as d, SUM(amount) as s')
            ->groupBy('d')->pluck('s', 'd');
        $series = [];
        for ($i = 13; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i)->toDateString();
            $series[] = ['date' => $date, 'value' => round((float) ($raw[$date] ?? 0), 2)];
        }

        return $this->dataResponse([
            'treasury' => round($treasury, 2),
            'revenue' => round($revenue, 2),
            'inflow' => round($inflow, 2),
            'outflow' => round(abs($outflow), 2),
            'accounts' => $accounts->count(),
            'distribution' => $distribution,
            'revenueSeries' => $series,
        ]);
    }

    /** دفتر حركات حساب. */
    public function transactions(Request $request, PlatformAccount $account)
    {
        $this->authorize('view_platform_accounts');

        $items = $account->transactions()->latest()->paginate((int) $request->query('perPage', 20));
        $items->setCollection(
            $items->getCollection()->map(fn ($t) => (new AdminPlatformTransactionResource($t))->resolve())
        );

        return $this->dashboardResponse($items);
    }

    /** إنشاء حساب بنكيّ/خزينة. */
    public function store(Request $request)
    {
        $this->authorize('manage_platform_accounts');

        $data = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'type' => ['required', 'in:'.implode(',', self::TYPES)],
            'bank_name' => ['nullable', 'string', 'max:80'],
            'account_no_masked' => ['nullable', 'string', 'max:40'],
            'currency' => ['nullable', 'string', 'max:8'],
            'notes' => ['nullable', 'string', 'max:200'],
            'active' => ['boolean'],
        ]);

        $account = PlatformAccount::create($data);

        return $this->createdResponse((new AdminPlatformAccountResource($account))->resolve());
    }

    /** تعديل بيانات حساب (لا الرصيد — يُعدَّل عبر حركة). */
    public function update(Request $request, PlatformAccount $account)
    {
        $this->authorize('manage_platform_accounts');

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:80'],
            'type' => ['sometimes', 'in:'.implode(',', self::TYPES)],
            'bank_name' => ['sometimes', 'nullable', 'string', 'max:80'],
            'account_no_masked' => ['sometimes', 'nullable', 'string', 'max:40'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:200'],
            'active' => ['sometimes', 'boolean'],
        ]);

        $account->update($data);

        return $this->updatedResponse((new AdminPlatformAccountResource($account->fresh()))->resolve());
    }

    /** إيداع/سحب يدويّ — يُسجَّل حركة ويحدّث الرصيد (يمنع الرصيد السالب 405). */
    public function adjust(Request $request, PlatformAccount $account)
    {
        $this->authorize('manage_platform_accounts');

        $data = $request->validate([
            'amount' => ['required', 'numeric', 'not_in:0'],
            'type' => ['nullable', 'in:revenue,payout,transfer,adjustment,fee'],
            'note' => ['nullable', 'string', 'max:160'],
        ]);

        if ($account->balance + $data['amount'] < 0) {
            return $this->forbiddenResponse(__('Balance cannot go negative.'));
        }

        $account->post((float) $data['amount'], $data['type'] ?? 'adjustment', $data['note'] ?? null);

        return $this->updatedResponse((new AdminPlatformAccountResource($account->fresh()))->resolve());
    }

    /** حذف حساب — الافتراضيّ وغير الفارغ محميّان (405). */
    public function destroy(PlatformAccount $account)
    {
        $this->authorize('manage_platform_accounts');

        if ($account->is_default) {
            return $this->forbiddenResponse(__('The default treasury account cannot be deleted.'));
        }
        if ((float) $account->balance !== 0.0 || $account->transactions()->exists()) {
            return $this->forbiddenResponse(__('Cannot delete an account with a balance or transaction history.'));
        }

        $account->delete();

        return $this->updatedResponse(null, __('Deleted successfully'));
    }
}
