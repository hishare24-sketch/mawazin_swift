<?php

namespace Modules\Ai\Services;

use Modules\Ai\Entities\AiSetting;
use Modules\Ai\Services\Providers\ClaudeProvider;
use Modules\Ai\Services\Providers\LlmProvider;
use Modules\Ai\Services\Providers\OpenAiProvider;

/**
 * مصنع مزوّدات الذكاء — مصدر واحد لاختيار المزوّد الحيّ من إعدادات الذكاء.
 * يُعيد null حين لا يوجد مفتاح أو المزوّد محاكاة/غير معروف ⇒ يستخدم المستهلِك محاكاته الآمنة.
 *
 * claude → Anthropic · openai → OpenAI · custom → نقطة نهاية متوافقة مع OpenAI (عبر endpoint).
 */
class ProviderFactory
{
    public function for(AiSetting $ai): ?LlmProvider
    {
        if (! filled($ai->api_key)) {
            return null; // بلا مفتاح → محاكاة آمنة
        }

        return match ($ai->provider) {
            'claude' => new ClaudeProvider($ai),
            'openai' => new OpenAiProvider($ai),
            'custom' => new OpenAiProvider($ai),
            default => null, // simulation | مزوّد غير معروف
        };
    }
}
