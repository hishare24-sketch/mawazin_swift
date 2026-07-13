<?php

namespace Modules\System\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Modules\Ai\Entities\AiSetting;
use Modules\Audit\Entities\AuditLog;
use Modules\User\Entities\User;

/**
 * صحّة النظام والمراقبة — فحوص حيّة فعليّة (لا أرقام ثابتة) لقاعدة البيانات والكاش
 * والطابور والبثّ ومزوّد الذكاء + مقاييس تشغيليّة وآخر الأخطاء من سجلّ التدقيق.
 */
class AdminSystemController extends Controller
{
    public function health()
    {
        $this->authorize('view_health');

        $services = [
            $this->checkDatabase(),
            $this->checkCache(),
            $this->checkQueue(),
            $this->checkBroadcast(),
            $this->checkAiProvider(),
        ];

        return $this->dataResponse([
            'services' => $services,
            'metrics' => $this->metrics(),
            'recentErrors' => $this->recentErrors(),
            'series' => $this->series(),
            'overall' => $this->overall($services),
        ]);
    }

    // ═══ الفحوص الحيّة ═══

    private function checkDatabase(): array
    {
        try {
            $start = microtime(true);
            DB::select('select 1');
            $ms = round((microtime(true) - $start) * 1000, 1);

            return $this->svc('database', 'قاعدة البيانات', $ms > 200 ? 'warn' : 'ok', "زمن الاستجابة {$ms}ms", $ms);
        } catch (\Throwable $e) {
            return $this->svc('database', 'قاعدة البيانات', 'down', mb_substr($e->getMessage(), 0, 80));
        }
    }

    private function checkCache(): array
    {
        try {
            $key = 'health:ping';
            Cache::put($key, '1', 5);
            $ok = Cache::get($key) === '1';

            return $this->svc('cache', 'التخزين المؤقّت', $ok ? 'ok' : 'warn', $ok ? 'قراءة/كتابة سليمة' : 'تعذّرت القراءة', null, config('cache.default'));
        } catch (\Throwable $e) {
            return $this->svc('cache', 'التخزين المؤقّت', 'down', mb_substr($e->getMessage(), 0, 80));
        }
    }

    private function checkQueue(): array
    {
        try {
            $pending = $this->tableCount('jobs');
            $failed = $this->tableCount('failed_jobs');
            $status = $failed > 0 ? 'warn' : 'ok';

            return $this->svc('queue', 'الطابور', $status, "قيد الانتظار {$pending} · فاشلة {$failed}", $pending, config('queue.default'));
        } catch (\Throwable $e) {
            return $this->svc('queue', 'الطابور', 'down', mb_substr($e->getMessage(), 0, 80));
        }
    }

    private function checkBroadcast(): array
    {
        $driver = config('broadcasting.default');
        $ok = in_array($driver, ['reverb', 'pusher', 'ably'], true);

        return $this->svc('broadcast', 'البثّ اللحظيّ', $ok ? 'ok' : 'warn', $ok ? "مُهيّأ ({$driver})" : "معطّل ({$driver})", null, $driver);
    }

    private function checkAiProvider(): array
    {
        try {
            $ai = AiSetting::current();
            if (! $ai->enabled) {
                return $this->svc('ai_provider', 'مزوّد الذكاء', 'warn', 'الذكاء متوقّف', null, $ai->provider);
            }
            if ($ai->provider === 'simulation') {
                return $this->svc('ai_provider', 'مزوّد الذكاء', 'ok', 'وضع المحاكاة', null, 'simulation');
            }
            $envKey = $ai->provider === 'openai' ? 'OPENAI_API_KEY' : 'ANTHROPIC_API_KEY';
            $hasKey = ! empty(env($envKey)) || ! empty($ai->api_key);

            return $this->svc('ai_provider', 'مزوّد الذكاء', $hasKey ? 'ok' : 'warn',
                $hasKey ? "{$ai->provider} · المفتاح مُهيّأ" : "{$ai->provider} · المفتاح غير مُهيّأ", null, $ai->provider);
        } catch (\Throwable $e) {
            return $this->svc('ai_provider', 'مزوّد الذكاء', 'down', mb_substr($e->getMessage(), 0, 80));
        }
    }

    // ═══ المقاييس والأخطاء ═══

    private function metrics(): array
    {
        $today = Carbon::now()->startOfDay();

        return [
            'users' => $this->safe(fn () => User::count()),
            'pendingJobs' => $this->tableCount('jobs'),
            'failedJobs' => $this->tableCount('failed_jobs'),
            'requestsToday' => $this->safe(fn () => AuditLog::where('created_at', '>=', $today)->count()),
            'errorsToday' => $this->safe(fn () => AuditLog::where('created_at', '>=', $today)->where('status', '>=', 400)->count()),
            'php' => PHP_VERSION,
            'laravel' => app()->version(),
            'env' => app()->environment(),
            'debug' => (bool) config('app.debug'),
        ];
    }

    private function recentErrors(): array
    {
        return $this->safe(fn () => AuditLog::where('status', '>=', 400)
            ->orderByDesc('id')->limit(10)->get()
            ->map(fn ($l) => [
                'at' => optional($l->created_at)->toISOString(),
                'action' => $l->action,
                'resource' => $l->getAttribute('resource'),
                'status' => (int) $l->status,
                'actor' => $l->actor_name,
            ])->all()) ?: [];
    }

    private function series(): array
    {
        $raw = $this->safe(fn () => AuditLog::where('created_at', '>=', Carbon::now()->subDays(13)->startOfDay())
            ->selectRaw('DATE(created_at) d, COUNT(*) total, SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) errors')
            ->groupBy('d')->get()->keyBy('d'));
        $series = [];
        for ($i = 13; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i)->toDateString();
            $row = is_object($raw) ? ($raw[$date] ?? null) : null;
            $series[] = ['date' => $date, 'value' => (int) ($row->total ?? 0), 'errors' => (int) ($row->errors ?? 0)];
        }

        return $series;
    }

    // ═══ مساعدات ═══

    private function svc(string $key, string $label, string $status, string $detail, ?float $metric = null, ?string $driver = null): array
    {
        return ['key' => $key, 'label' => $label, 'status' => $status, 'detail' => $detail, 'metric' => $metric, 'driver' => $driver];
    }

    private function overall(array $services): string
    {
        $statuses = array_column($services, 'status');
        if (in_array('down', $statuses, true)) {
            return 'down';
        }

        return in_array('warn', $statuses, true) ? 'warn' : 'ok';
    }

    private function tableCount(string $table): int
    {
        try {
            return (int) DB::table($table)->count();
        } catch (\Throwable) {
            return 0;
        }
    }

    private function safe(callable $fn)
    {
        try {
            return $fn();
        } catch (\Throwable) {
            return 0;
        }
    }
}
