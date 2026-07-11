<?php

namespace Modules\Ai\Services;

use Illuminate\Support\Str;
use Modules\Ai\Entities\AiCapability;
use Modules\Ai\Entities\AiKnowledge;
use Modules\Ai\Entities\AiSetting;
use Modules\Ai\Entities\AssistantPreference;
use Modules\Chat\Entities\ChatSetting;

/**
 * دماغ المساعد الذكيّ للمستخدم — يجمع الحوكمة (من موديولَي Ai/Chat) + سياق المستخدم
 * (من بياناته هو فقط، احترامًا للخصوصيّة) + تأليف ردّ محكوم سياقيّ استباقيّ تحفيزيّ.
 */
class AssistantService
{
    /** حالة الحوكمة الحيّة كما تحكم المساعد. */
    public function governance(): array
    {
        $ai = AiSetting::current();
        $cap = AiCapability::where('key', 'chat_assistant')->first();
        $chat = ChatSetting::current();
        $capEnabled = $cap?->enabled ?? false;

        return [
            'aiEnabled' => $ai->enabled,
            'capabilityEnabled' => $capEnabled,
            'assistantEnabled' => $chat->assistant_enabled,
            'effectiveEnabled' => $ai->enabled && $capEnabled && $chat->assistant_enabled,
            'level' => (int) $ai->assistant_level,
            'provider' => $ai->provider,
            'model' => $ai->model,
        ];
    }

    /** سبب حجب المساعد (أو null إن كان متاحًا) — نصّ ودود للمستخدم. */
    public function blockedReason(): ?string
    {
        $g = $this->governance();
        if ($g['effectiveEnabled']) {
            return null;
        }

        return 'المساعد الذكيّ غير متاح حاليًّا. يمكنك التواصل مع الدعم البشريّ في أيّ وقت.';
    }

    /**
     * سياق المستخدم — من بياناته هو فقط (خصوصيّة بالتصميم).
     * إن أوقف المستخدم «استخدام بياناتي» يُبنى سياق عامّ بلا أرقام نشاطه.
     */
    public function context($user): array
    {
        $prefs = AssistantPreference::forUser($user->id);
        $persona = $this->persona($user);

        $ctx = [
            'name' => $user->name,
            'role' => $user->role,
            'kind' => $user->kind,
            'tier' => $user->tier,
            'persona' => $persona,
            'dataAccess' => $prefs->data_access,
            'proactive' => $prefs->proactive,
        ];

        if ($prefs->data_access) {
            $ctx['activity'] = $this->activity($user);
        }

        return $ctx;
    }

    /** شخصيّة المستخدم (بحسب النوع/الدور) — تحكم أسلوب المساعد والاقتراحات. */
    public function persona($user): string
    {
        if ($user->kind === 'organization') {
            return 'organization';
        }

        return match ($user->role) {
            'company' => 'organization',
            'interviewer' => 'interviewer',
            'coach', 'trainer', 'consultant' => 'expert',
            default => 'seeker',
        };
    }

    /** نشاط المستخدم من موديولاته (دفاعيّ — أيّ مصدر غائب = 0). */
    private function activity($user): array
    {
        return [
            'wallet' => $this->safe(fn () => (float) (\Modules\Account\Entities\Wallet::where('user_id', $user->id)->value('balance') ?? 0)),
            'opportunities' => $this->safe(fn () => (int) \Modules\Marketplace\Entities\Opportunity::where('user_id', $user->id)->count()),
            'applications' => $this->safe(fn () => (int) \Modules\Marketplace\Entities\Application::where('user_id', $user->id)->count()),
            'surveys' => $this->safe(fn () => (int) \Modules\Survey\Entities\Survey::where('user_id', $user->id)->count()),
        ];
    }

    private function safe(callable $fn): float|int
    {
        try {
            return $fn();
        } catch (\Throwable) {
            return 0;
        }
    }

    /** اقتراحات سريعة سياقيّة بحسب الشخصيّة. */
    public function suggestions(array $context): array
    {
        return match ($context['persona']) {
            'organization' => ['كيف أكتب وصفًا وظيفيًّا جذّابًا؟', 'أفضل ممارسات فرز المرشّحين', 'كيف أقيّم المتقدّمين بعدالة؟'],
            'interviewer' => ['كيف أزيد حجوزاتي؟', 'نصائح لتقييم احترافيّ', 'كيف أبني سمعتي كمقيّم؟'],
            'expert' => ['كيف أنمّي علامتي الشخصيّة؟', 'كيف أسعّر جلساتي؟', 'كيف أجذب عملاء جددًا؟'],
            default => ['حلّل فرصي الحاليّة', 'كيف أحسّن ملفّي؟', 'نصائح لمقابلتي القادمة'],
        };
    }

    /** تنبيهات استباقيّة تحفيزيّة مبنيّة على حالة المستخدم الفعليّة. */
    public function nudges(array $context): array
    {
        if (empty($context['proactive'])) {
            return [];
        }

        $a = $context['activity'] ?? null;
        $nudges = [];

        switch ($context['persona']) {
            case 'organization':
                if ($a && $a['opportunities'] === 0) {
                    $nudges[] = ['tone' => 'info', 'icon' => 'mdi-briefcase-plus-outline', 'text' => 'لم تنشر أيّ فرصة بعد — انشر أوّل فرصة لتصل إلى المرشّحين المناسبين.', 'action' => 'post-opportunity', 'actionLabel' => 'انشر فرصة'];
                } else {
                    $nudges[] = ['tone' => 'success', 'icon' => 'mdi-account-search-outline', 'text' => 'راجع المتقدّمين الجدد على فرصك — الاستجابة السريعة ترفع جودة التوظيف.', 'action' => null, 'actionLabel' => null];
                }
                break;
            case 'interviewer':
            case 'expert':
                $nudges[] = ['tone' => 'info', 'icon' => 'mdi-calendar-check-outline', 'text' => 'حدّث مواعيدك المتاحة وملفّك لزيادة الحجوزات وبناء سمعتك.', 'action' => null, 'actionLabel' => null];
                break;
            default:
                if ($a && $a['applications'] === 0) {
                    $nudges[] = ['tone' => 'warning', 'icon' => 'mdi-rocket-launch-outline', 'text' => 'لم تتقدّم لأيّ فرصة بعد — ابدأ الآن، كلّ تقديم يقرّبك من فرصتك.', 'action' => 'marketplace', 'actionLabel' => 'تصفّح الفرص'];
                } else {
                    $nudges[] = ['tone' => 'success', 'icon' => 'mdi-star-check-outline', 'text' => 'أكمِل مهاراتك ووثّقها لترتفع درجة مطابقتك وتظهر لأصحاب الفرص أوّلًا.', 'action' => 'profile', 'actionLabel' => 'حسّن ملفّي'];
                }
        }

        if (($context['tier'] ?? 'free') === 'free') {
            $nudges[] = ['tone' => 'accent', 'icon' => 'mdi-arrow-up-bold-circle-outline', 'text' => 'ترقية باقتك تفتح مزايا أوسع تسرّع تقدّمك على المنصّة.', 'action' => 'settings-plan', 'actionLabel' => 'استكشف الباقات'];
        }

        return $nudges;
    }

    /**
     * تأليف الردّ — محكوم بالمستوى، بشخصيّة حسب النوع، يحقن المعرفة، مبادر وتحفيزيّ.
     * محاكاة عربيّة (مزوّد simulation) — سياقيّ فعليًّا لأنّه يستند إلى دور المستخدم ونشاطه.
     */
    public function compose(string $message, array $context): array
    {
        $ai = AiSetting::current();
        $level = (int) $ai->assistant_level;
        $tokensCap = (int) ($ai->level_tokens[$level] ?? [1 => 600, 2 => 1200, 3 => 2400][$level] ?? 1200);
        $knowledge = AiKnowledge::where('enabled', true)->get(['title']);

        $roleWord = match ($context['persona']) {
            'organization' => 'كمنشأة توظيف',
            'interviewer' => 'كمقيّم',
            'expert' => 'كخبير',
            default => 'كباحث عن عمل',
        };

        $intro = 'أهلًا '.($context['name'] ?? '').'، بخصوص: «'.Str::limit($message, 120).'»';

        $core = match ($level) {
            1 => 'إجابة مباشرة '.$roleWord.': أرشدك لأنسب خطوة بناءً على حالتك، بلا إطالة.',
            3 => 'دعني أحلّل حالتك '.$roleWord.' بعمق: أنظر في نشاطك الحاليّ على المنصّة، وأرصد أهمّ فرصة '
                .'أو خطوة مؤثّرة لك، ثمّ أقترح مسارًا عمليًّا مرتّبًا بالأولويّة عبر أقسام المنصّة المناسبة، '
                .'وأختم بسؤال يقودك للخطوة التالية.',
            default => 'إجابة واضحة '.$roleWord.' مستندة إلى وضعك، مع خطوة استباقيّة واحدة تخدم هدفك على المنصّة.',
        };

        // لمسة سياقيّة من النشاط (إن سُمح باستخدام البيانات)
        $ctxLine = '';
        if (! empty($context['activity'])) {
            $a = $context['activity'];
            $ctxLine = match ($context['persona']) {
                'organization' => "\n\nملاحظة من وضعك: لديك {$a['opportunities']} فرصة منشورة.",
                'seeker' => "\n\nملاحظة من وضعك: قدّمت على {$a['applications']} فرصة حتى الآن.",
                default => '',
            };
        }

        // تنبيه استباقيّ + خاتمة تحفيزيّة
        $nudges = $this->nudges($context);
        $nudgeLine = $nudges ? "\n\n• ".$nudges[0]['text'] : '';
        $motivate = "\n\nأنا هنا لأساعدك خطوةً بخطوة — لنحقّق هدفك.";

        $kb = $knowledge->count() ? "\n\n(مسترشدًا بمعرفة المنصّة: ".$knowledge->pluck('title')->take(3)->join('، ').')' : '';

        $reply = $intro."\n\n".$core.$ctxLine.$nudgeLine.$kb.$motivate;

        return [
            'reply' => $reply,
            'meta' => [
                'level' => $level,
                'tokensCap' => $tokensCap,
                'provider' => $ai->provider,
                'model' => $ai->model,
                'simulated' => $ai->provider === 'simulation',
                'persona' => $context['persona'],
                'usedKnowledge' => $knowledge->pluck('title')->values()->all(),
                'nudges' => $nudges,
            ],
        ];
    }
}
