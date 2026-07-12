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
class ClaudeProvider implements LlmProvider, ToolCallingProvider
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
            'messages' => array_merge(
                $options['history'] ?? [], // أدوار سابقة {role,content} (ذاكرة المحادثة)
                [['role' => 'user', 'content' => $userMessage]],
            ),
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

    /**
     * محادثة مع أدوات (function-calling، جولة واحدة يديرها المنسّق):
     * يرسل messages كاملة + tools، ويعيد إمّا نصًّا نهائيًّا أو طلبات أدوات (tool_use)
     * مع محتوى المساعد الخام لإلحاقه بالمحادثة عند تنفيذ الأدوات.
     *
     * @param  array  $messages  أدوار المحادثة (بما فيها كتل tool_result عند العودة)
     * @param  array  $tools  [{name, description, schema}]
     * @return array{stopReason:?string, text:string, toolUses:array, assistant:array, usage:array}
     */
    public function chatWithTools(string $systemPrompt, array $messages, array $tools, array $options = []): array
    {
        $model = $this->setting->model ?: self::DEFAULT_MODEL;
        $maxTokens = max(256, min(8192, (int) ($options['maxTokens'] ?? $this->setting->max_tokens ?? 1024)));

        $body = [
            'model' => $model,
            'max_tokens' => $maxTokens,
            'system' => $systemPrompt,
            'messages' => $messages,
            'tools' => array_map(fn ($t) => [
                'name' => $t['name'],
                'description' => $t['description'],
                'input_schema' => $t['schema'],
            ], $tools),
        ];

        if (! $this->rejectsSampling($model) && $this->setting->temperature !== null) {
            $body['temperature'] = (float) $this->setting->temperature;
        }

        $response = Http::withHeaders([
            'x-api-key' => (string) $this->setting->api_key,
            'anthropic-version' => self::API_VERSION,
            'content-type' => 'application/json',
        ])->timeout(40)->post($this->setting->endpoint ?: self::DEFAULT_ENDPOINT, $body);

        if (! $response->successful()) {
            throw new \RuntimeException('claude_http_'.$response->status());
        }

        $data = $response->json();
        if (($data['stop_reason'] ?? null) === 'refusal') {
            throw new \RuntimeException('claude_refusal');
        }

        $content = $data['content'] ?? [];
        $toolUses = collect($content)
            ->where('type', 'tool_use')
            ->map(fn ($b) => ['id' => $b['id'] ?? '', 'name' => $b['name'] ?? '', 'input' => is_array($b['input'] ?? null) ? $b['input'] : []])
            ->values()->all();
        $text = collect($content)->where('type', 'text')->pluck('text')->implode('');

        return [
            'stopReason' => $data['stop_reason'] ?? null,
            'text' => $text,
            'toolUses' => $toolUses,
            'assistant' => $content,
            'usage' => [
                'input' => (int) ($data['usage']['input_tokens'] ?? 0),
                'output' => (int) ($data['usage']['output_tokens'] ?? 0),
            ],
        ];
    }

    /** يشكّل دور المساعد (كتل tool_use) + نتائج الأدوات (كتل tool_result) بلغة Anthropic. */
    public function formatToolResultTurn(mixed $assistant, array $toolResults): array
    {
        return [
            ['role' => 'assistant', 'content' => $assistant],
            ['role' => 'user', 'content' => array_map(fn ($r) => [
                'type' => 'tool_result',
                'tool_use_id' => $r['id'],
                'content' => $r['output'],
            ], $toolResults)],
        ];
    }

    /** نماذج تُزيل معاملات المعاينة (temperature/top_p/top_k). */
    private function rejectsSampling(string $model): bool
    {
        return (bool) preg_match('/(opus-4-[678]|sonnet-5|fable-5|mythos-5)/i', $model);
    }

    /**
     * استخراج منظّم عبر tool_use (input_schema) — رؤية الصور/PDF عبر document/image source.
     * منقول عن نهج «موازين» (AnthropicDriver::extract).
     */
    public function extract(string $prompt, string $base64, string $mediaType, array $tool, array $options = []): array
    {
        $model = $this->setting->model ?: self::DEFAULT_MODEL;
        $maxTokens = (int) ($options['maxTokens'] ?? 1500);
        $source = ['type' => 'base64', 'media_type' => $mediaType, 'data' => $base64];
        $fileBlock = $mediaType === 'application/pdf'
            ? ['type' => 'document', 'source' => $source]
            : ['type' => 'image', 'source' => $source];

        $response = Http::withHeaders([
            'x-api-key' => (string) $this->setting->api_key,
            'anthropic-version' => self::API_VERSION,
            'content-type' => 'application/json',
        ])->timeout(60)->post($this->setting->endpoint ?: self::DEFAULT_ENDPOINT, [
            'model' => $model,
            'max_tokens' => max(256, min(8192, $maxTokens)),
            'tools' => [[
                'name' => $tool['name'],
                'description' => $tool['description'],
                'input_schema' => $tool['schema'],
            ]],
            'tool_choice' => ['type' => 'tool', 'name' => $tool['name']],
            'messages' => [[
                'role' => 'user',
                'content' => [$fileBlock, ['type' => 'text', 'text' => $prompt]],
            ]],
        ]);

        if (! $response->successful()) {
            throw new \RuntimeException('claude_http_'.$response->status());
        }

        $data = $response->json();
        $raw = null;
        foreach ($data['content'] ?? [] as $block) {
            if (($block['type'] ?? null) === 'tool_use' && ($block['name'] ?? null) === $tool['name']) {
                $raw = $block['input'] ?? null;
                break;
            }
        }
        if (! is_array($raw)) {
            throw new \RuntimeException('claude_extract_empty');
        }

        return [
            'raw' => $raw,
            'usage' => [
                'input' => (int) ($data['usage']['input_tokens'] ?? 0),
                'output' => (int) ($data['usage']['output_tokens'] ?? 0),
            ],
        ];
    }
}
