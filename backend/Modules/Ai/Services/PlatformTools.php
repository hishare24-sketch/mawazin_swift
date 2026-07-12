<?php

namespace Modules\Ai\Services;

use Modules\Account\Entities\Wallet;
use Modules\Marketplace\Entities\Application;
use Modules\Marketplace\Entities\MatchSetting;
use Modules\Marketplace\Entities\Opportunity;
use Modules\Marketplace\Services\MatchService;
use Modules\Profile\Entities\Profile;
use Modules\User\Entities\User;

/**
 * أدوات المساعد للوصول لبيانات المنصّة الحيّة (function-calling، للقراءة فقط).
 * كلّ أداة تُعرّف مخطّطًا (input_schema) وتُنفَّذ في سياق المستخدم الحاليّ، وأيّ فشل
 * يُلتقَط ويُعاد كـ {error} كي لا تنكسر حلقة الأدوات في المزوّد.
 *
 * خصوصيّة: الأدوات «الشخصيّة» (personal=true) تُتاح فقط حين يسمح المستخدم باستخدام
 * بياناته (data_access)؛ أمّا بحث الفرص العامّ فمتاح دائمًا.
 */
class PlatformTools
{
    /**
     * تعريفات الأدوات المتاحة للمزوّد.
     *
     * @param  bool  $allowPersonal  هل يُسمح بالأدوات التي تقرأ بيانات المستخدم الخاصّة؟
     */
    public function definitions(bool $allowPersonal = true): array
    {
        return collect($this->catalog())
            ->filter(fn ($t) => $allowPersonal || ! $t['personal'])
            ->map(fn ($t) => ['name' => $t['name'], 'description' => $t['description'], 'schema' => $t['schema']])
            ->values()->all();
    }

    /** ينفّذ أداة باسمها في سياق المستخدم — يعيد نتيجة قابلة للتسلسل أو {error}. */
    public function execute(string $name, array $input, User $user): array
    {
        try {
            return match ($name) {
                'get_my_applications' => $this->myApplications($user),
                'search_opportunities' => $this->searchOpportunities($input),
                'get_recommended_opportunities' => $this->recommendedOpportunities($user),
                'get_my_profile_status' => $this->myProfileStatus($user),
                'get_my_wallet' => $this->myWallet($user),
                default => ['error' => 'أداة غير معروفة: '.$name],
            };
        } catch (\Throwable $e) {
            return ['error' => 'تعذّر تنفيذ الأداة: '.$e->getMessage()];
        }
    }

    /** فهرس الأدوات (اسم/وصف/مخطّط/هل شخصيّة). */
    private function catalog(): array
    {
        $empty = ['type' => 'object', 'properties' => (object) [], 'additionalProperties' => false];

        return [
            [
                'name' => 'get_my_applications', 'personal' => true,
                'description' => 'تقديمات المستخدم على الفرص (العنوان، الشركة، المرحلة). استخدمه حين يسأل عن حالة تقديماته أو تقدّمه.',
                'schema' => $empty,
            ],
            [
                'name' => 'get_recommended_opportunities', 'personal' => true,
                'description' => 'أفضل الفرص المطابقة لملفّ المستخدم (لم يتقدّم لها بعد) بدرجة ملاءمة وأبرز المهارات المشتركة. استخدمه لاقتراح فرص مناسبة له بدقّة.',
                'schema' => $empty,
            ],
            [
                'name' => 'get_my_profile_status', 'personal' => true,
                'description' => 'حالة اكتمال ملفّ المستخدم (نبذة، مهارات، خبرات، شهادات، مهارات بانتظار الإثبات). استخدمه لتقديم نصيحة تحسين دقيقة.',
                'schema' => $empty,
            ],
            [
                'name' => 'get_my_wallet', 'personal' => true,
                'description' => 'رصيد محفظة المستخدم وباقته الحاليّة. استخدمه حين يسأل عن رصيده أو باقته.',
                'schema' => $empty,
            ],
            [
                'name' => 'search_opportunities', 'personal' => false,
                'description' => 'يبحث في الفرص المنشورة على المنصّة اختياريًّا بكلمة مفتاحيّة و/أو قطاع، ويعيد عناوينها وشركاتها وقطاعاتها.',
                'schema' => [
                    'type' => 'object',
                    'properties' => [
                        'keyword' => ['type' => 'string', 'description' => 'كلمة بحث في العنوان أو الشركة (اختياريّة)'],
                        'category' => ['type' => 'string', 'description' => 'كود القطاع لتصفية النتائج (اختياريّ)'],
                    ],
                    'additionalProperties' => false,
                ],
            ],
        ];
    }

    private function myApplications(User $user): array
    {
        $rows = Application::where('user_id', $user->id)
            ->with('opportunity:id,title,company')
            ->orderByDesc('id')->limit(20)->get();

        return [
            'count' => $rows->count(),
            'applications' => $rows->map(fn (Application $a) => [
                'opportunity' => $a->opportunity?->title ?? '—',
                'company' => $a->opportunity?->company,
                'stage' => $a->stage,
            ])->values()->all(),
        ];
    }

    private function searchOpportunities(array $input): array
    {
        $keyword = is_string($input['keyword'] ?? null) ? trim($input['keyword']) : '';
        $category = is_string($input['category'] ?? null) ? trim($input['category']) : '';

        $rows = Opportunity::query()
            ->when($keyword !== '', fn ($q) => $q->where(fn ($w) => $w->where('title', 'like', "%{$keyword}%")->orWhere('company', 'like', "%{$keyword}%")))
            ->when($category !== '', fn ($q) => $q->where('category', $category))
            ->orderByDesc('id')->limit(15)->get(['id', 'title', 'company', 'category']);

        return [
            'count' => $rows->count(),
            'opportunities' => $rows->map(fn (Opportunity $o) => [
                'title' => $o->title,
                'company' => $o->company,
                'category' => $o->category,
            ])->values()->all(),
        ];
    }

    /** أفضل الفرص المطابقة لملفّ المستخدم (heuristic) لم يتقدّم لها بعد. */
    private function recommendedOpportunities(User $user): array
    {
        $profile = Profile::where('user_id', $user->id)->first();
        if ($profile === null) {
            return ['count' => 0, 'opportunities' => [], 'note' => 'لا ملفّ مهنيّ بعد — أكمِل ملفّك لتظهر توصيات دقيقة.'];
        }

        $appliedIds = Application::where('user_id', $user->id)->pluck('opportunity_id')->all();
        $pool = Opportunity::where('user_id', '!=', $user->id)
            ->whereNotIn('id', $appliedIds)
            ->orderByDesc('id')->limit(40)->get();

        $weights = MatchSetting::current();
        $match = new MatchService;

        $ranked = $pool->map(function (Opportunity $o) use ($profile, $weights, $match) {
            $scored = $match->score($profile, $o, $weights, false); // heuristic ثابت (بلا تعزيز)

            return [
                'title' => $o->title,
                'company' => $o->company,
                'category' => $o->category,
                'matchScore' => $scored['score'],
                'sharedSkills' => array_slice($scored['matchedSkills'], 0, 4),
            ];
        })
            ->sortByDesc('matchScore')
            ->take(5)->values()->all();

        return ['count' => count($ranked), 'opportunities' => $ranked];
    }

    /** إشارات اكتمال الملفّ لتوجيه نصيحة دقيقة. */
    private function myProfileStatus(User $user): array
    {
        $p = Profile::where('user_id', $user->id)->first();
        if ($p === null) {
            return ['hasProfile' => false, 'note' => 'لا ملفّ مهنيّ بعد.'];
        }

        $skills = is_array($p->skills) ? $p->skills : [];
        $pending = collect(is_array($p->proof_requests) ? $p->proof_requests : [])->count();

        return [
            'hasProfile' => true,
            'hasHeadline' => filled($p->headline),
            'hasSummary' => filled($p->summary),
            'skillsCount' => count($skills),
            'experiencesCount' => is_array($p->experiences) ? count($p->experiences) : 0,
            'certificatesCount' => is_array($p->certificates) ? count($p->certificates) : 0,
            'pendingProofs' => $pending,
        ];
    }

    private function myWallet(User $user): array
    {
        $balance = (float) (Wallet::where('user_id', $user->id)->value('balance') ?? 0);

        return ['balance' => $balance, 'plan' => $user->tier ?? 'free'];
    }
}
