<?php

namespace Modules\Ai\Services\Providers;

use Illuminate\Support\Facades\Http;
use Modules\Ai\Entities\AiSetting;

/**
 * وسيط خادميّ لواجهة Anthropic Messages — يحكمه إعداد الذكاء (المزوّد/النموذج/المفتاح/الحدّ).
 * أيّ فشل شبكيّ أو رفض أو استجابة فارغة يُرمى كاستثناء ليعود المنسّق للمحاكاة بأمان.
 *
 * ملاحظة نموذج Opus 4.8/4.7 وما يماثلها: معاملات المعاينة (temperature) مرفوضة (400)،
 * فلا تُرسَل إلّا لنماذج قديمة لا ترفضها.
 */
class ClaudeProvider implements LlmProvider
{
    private const DEFAULT_ENDPOINT = 'https://api.anthropic.com/v1/messages';

    private const DEFAULT_MODEL = 'claude-opus-4-8';

    private const API_VERSION = '2023-06-01';

    public function __construct(private readonly AiSetting $setting) {}

    public function generate(string $systemPrompt, string $userMessage, array $options = []): array
    {
        $model = $this->setting->model ?: self::DEFAULT_MODEL;
        $maxTokens = (int) ($options['maxTokens'] ?? $this->setting->max_tokens ?? 1024);
        $maxTokens = max(256, min(8192, $maxTokens));

        $body = [
            'model' => $model,
            'max_tokens' => $maxTokens,
            'system' => $systemPrompt,
            'messages' => [
                ['role' => 'user', 'content' => $userMessage],
            ],
        ];

        // temperature يُرفَض على عائلة 4.7/4.8/Sonnet 5/Fable 5 (400) — أرسِله فقط لنماذج لا ترفضه.
        if (! $this->rejectsSampling($model) && $this->setting->temperature !== null) {
            $body['temperature'] = (float) $this->setting->temperature;
        }

        $response = Http::withHeaders([
            'x-api-key' => (string) $this->setting->api_key,
            'anthropic-version' => self::API_VERSION,
            'content-type' => 'application/json',
        ])->timeout(30)->post($this->setting->endpoint ?: self::DEFAULT_ENDPOINT, $body);

        if (! $response->successful()) {
            throw new \RuntimeException('claude_http_'.$response->status());
        }

        $data = $response->json();

        // رفض المصنّفات — عُد للمحاكاة بردّ مفيد بدل رسالة رفض جافّة.
        if (($data['stop_reason'] ?? null) === 'refusal') {
            throw new \RuntimeException('claude_refusal');
        }

        $text = collect($data['content'] ?? [])
            ->where('type', 'text')
            ->pluck('text')
            ->implode('');

        if (trim($text) === '') {
            throw new \RuntimeException('claude_empty');
        }

        return [
            'text' => $text,
            'usage' => [
                'input' => (int) ($data['usage']['input_tokens'] ?? 0),
                'output' => (int) ($data['usage']['output_tokens'] ?? 0),
            ],
            'stopReason' => $data['stop_reason'] ?? null,
        ];
    }

    /** نماذج تُزيل معاملات المعاينة (temperature/top_p/top_k). */
    private function rejectsSampling(string $model): bool
    {
        return (bool) preg_match('/(opus-4-[678]|sonnet-5|fable-5|mythos-5)/i', $model);
    }
}
