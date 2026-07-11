<?php

namespace Modules\Audit\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Modules\Audit\Entities\AuditLog;
use Modules\Audit\Http\Resources\Admin\AuditLogResource;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AuditLogController extends Controller
{
    private const SORTABLE = ['id', 'action', 'resource', 'status', 'created_at'];

    /** سجلّ التدقيق — بحث + فلترة (فعل/مورد/طريقة/فاعل/مدى تاريخيّ) + فرز + ترقيم. */
    public function index(Request $request)
    {
        $this->authorize('view_audit');

        $query = $this->filtered($request);

        [$column, $dir] = $this->parseSort((string) $request->query('sort', '-id'), self::SORTABLE);
        $query->orderBy($column, $dir);

        $items = $query->paginate((int) $request->query('perPage', 20));
        $items->setCollection(
            $items->getCollection()->map(fn (AuditLog $l) => (new AuditLogResource($l))->resolve())
        );

        return $this->dashboardResponse($items);
    }

    /**
     * تصدير كامل السجلّ المطابق للفلاتر إلى CSV (لا يقتصر على الصفحة الحاليّة).
     * يُبثّ عبر cursor فلا يحمّل الذاكرة مهما كبر السجلّ.
     */
    public function export(Request $request): StreamedResponse
    {
        $this->authorize('view_audit');

        $query = $this->filtered($request)->orderByDesc('id');
        $filename = 'audit-logs-'.Carbon::now()->format('Ymd-His').'.csv';
        $columns = ['id', 'at', 'actor', 'actor_id', 'method', 'resource', 'action', 'path', 'target_id', 'status', 'ip', 'changes'];

        return response()->streamDownload(function () use ($query, $columns): void {
            $out = fopen('php://output', 'w');
            fprintf($out, "\xEF\xBB\xBF"); // BOM ليعرض Excel العربيّة صحيحًا
            fputcsv($out, $columns);
            foreach ($query->cursor() as $log) {
                fputcsv($out, [
                    $log->id,
                    optional($log->created_at)->toISOString(),
                    $log->actor_name ?? '—',
                    $log->actor_id,
                    $log->method,
                    $log->getAttribute('resource'),
                    $log->action,
                    $log->path,
                    $log->target_id,
                    (int) $log->status,
                    $log->ip,
                    $log->meta ? json_encode($log->meta, JSON_UNESCAPED_UNICODE) : '',
                ]);
            }
            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /** بانية الاستعلام المشتركة (index + export) — مصدر فلترة واحد. */
    private function filtered(Request $request): Builder
    {
        $query = AuditLog::query();

        if ($q = trim((string) $request->query('q', ''))) {
            $query->where(function ($sub) use ($q): void {
                $sub->where('actor_name', like_op(), "%{$q}%")->orWhere('path', like_op(), "%{$q}%");
            });
        }
        foreach (['action', 'resource', 'method'] as $filter) {
            if ($v = $request->query($filter)) {
                $query->where($filter, $v);
            }
        }
        if ($actor = $request->query('actorId')) {
            $query->where('actor_id', (int) $actor);
        }
        if ($from = $request->query('from')) {
            $query->where('created_at', '>=', Carbon::parse($from)->startOfDay());
        }
        if ($to = $request->query('to')) {
            $query->where('created_at', '<=', Carbon::parse($to)->endOfDay());
        }

        return $query;
    }

    /** إحصاءات — العدّ الكلّيّ/اليوم + التوزيع بالفعل والمورد + سلسلة 14 يومًا. */
    public function stats()
    {
        $this->authorize('view_audit');

        $total = AuditLog::count();
        $today = AuditLog::where('created_at', '>=', Carbon::now()->startOfDay())->count();

        $byAction = AuditLog::selectRaw('action, COUNT(*) as c')->groupBy('action')->pluck('c', 'action')
            ->map(fn ($c, $a) => ['label' => $a, 'value' => (int) $c])->values();
        $byResource = AuditLog::selectRaw('resource, COUNT(*) as c')->whereNotNull('resource')->groupBy('resource')->pluck('c', 'resource')
            ->map(fn ($c, $a) => ['label' => $a, 'value' => (int) $c])->values();

        $raw = AuditLog::where('created_at', '>=', Carbon::now()->subDays(13)->startOfDay())
            ->selectRaw('DATE(created_at) as d, COUNT(*) as c')->groupBy('d')->pluck('c', 'd');
        $series = [];
        for ($i = 13; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i)->toDateString();
            $series[] = ['date' => $date, 'value' => (int) ($raw[$date] ?? 0)];
        }

        return $this->dataResponse([
            'total' => $total,
            'today' => $today,
            'actors' => (int) AuditLog::distinct('actor_id')->count('actor_id'),
            'byAction' => $byAction,
            'byResource' => $byResource,
            'series' => $series,
        ]);
    }
}
