<?php

namespace Modules\Ai\Services;

use Illuminate\Support\Carbon;
use Modules\Ai\Entities\AiSetting;
use Modules\Ai\Entities\AiUsage;

/**
 * إنفاذ حصص توكن المساعد لكلّ باقة — تقدير + قياس نوافذ (يوميّ/أسبوعيّ/شهريّ) + تسجيل.
 * الحصّة 0 = بلا حدّ (فيبقى المساعد متاحًا حين لا تهيئة حصص).
 */
class AiUsageService
{
    /** تقدير توكن تقريبيّ (~4 محارف للتوكن، عربيّ/إنجليزيّ)، بحدّ أدنى 1. */
    public function estimate(?string $text): int
    {
        return max(1, (int) ceil(mb_strlen(trim((string) $text)) / 4));
    }

    /** حصّة باقة المستخدم (من إعدادات الذكاء). */
    public function quota($user): array
    {
        return AiSetting::current()->quotaFor($user->tier ?? 'free');
    }

    /** استهلاك المستخدم عبر النوافذ الثلاث. */
    public function usage($user): array
    {
        $now = Carbon::now();
        $sum = fn (Carbon $from): int => (int) AiUsage::where('user_id', $user->id)
            ->where('created_at', '>=', $from)->sum('tokens');

        return [
            'daily' => $sum($now->copy()->startOfDay()),
            'weekly' => $sum($now->copy()->startOfWeek()),
            'monthly' => $sum($now->copy()->startOfMonth()),
        ];
    }

    /**
     * فحص السماح قبل التأليف — يعيد سبب الحجب (مصفوفة) أو null إن كان مسموحًا.
     * يراعي حدّ الطلب الواحد ثمّ النوافذ الزمنيّة الثلاث.
     */
    public function check($user, int $requestEstimate): ?array
    {
        $quota = $this->quota($user);

        $perRequest = (int) ($quota['maxTokensPerRequest'] ?? 0);
        if ($perRequest > 0 && $requestEstimate > $perRequest) {
            return [
                'kind' => 'perRequest',
                'reason' => "طلبك أطول من الحدّ الأقصى للطلب الواحد في باقتك ({$perRequest} توكن). حاول تقصير رسالتك أو ترقية باقتك.",
            ];
        }

        $usage = $this->usage($user);
        foreach ([['daily', 'dailyTokens', 'اليوميّ'], ['weekly', 'weeklyTokens', 'الأسبوعيّ'], ['monthly', 'monthlyTokens', 'الشهريّ']] as [$window, $key, $label]) {
            $limit = (int) ($quota[$key] ?? 0);
            if ($limit > 0 && ($usage[$window] + $requestEstimate) > $limit) {
                return [
                    'kind' => $window,
                    'reason' => "بلغت حدّ استخدامك {$label} من المساعد الذكيّ في باقتك. يمكنك ترقية باقتك أو التواصل مع الدعم البشريّ في أيّ وقت.",
                ];
            }
        }

        return null;
    }

    /** تسجيل استهلاك تبادل واحد. */
    public function record($user, int $requestTokens, int $responseTokens, ?string $provider = null, ?string $model = null): void
    {
        AiUsage::create([
            'user_id' => $user->id,
            'tokens' => $requestTokens + $responseTokens,
            'request_tokens' => $requestTokens,
            'response_tokens' => $responseTokens,
            'provider' => $provider,
            'model' => $model,
        ]);
    }

    /** لقطة الحصّة + المتبقّي — للعرض الشفّاف في مركز المساعدة. */
    public function snapshot($user): array
    {
        $quota = $this->quota($user);
        $usage = $this->usage($user);
        $remaining = function (string $key, string $window) use ($quota, $usage): ?int {
            $limit = (int) ($quota[$key] ?? 0);

            return $limit > 0 ? max(0, $limit - $usage[$window]) : null; // null = بلا حدّ
        };

        return [
            'tier' => $user->tier ?? 'free',
            'used' => $usage,
            'limits' => [
                'daily' => (int) ($quota['dailyTokens'] ?? 0),
                'weekly' => (int) ($quota['weeklyTokens'] ?? 0),
                'monthly' => (int) ($quota['monthlyTokens'] ?? 0),
                'perRequest' => (int) ($quota['maxTokensPerRequest'] ?? 0),
            ],
            'remaining' => [
                'daily' => $remaining('dailyTokens', 'daily'),
                'weekly' => $remaining('weeklyTokens', 'weekly'),
                'monthly' => $remaining('monthlyTokens', 'monthly'),
            ],
        ];
    }
}
