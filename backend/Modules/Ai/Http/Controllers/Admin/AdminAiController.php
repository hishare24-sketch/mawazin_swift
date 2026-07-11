<?php

namespace Modules\Ai\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Modules\Account\Entities\Plan;
use Modules\Ai\Entities\AiCapability;
use Modules\Ai\Entities\AiKnowledge;
use Modules\Ai\Entities\AiSetting;
use Modules\Ai\Entities\AiUsage;

class AdminAiController extends Controller
{
    private const QUOTA_FIELDS = ['maxTokensPerRequest', 'dailyTokens', 'weeklyTokens', 'monthlyTokens'];

    /** التهيئة الكاملة — الإعدادات + الأقسام + قاعدة المعرفة + حصص الباقات (مضمومة بالباقات). */
    public function config()
    {
        $this->authorize('view_ai');

        return $this->dataResponse([
            'settings' => $this->settingsPayload(AiSetting::current()),
            'capabilities' => $this->capabilitiesPayload(),
            'knowledge' => $this->knowledgePayload(),
            'planQuotas' => $this->planQuotasPayload(AiSetting::current()),
        ]);
    }

    /** تحديث الإعدادات العامّة (جزئيّ). */
    public function updateSettings(Request $request)
    {
        $this->authorize('manage_ai');

        $data = $request->validate([
            'enabled' => ['sometimes', 'boolean'],
            'provider' => ['sometimes', 'in:simulation,claude,openai,custom'],
            'model' => ['sometimes', 'nullable', 'string', 'max:120'],
            'api_key' => ['sometimes', 'nullable', 'string', 'max:255'],
            'endpoint' => ['sometimes', 'nullable', 'string', 'max:255'],
            'temperature' => ['sometimes', 'numeric', 'min:0', 'max:1'],
            'max_tokens' => ['sometimes', 'integer', 'min:256', 'max:8192'],
            'language' => ['sometimes', 'in:ar,en,auto'],
            'system_prompt' => ['sometimes', 'nullable', 'string', 'max:4000'],
            'assistant_level' => ['sometimes', 'integer', 'in:1,2,3'],
            'allow_user_level_override' => ['sometimes', 'boolean'],
            'level_tokens' => ['sometimes', 'array'],
        ]);

        $setting = AiSetting::current();
        $setting->fill($data)->save();

        return $this->updatedResponse($this->settingsPayload($setting->fresh()));
    }

    /** تحديث حصص التوكن لكلّ باقة + حدّ قراءة المستند. */
    public function updateQuotas(Request $request)
    {
        $this->authorize('manage_ai');

        $data = $request->validate([
            'doc_max_reads' => ['sometimes', 'integer', 'min:1', 'max:10'],
            'quotas' => ['sometimes', 'array'],
        ]);

        $setting = AiSetting::current();

        if (array_key_exists('quotas', $data)) {
            $clean = [];
            foreach ($data['quotas'] as $planKey => $q) {
                $row = [];
                foreach (self::QUOTA_FIELDS as $f) {
                    $row[$f] = max(0, (int) round((float) ($q[$f] ?? 0)));
                }
                $clean[$planKey] = $row;
            }
            $setting->plan_quotas = $clean;
        }
        if (array_key_exists('doc_max_reads', $data)) {
            $setting->doc_max_reads = $data['doc_max_reads'];
        }
        $setting->save();

        return $this->updatedResponse([
            'planQuotas' => $this->planQuotasPayload($setting->fresh()),
            'docMaxReads' => $setting->doc_max_reads,
        ]);
    }

    /** تبديل تفعيل قسم ذكاء. */
    public function toggleCapability(AiCapability $capability)
    {
        $this->authorize('manage_ai');

        $capability->update(['enabled' => ! $capability->enabled]);

        return $this->updatedResponse($this->capabilityRow($capability->fresh()));
    }

    /** إضافة مدخل معرفة. */
    public function storeKnowledge(Request $request)
    {
        $this->authorize('manage_ai');

        $data = $request->validate([
            'title' => ['required', 'string', 'max:160'],
            'content' => ['required', 'string', 'max:4000'],
            'tags' => ['sometimes', 'array'],
            'tags.*' => ['string', 'max:40'],
            'enabled' => ['sometimes', 'boolean'],
        ]);

        $entry = AiKnowledge::create([
            'title' => $data['title'],
            'content' => $data['content'],
            'tags' => $data['tags'] ?? [],
            'enabled' => $data['enabled'] ?? true,
        ]);

        return $this->createdResponse($this->knowledgeRow($entry));
    }

    /** تعديل مدخل معرفة. */
    public function updateKnowledge(Request $request, AiKnowledge $knowledge)
    {
        $this->authorize('manage_ai');

        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:160'],
            'content' => ['sometimes', 'string', 'max:4000'],
            'tags' => ['sometimes', 'array'],
            'tags.*' => ['string', 'max:40'],
            'enabled' => ['sometimes', 'boolean'],
        ]);

        $knowledge->update($data);

        return $this->updatedResponse($this->knowledgeRow($knowledge->fresh()));
    }

    /** حذف مدخل معرفة. */
    public function destroyKnowledge(AiKnowledge $knowledge)
    {
        $this->authorize('manage_ai');

        $knowledge->delete();

        return $this->updatedResponse();
    }

    /** إحصاءات — للوحة الشريط العلويّ (بطاقات + رسم). */
    public function stats()
    {
        $this->authorize('view_ai');

        $setting = AiSetting::current();
        $caps = AiCapability::query()->get();
        $knowledge = AiKnowledge::query()->get();
        $quotas = $this->planQuotasPayload($setting);

        // توزيع الحدّ الشهريّ للتوكن لكلّ باقة (للرسم الدائريّ) — 0 = بلا حدّ فيُستبعَد.
        $distribution = collect($quotas)
            ->filter(fn ($q) => ($q['monthlyTokens'] ?? 0) > 0)
            ->map(fn ($q) => ['label' => $q['name'], 'value' => (int) $q['monthlyTokens']])
            ->values();

        // استهلاك التوكن الفعليّ (إنفاذ الحصص) — اليوم/الشهر + مستخدمون نشطون.
        $startOfDay = Carbon::now()->startOfDay();
        $startOfMonth = Carbon::now()->startOfMonth();

        return $this->dataResponse([
            'enabled' => $setting->enabled,
            'provider' => $setting->provider,
            'model' => $setting->model,
            'capabilitiesTotal' => $caps->count(),
            'capabilitiesEnabled' => $caps->where('enabled', true)->count(),
            'knowledgeTotal' => $knowledge->count(),
            'knowledgeActive' => $knowledge->where('enabled', true)->count(),
            'plansConfigured' => count($quotas),
            'assistantLevel' => $setting->assistant_level,
            'distribution' => $distribution,
            'usageToday' => (int) AiUsage::where('created_at', '>=', $startOfDay)->sum('tokens'),
            'usageMonth' => (int) AiUsage::where('created_at', '>=', $startOfMonth)->sum('tokens'),
            'usageUsers' => (int) AiUsage::where('created_at', '>=', $startOfMonth)->distinct('user_id')->count('user_id'),
        ]);
    }

    // ═══ مساعدات التسلسل ═══

    private function settingsPayload(AiSetting $s): array
    {
        return [
            'enabled' => $s->enabled,
            'provider' => $s->provider,
            'model' => $s->model,
            'apiKey' => $s->api_key,
            'endpoint' => $s->endpoint,
            'temperature' => (float) $s->temperature,
            'maxTokens' => $s->max_tokens,
            'language' => $s->language,
            'systemPrompt' => $s->system_prompt,
            'assistantLevel' => $s->assistant_level,
            'allowUserLevelOverride' => $s->allow_user_level_override,
            'docMaxReads' => $s->doc_max_reads,
            'levelTokens' => $s->level_tokens ?? ['1' => 600, '2' => 1200, '3' => 2400],
        ];
    }

    private function capabilitiesPayload()
    {
        return AiCapability::query()->orderBy('sort')->get()->map(fn (AiCapability $c) => $this->capabilityRow($c))->values();
    }

    private function capabilityRow(AiCapability $c): array
    {
        return ['id' => $c->id, 'key' => $c->key, 'label' => $c->label, 'icon' => $c->icon, 'hint' => $c->hint, 'enabled' => $c->enabled];
    }

    private function knowledgePayload()
    {
        return AiKnowledge::query()->orderByDesc('id')->get()->map(fn (AiKnowledge $k) => $this->knowledgeRow($k))->values();
    }

    private function knowledgeRow(AiKnowledge $k): array
    {
        return ['id' => $k->id, 'title' => $k->title, 'content' => $k->content, 'tags' => $k->tags ?? [], 'enabled' => $k->enabled];
    }

    /** حصص الباقات مضمومة بجدول الباقات (كلّ باقة مرئيّة لها صفّ، بقيمها الحاليّة أو الصفر). */
    private function planQuotasPayload(AiSetting $s): array
    {
        $plans = Plan::query()->where('active', true)->orderBy('sort')->get(['key', 'name']);

        // fallback حين لا باقات مبذورة — الباقات الثلاث المعياريّة.
        if ($plans->isEmpty()) {
            $plans = collect([
                (object) ['key' => 'free', 'name' => 'الأساسيّة'],
                (object) ['key' => 'pro', 'name' => 'الاحترافيّة'],
                (object) ['key' => 'elite', 'name' => 'النخبة'],
            ]);
        }

        return $plans->map(fn ($p) => array_merge(
            ['key' => $p->key, 'name' => $p->name],
            $s->quotaFor($p->key)
        ))->values()->all();
    }
}
