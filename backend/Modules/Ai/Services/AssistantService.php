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
     * تأليف الردّ — يفوّض لمزوّد حيّ (Claude) حين يكون مهيّأً بمفتاح، وإلّا محاكاة محكومة.
     * أيّ فشل للمزوّد يعود للمحاكاة بأمان (fallback) مع وسم meta.
     */
    public function compose(string $message, array $context): array
    {
        $ai = AiSetting::current();
        $provider = $this->providerFor($ai);

        if ($provider !== null) {
            try {
                $result = $provider->generate($this->systemPrompt($ai, $context), $message);

                return $this->composeFromProvider($result, $ai, $context);
            } catch (\Throwable $e) {
                // مزوّد حيّ فشل/رفض → محاكاة آمنة موسومة (لا ينقطع المساعد على المستخدم).
                $sim = $this->simulate($message, $context, $ai);
                $sim['meta']['fallback'] = true;
                $sim['meta']['fallbackReason'] = $e->getMessage();

                return $sim;
            }
        }

        return $this->simulate($message, $context, $ai);
    }

    /** يختار مزوّدًا حيًّا حين المفتاح مهيّأ، وإلّا null (محاكاة). */
    private function providerFor(AiSetting $ai): ?\Modules\Ai\Services\Providers\LlmProvider
    {
        if ($ai->provider === 'claude' && filled($ai->api_key)) {
            return new \Modules\Ai\Services\Providers\ClaudeProvider($ai);
        }

        return null; // simulation | مزوّد غير مهيّأ
    }

    /** يبني توجيه النظام من الحوكمة + الشخصيّة + المعرفة المفعّلة + سياق النشاط. */
    private function systemPrompt(AiSetting $ai, array $context): string
    {
        $level = (int) $ai->assistant_level;
        $depth = match ($level) {
            1 => 'أجب بإيجاز ومباشرة، خطوة عمليّة واحدة.',
            3 => 'حلّل حالة المستخدم بعمق، ورتّب مسارًا عمليًّا بالأولويّة عبر أقسام المنصّة، واختم بسؤال يقوده للخطوة التالية.',
            default => 'أجب بوضوح مع خطوة استباقيّة واحدة تخدم هدف المستخدم.',
        };

        $roleWord = match ($context['persona']) {
            'organization' => 'منشأة توظيف',
            'interviewer' => 'مقيّم',
            'expert' => 'خبير',
            default => 'باحث عن عمل',
        };

        $lines = [
            'أنت مساعد ذكيّ لمنصّة توظيف عربيّة. تخاطب مستخدمًا دوره: '.$roleWord.'.',
            $depth,
            'احترم خصوصيّة المستخدم ولا تفترض بيانات لم تُعطَ لك. كن مبادرًا وتحفيزيًّا وعمليًّا.',
        ];

        if (filled($ai->system_prompt)) {
            $lines[] = trim($ai->system_prompt);
        }

        if (! empty($context['activity'])) {
            $a = $context['activity'];
            $lines[] = "سياق المستخدم: تقديمات={$a['applications']}، فرص={$a['opportunities']}، استبيانات={$a['surveys']}.";
        }

        $knowledge = AiKnowledge::where('enabled', true)->get(['title', 'content']);
        if ($knowledge->count()) {
            $kb = $knowledge->map(fn ($k) => "- {$k->title}: ".Str::limit($k->content, 300))->implode("\n");
            $lines[] = "استرشد بمعرفة المنصّة التالية:\n".$kb;
        }

        return implode("\n\n", $lines);
    }

    /** يشكّل ردّ المزوّد الحيّ في بنية meta الموحّدة (بأرقام توكن حقيقيّة). */
    private function composeFromProvider(array $result, AiSetting $ai, array $context): array
    {
        $nudges = $this->nudges($context);
        $knowledge = AiKnowledge::where('enabled', true)->pluck('title')->values()->all();

        return [
            'reply' => $result['text'],
            'meta' => [
                'level' => (int) $ai->assistant_level,
                'provider' => $ai->provider,
                'model' => $ai->model,
                'simulated' => false,
                'persona' => $context['persona'],
                'usedKnowledge' => $knowledge,
                'nudges' => $nudges,
                'usage' => [
                    'request' => (int) ($result['usage']['input'] ?? 0),
                    'response' => (int) ($result['usage']['output'] ?? 0),
                ],
            ],
        ];
    }

    /**
     * محاكاة عربيّة محكومة — سياقيّة فعليًّا (دور المستخدم ونشاطه)، مبادرة تحفيزيّة.
     */
    public function simulate(string $message, array $context, AiSetting $ai): array
    {
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
