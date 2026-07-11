<?php

namespace Modules\Billing\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Modules\Account\Entities\PlatformAccount;
use Modules\Account\Entities\Wallet;
use Modules\Billing\Entities\Invoice;
use Modules\Billing\Http\Resources\Admin\AdminInvoiceResource;

class AdminInvoiceController extends Controller
{
    private const SORTABLE = ['id', 'amount', 'status', 'plan_key', 'created_at'];

    /** قائمة الفواتير — بحث بالمستخدم/المرجع + فلترة حالة/باقة + فرز + ترقيم. */
    public function index(Request $request)
    {
        $this->authorize('view_billing');

        $query = Invoice::query();

        if ($q = trim((string) $request->query('q', ''))) {
            $query->where(function ($sub) use ($q): void {
                $sub->where('user_name', like_op(), "%{$q}%")->orWhere('reference', like_op(), "%{$q}%");
            });
        }
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($plan = $request->query('plan_key')) {
            $query->where('plan_key', $plan);
        }

        [$column, $dir] = $this->parseSort((string) $request->query('sort', '-id'), self::SORTABLE);
        $query->orderBy($column, $dir);

        $items = $query->paginate((int) $request->query('perPage', 15));
        $items->setCollection(
            $items->getCollection()->map(fn (Invoice $i) => (new AdminInvoiceResource($i))->resolve())
        );

        return $this->dashboardResponse($items);
    }

    /** إحصاءات الفوترة — الإيراد الصافي + العدّادات + التوزيع بالباقة + سلسلة الإيراد. */
    public function stats()
    {
        $this->authorize('view_billing');

        $all = Invoice::get(['plan_key', 'plan_name', 'amount', 'status', 'created_at']);
        $paid = $all->where('status', 'paid');
        $refunded = $all->where('status', 'refunded');

        $byPlan = $paid->groupBy('plan_name')->map(fn ($g) => (float) $g->sum('amount'))
            ->map(fn ($v, $k) => ['label' => $k ?: '—', 'value' => round($v, 2)])->values();

        $raw = Invoice::where('status', 'paid')
            ->where('created_at', '>=', Carbon::now()->subDays(13)->startOfDay())
            ->selectRaw('DATE(created_at) as d, SUM(amount) as s')->groupBy('d')->pluck('s', 'd');
        $series = [];
        for ($i = 13; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i)->toDateString();
            $series[] = ['date' => $date, 'value' => round((float) ($raw[$date] ?? 0), 2)];
        }

        return $this->dataResponse([
            'revenue' => round((float) $paid->sum('amount'), 2),
            'invoices' => $all->count(),
            'paid' => $paid->count(),
            'refunded' => $refunded->count(),
            'refundedAmount' => round((float) $refunded->sum('amount'), 2),
            'byPlan' => $byPlan,
            'series' => $series,
        ]);
    }

    /** استرداد فاتورة — يعيد المبلغ لمحفظة المستخدم ويخصمه من الخزينة (مرّة واحدة). */
    public function refund(Invoice $invoice)
    {
        $this->authorize('manage_billing');

        if ($invoice->status !== 'paid') {
            return $this->forbiddenResponse(__('Only paid invoices can be refunded.'));
        }

        // إعادة المبلغ لمحفظة المستخدم
        if ($invoice->user_id !== null) {
            $wallet = Wallet::firstOrCreate(['user_id' => $invoice->user_id], ['balance' => 0, 'transactions' => []]);
            $tx = is_array($wallet->transactions) ? $wallet->transactions : [];
            $tx[] = [
                'id' => (int) (collect($tx)->max('id') ?? 0) + 1,
                'amount' => (float) $invoice->amount,
                'label' => __('Refund for invoice :ref', ['ref' => $invoice->reference]),
                'at' => Carbon::now()->toISOString(),
            ];
            $wallet->update(['balance' => $wallet->balance + $invoice->amount, 'transactions' => $tx]);
        }

        // خصم من خزينة المنصّة (طرف مقابل)
        PlatformAccount::default()?->post(-1 * (float) $invoice->amount, 'refund', __('Invoice refund :ref', ['ref' => $invoice->reference]), $invoice->reference);

        $invoice->update(['status' => 'refunded', 'refunded_at' => Carbon::now()]);

        return $this->updatedResponse((new AdminInvoiceResource($invoice->fresh()))->resolve());
    }
}
