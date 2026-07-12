<?php

namespace Modules\Marketplace\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Modules\Ai\Services\AiUsageService;
use Modules\Marketplace\Entities\Application;
use Modules\Marketplace\Entities\MatchSetting;
use Modules\Marketplace\Entities\Opportunity;
use Modules\Marketplace\Services\MatchService;
use Modules\Profile\Entities\Profile;

/**
 * المطابقة والفرز الذكيّ — قوائم مختصرة مرتّبة بدرجة الملاءمة، بأوزان قابلة للضبط
 * ومعزّزة بالذكاء (موصول بحوكمة الذكاء عبر قدرة candidate_matching).
 */
class AdminMatchController extends Controller
{
    public function __construct(
        private readonly MatchService $service,
        private readonly AiUsageService $usage,
    ) {}

    /** أوزان المطابقة + حالة تعزيز الذكاء الحيّة. */
    public function settings()
    {
        $this->authorize('view_matching');

        return $this->dataResponse([
            'settings' => $this->payload(MatchSetting::current()),
            'aiActive' => $this->service->aiActive(),
        ]);
    }

    /** ضبط الأوزان (جزئيّ). */
    public function updateSettings(Request $request)
    {
        $this->authorize('manage_matching');

        $data = $request->validate([
            'skills_weight' => ['sometimes', 'integer', 'min:0', 'max:100'],
            'experience_weight' => ['sometimes', 'integer', 'min:0', 'max:100'],
            'category_weight' => ['sometimes', 'integer', 'min:0', 'max:100'],
            'threshold' => ['sometimes', 'integer', 'min:0', 'max:100'],
            'ai_boost' => ['sometimes', 'boolean'],
        ]);

        $s = MatchSetting::current();
        $s->fill($data)->save();

        return $this->updatedResponse($this->payload($s->fresh()));
    }

    /** قائمة مختصرة مرتّبة بدرجة الملاءمة لمتقدّمي فرصة. */
    public function shortlist(Request $request)
    {
        $this->authorize('view_matching');

        $data = $request->validate(['opportunity_id' => ['required', 'integer']]);
        $opp = Opportunity::findOrFail($data['opportunity_id']);
        $weights = MatchSetting::current();
        $aiActive = $this->service->aiActive();

        $apps = Application::where('opportunity_id', $opp->id)->with('user:id,name,email')->get();
        $profiles = Profile::whereIn('user_id', $apps->pluck('user_id'))->get()->keyBy('user_id');

        $rows = $apps->map(function (Application $a) use ($opp, $weights, $aiActive, $profiles) {
            $scored = $this->service->score($profiles->get($a->user_id), $opp, $weights, $aiActive);

            return [
                'applicationId' => $a->id,
                'candidate' => $a->user?->name ?? '—',
                'stage' => $a->stage,
                'score' => $scored['score'],
                'breakdown' => $scored['breakdown'],
                'matchedSkills' => $scored['matchedSkills'],
            ];
        })->sortByDesc('score')->values();

        return $this->dataResponse([
            'opportunity' => ['id' => $opp->id, 'title' => $opp->title, 'company' => $opp->company, 'skills' => $opp->skills ?? []],
            'aiActive' => $aiActive,
            'threshold' => $weights->threshold,
            'shortlist' => $rows,
        ]);
    }

    /** تفسير ترشيح مرشّح واحد بالذكاء (عند الطلب) — درجة + حكم + أسباب + إشارات تحفّظ. */
    public function explain(Request $request)
    {
        $this->authorize('view_matching');

        $data = $request->validate([
            'opportunity_id' => ['required', 'integer'],
            'application_id' => ['required', 'integer'],
        ]);

        $opp = Opportunity::findOrFail($data['opportunity_id']);
        $app = Application::where('opportunity_id', $opp->id)->with('user:id,name')->findOrFail($data['application_id']);
        $profile = Profile::where('user_id', $app->user_id)->first();
        $weights = MatchSetting::current();

        $ex = $this->service->explain($profile, $opp, $weights, $this->service->aiActive());

        // تسجيل استهلاك التوكن عند التحليل الحيّ فقط (بأرقام المزوّد الحقيقيّة).
        if (($ex['live'] ?? false) && ($u = $request->user())) {
            $this->usage->record(
                $u,
                (int) data_get($ex, 'meta.usage.request', 0),
                (int) data_get($ex, 'meta.usage.response', 0),
                data_get($ex, 'meta.provider'),
                data_get($ex, 'meta.model'),
            );
        }

        return $this->dataResponse([
            'applicationId' => $app->id,
            'candidate' => $app->user?->name ?? '—',
            'live' => $ex['live'],
            'score' => $ex['score'],
            'verdict' => $ex['verdict'],
            'reasons' => $ex['reasons'],
            'redFlags' => $ex['redFlags'],
            'summary' => $ex['summary'],
            'matchedSkills' => $ex['matchedSkills'],
            'meta' => $ex['meta'],
        ]);
    }

    private function payload(MatchSetting $s): array
    {
        return [
            'skillsWeight' => $s->skills_weight,
            'experienceWeight' => $s->experience_weight,
            'categoryWeight' => $s->category_weight,
            'threshold' => $s->threshold,
            'aiBoost' => $s->ai_boost,
        ];
    }
}
