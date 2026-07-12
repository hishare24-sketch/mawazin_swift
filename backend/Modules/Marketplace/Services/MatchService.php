<?php

namespace Modules\Marketplace\Services;

use Modules\Ai\Entities\AiCapability;
use Modules\Ai\Entities\AiSetting;
use Modules\Ai\Services\ProviderFactory;
use Modules\Marketplace\Entities\MatchSetting;
use Modules\Marketplace\Entities\Opportunity;
use Modules\Profile\Entities\Profile;

/**
 * محرّك المطابقة والفرز — يسجّل ملاءمة مرشّح⟷فرصة بأوزان قابلة للضبط،
 * ويُعزَّز بالذكاء حين تُفعَّل قدرة candidate_matching (موصول بحوكمة الذكاء).
 */
class MatchService
{
    /** هل تعزيز الذكاء مفعّل فعليًّا (حوكمة الذكاء + قدرة المطابقة)؟ */
    public function aiActive(): bool
    {
        $ai = AiSetting::current();
        $cap = AiCapability::where('key', 'candidate_matching')->first();

        return $ai->enabled && ($cap?->enabled ?? false);
    }

    /** درجة ملاءمة مرشّح (ملفّه) لفرصة + تفصيل. */
    public function score(?Profile $profile, Opportunity $opp, MatchSetting $w, bool $aiActive): array
    {
        $candSkills = $this->skillNames($profile?->skills);
        $oppSkills = $this->skillNames($opp->skills);
        $matched = array_values(array_intersect($candSkills, $oppSkills));
        $skillMatch = count($oppSkills) ? count($matched) / count($oppSkills) : 0;

        $expCount = is_array($profile?->experiences) ? count($profile->experiences) : 0;
        $expMatch = min(1, $expCount / 3);

        $interested = data_get($profile?->prefs, 'interestedSectors', []);
        $catMatch = (is_array($interested) && in_array($opp->category, $interested, true)) ? 1 : 0;

        $sum = max(1, $w->skills_weight + $w->experience_weight + $w->category_weight);
        $base = ($skillMatch * $w->skills_weight + $expMatch * $w->experience_weight + $catMatch * $w->category_weight) / $sum * 100;

        $boosted = $aiActive && $w->ai_boost;
        $score = $boosted ? min(100, $base * 1.1) : $base;

        return [
            'score' => round($score, 1),
            'breakdown' => [
                'skills' => (int) round($skillMatch * 100),
                'experience' => (int) round($expMatch * 100),
                'category' => $catMatch * 100,
                'aiBoost' => $boosted,
            ],
            'matchedSkills' => array_map(fn ($s) => $s, $matched),
        ];
    }

    /** تطبيع المهارات إلى مجموعة نصوص صغيرة (يقبل نصوصًا أو كائنات {name}). */
    private function skillNames($skills): array
    {
        if (! is_array($skills)) {
            return [];
        }

        return collect($skills)
            ->map(fn ($s) => is_array($s) ? ($s['name'] ?? '') : (string) $s)
            ->filter()
            ->map(fn ($s) => mb_strtolower(trim($s)))
            ->unique()->values()->all();
    }

    // ═══════════════════ تفسير الترشيح بالذكاء (LLM) ═══════════════════

    /**
     * تقييم مرشّح مقابل فرصة مع شرح مبرَّر — يفوّض لمزوّد حيّ (Claude/OpenAI) حين يُهيّأ بمفتاح
     * وتُفعَّل قدرة candidate_matching، وإلّا شرح heuristic حقيقيّ مبنيّ من البيانات (يعمل بلا مفتاح).
     * أيّ فشل/رفض للمزوّد يعود بأمان للشرح الاستدلاليّ موسومًا (fallback) — لا ينكسر الفرز.
     *
     * @return array{live:bool, score:float, verdict:string, reasons:array, redFlags:array, summary:string, breakdown:array, matchedSkills:array, meta:array}
     */
    public function explain(?Profile $profile, Opportunity $opp, MatchSetting $w, bool $aiActive): array
    {
        $base = $this->score($profile, $opp, $w, $aiActive); // أساس استدلاليّ دائم (يُستعمل كـ fallback)
        $ai = AiSetting::current();
        $provider = $aiActive ? (new ProviderFactory)->for($ai) : null;

        if ($provider === null) {
            return $this->heuristicExplain($base, $profile, $opp, ['simulated' => true]);
        }

        try {
            $result = $provider->generate($this->explainSystemPrompt(), $this->candidateContext($profile, $opp));
            $parsed = $this->parseJsonObject($result['text']);
            if ($parsed === null) {
                throw new \RuntimeException('match_parse');
            }

            return $this->normalizeExplain($parsed, $base, [
                'simulated' => false,
                'provider' => $ai->provider,
                'model' => $ai->model,
                'usage' => [
                    'request' => (int) ($result['usage']['input'] ?? 0),
                    'response' => (int) ($result['usage']['output'] ?? 0),
                ],
            ]);
        } catch (\Throwable $e) {
            return $this->heuristicExplain($base, $profile, $opp, ['simulated' => true, 'fallback' => true, 'fallbackReason' => $e->getMessage()]);
        }
    }

    /** توجيه النظام لمُقيّم الترشيح — يفرض مخرَج JSON منظّمًا. */
    private function explainSystemPrompt(): string
    {
        return 'أنت خبير توظيف تقنيّ محايد. قيّم ملاءمة المرشّح للفرصة استنادًا إلى مهاراته وخبراته ومجاله فقط. '
            .'لا تختلق مهارات أو خبرات غير مذكورة، وعُدّ نقص البيانات مؤشّرًا للحذر لا سببًا للرفض القاطع. '
            .'أعِد JSON صالحًا فقط بلا أيّ نصّ إضافيّ بالشكل: '
            .'{"score":عدد 0..100,"verdict":"حكم موجز (كلمتان/ثلاث)","reasons":["سبب داعم","..."],"redFlags":["إشارة تحفّظ","..."],"summary":"جملة أو جملتان تلخّصان القرار"}. '
            .'اجعل reasons وredFlags قائمتين من عبارات عربيّة قصيرة (0..5 لكلّ منهما)، وقد تكون redFlags فارغة إن لم توجد تحفّظات.';
    }

    /** يبني سياقًا نصّيًّا مضغوطًا للمرشّح والفرصة (بلا اختلاق). */
    private function candidateContext(?Profile $profile, Opportunity $opp): string
    {
        $candSkills = $this->skillNames($profile?->skills);
        $exps = collect(is_array($profile?->experiences) ? $profile->experiences : [])
            ->map(function ($e) {
                if (! is_array($e)) {
                    return null;
                }
                $title = $e['title'] ?? $e['t'] ?? null;
                $org = $e['org'] ?? null;
                $years = $e['years'] ?? null;

                return $title ? trim($title.($org ? " — {$org}" : '').($years ? " ({$years} سنة)" : '')) : null;
            })
            ->filter()->take(8)->values()->all();
        $interested = data_get($profile?->prefs, 'interestedSectors', []);

        $lines = [
            'الفرصة: '.$opp->title.($opp->company ? ' — '.$opp->company : ''),
            'قطاع الفرصة: '.($opp->category ?? '—'),
            'المهارات المطلوبة: '.(count($this->skillNames($opp->skills)) ? implode('، ', $this->skillNames($opp->skills)) : '—'),
            '—',
            'مهارات المرشّح: '.(count($candSkills) ? implode('، ', $candSkills) : 'لا مهارات مُسجّلة'),
            'خبرات المرشّح: '.(count($exps) ? implode(' | ', $exps) : 'لا خبرات مُسجّلة'),
            'قطاعات اهتمام المرشّح: '.(is_array($interested) && count($interested) ? implode('، ', $interested) : '—'),
        ];

        return implode("\n", $lines);
    }

    /** يطبّع مخرَج المزوّد الحيّ إلى بنية شرح ثابتة (يحصر الأنواع والحدود). */
    private function normalizeExplain(array $raw, array $base, array $meta): array
    {
        $list = fn ($v) => collect(is_array($v) ? $v : [])
            ->filter(fn ($s) => is_string($s) && trim($s) !== '')
            ->map(fn ($s) => trim($s))->take(5)->values()->all();

        $score = is_numeric($raw['score'] ?? null) ? (float) $raw['score'] : $base['score'];
        $score = round(max(0, min(100, $score)), 1);
        $verdict = is_string($raw['verdict'] ?? null) && trim($raw['verdict']) !== '' ? trim($raw['verdict']) : $this->verdictFor($score);
        $summary = is_string($raw['summary'] ?? null) ? trim($raw['summary']) : '';

        return [
            'live' => true,
            'score' => $score,
            'verdict' => $verdict,
            'reasons' => $list($raw['reasons'] ?? []),
            'redFlags' => $list($raw['redFlags'] ?? []),
            'summary' => $summary,
            'breakdown' => $base['breakdown'],
            'matchedSkills' => $base['matchedSkills'],
            'meta' => $meta,
        ];
    }

    /** شرح استدلاليّ حقيقيّ من البيانات — يعمل بلا مزوّد حيّ (fallback أو بلا مفتاح). */
    private function heuristicExplain(array $base, ?Profile $profile, Opportunity $opp, array $meta): array
    {
        $b = $base['breakdown'];
        $matched = $base['matchedSkills'];
        $oppSkills = $this->skillNames($opp->skills);
        $missing = array_values(array_diff($oppSkills, $this->skillNames($profile?->skills)));

        $reasons = [];
        if (count($matched)) {
            $reasons[] = 'تطابق '.count($matched).' من '.max(count($oppSkills), 1).' مهارة مطلوبة: '.implode('، ', array_slice($matched, 0, 4)).'.';
        }
        if (($b['experience'] ?? 0) >= 67) {
            $reasons[] = 'خبرة عمليّة كافية مُسجّلة على الملف.';
        }
        if (($b['category'] ?? 0) >= 100) {
            $reasons[] = 'قطاع اهتمام المرشّح يطابق قطاع الفرصة.';
        }

        $redFlags = [];
        if (count($missing)) {
            $redFlags[] = 'مهارات مطلوبة غير مُسجّلة: '.implode('، ', array_slice($missing, 0, 4)).'.';
        }
        if (($b['experience'] ?? 0) < 34) {
            $redFlags[] = 'خبرات مُسجّلة محدودة أو غائبة.';
        }
        if (($b['category'] ?? 0) < 100) {
            $redFlags[] = 'قطاع الفرصة ليس ضمن قطاعات اهتمام المرشّح المُعلَنة.';
        }

        $score = (float) $base['score'];

        return [
            'live' => false,
            'score' => $score,
            'verdict' => $this->verdictFor($score),
            'reasons' => $reasons,
            'redFlags' => $redFlags,
            'summary' => 'تقييم استدلاليّ مبنيّ على تطابق المهارات والخبرة والقطاع (بلا تحليل لغويّ حيّ).',
            'breakdown' => $b,
            'matchedSkills' => $matched,
            'meta' => $meta,
        ];
    }

    private function verdictFor(float $score): string
    {
        return $score >= 75 ? 'ملاءمة قويّة' : ($score >= 50 ? 'ملاءمة متوسّطة' : 'ملاءمة ضعيفة');
    }

    /** يستخرج أوّل كائن JSON من نصّ المزوّد (يتحمّل أسوار الشيفرة ونصًّا محيطًا). */
    private function parseJsonObject(string $text): ?array
    {
        $start = strpos($text, '{');
        $end = strrpos($text, '}');
        if ($start === false || $end === false || $end <= $start) {
            return null;
        }
        $data = json_decode(substr($text, $start, $end - $start + 1), true);

        return is_array($data) ? $data : null;
    }
}
