<?php

namespace Modules\Ai\Services\Providers;

use Illuminate\Support\Facades\Http;
use Modules\Ai\Entities\AiSetting;

/**
 * وسيط خادميّ لواجهة OpenAI Chat Completions — يحكمه إعداد الذكاء (النموذج/المفتاح/الحدّ/العنوان).
 * أيّ فشل شبكيّ أو رفض أو استجابة فارغة يُرمى كاستثناء ليعود المنسّق للمحاكاة بأمان (نفس عقد ClaudeProvider).
 *
 * نهج مُجرَّب منقول عن تكامل «موازين» (Modules/Ai/Drivers/OpenAiDriver): استخدام
 * `max_completion_tokens` (متوافق مع نماذج gpt-4o/o-series)، وتنظيف المفتاح من أيّ محرف
 * خارج ASCII المطبوع (يمنع كسر ترويسة HTTP)، وكشف الرفض عبر refusal/finish_reason.
 *
 * يدعم أيضًا مزوّد «custom» (نقطة نهاية متوافقة مع OpenAI) عبر AiSetting::endpoint.
 */
class OpenAiProvider implements LlmProvider, ToolCallingProvider
{
    private const DEFAULT_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

    private const DEFAULT_MODEL = 'gpt-4o-mini';

    public function __construct(private readonly AiSetting $setting) {}

    public function generate(string $systemPrompt, string $userMessage, array $options = []): array
    {
        $key = $this->cleanApiKey((string) $this->setting->api_key);
        if ($key === '') {
            throw new \RuntimeException('openai_missing_key');
        }

        $model = $this->setting->model ?: self::DEFAULT_MODEL;
        $maxTokens = (int) ($options['maxTokens'] ?? $this->setting->max_tokens ?? 1024);
        $maxTokens = max(256, min(8192, $maxTokens));

        $response = Http::withToken($key)
            ->timeout(60)
            ->post($this->setting->endpoint ?: self::DEFAULT_ENDPOINT, [
                'model' => $model,
                'max_completion_tokens' => $maxTokens,
                'messages' => array_merge(
                    [['role' => 'system', 'content' => $systemPrompt]],
                    $options['history'] ?? [], // أدوار سابقة {role,content} (ذاكرة المحادثة)
                    [['role' => 'user', 'content' => $userMessage]],
                ),
            ]);

        if (! $response->successful()) {
            throw new \RuntimeException('openai_http_'.$response->status());
        }

        $data = $response->json() ?? [];
        $choice = $data['choices'][0] ?? [];
        $msg = $choice['message'] ?? [];

        // رفض المصنّفات — عُد للمحاكاة بردّ مفيد بدل رسالة رفض جافّة.
        if (! empty($msg['refusal']) || ($choice['finish_reason'] ?? null) === 'content_filter') {
            throw new \RuntimeException('openai_refusal');
        }

        $text = trim((string) ($msg['content'] ?? ''));
        if ($text === '') {
            throw new \RuntimeException('openai_empty');
        }

        return [
            'text' => $text,
            'usage' => [
                'input' => (int) ($data['usage']['prompt_tokens'] ?? 0),
                'output' => (int) ($data['usage']['completion_tokens'] ?? 0),
            ],
            'stopReason' => $choice['finish_reason'] ?? null,
        ];
    }

    /**
     * محادثة مع أدوات (function-calling، جولة واحدة يديرها المنسّق) بلغة OpenAI:
     * tools من نوع function + رسائل، وتُطبَّع tool_calls إلى {id,name,input}.
     *
     * @return array{stopReason:?string, text:string, toolUses:array, assistant:array, usage:array}
     */
    public function chatWithTools(string $systemPrompt, array $messages, array $tools, array $options = []): array
    {
        $key = $this->cleanApiKey((string) $this->setting->api_key);
        if ($key === '') {
            throw new \RuntimeException('openai_missing_key');
        }

        $model = $this->setting->model ?: self::DEFAULT_MODEL;
        $maxTokens = max(256, min(8192, (int) ($options['maxTokens'] ?? $this->setting->max_tokens ?? 1024)));

        $response = Http::withToken($key)->timeout(40)
            ->post($this->setting->endpoint ?: self::DEFAULT_ENDPOINT, [
                'model' => $model,
                'max_completion_tokens' => $maxTokens,
                'messages' => array_merge([['role' => 'system', 'content' => $systemPrompt]], $messages),
                'tools' => array_map(fn ($t) => [
                    'type' => 'function',
                    'function' => ['name' => $t['name'], 'description' => $t['description'], 'parameters' => $t['schema']],
                ], $tools),
            ]);

        if (! $response->successful()) {
            throw new \RuntimeException('openai_http_'.$response->status());
        }

        $data = $response->json() ?? [];
        $choice = $data['choices'][0] ?? [];
        $msg = $choice['message'] ?? [];

        if (! empty($msg['refusal']) || ($choice['finish_reason'] ?? null) === 'content_filter') {
            throw new \RuntimeException('openai_refusal');
        }

        $toolUses = collect($msg['tool_calls'] ?? [])
            ->filter(fn ($c) => ($c['type'] ?? 'function') === 'function')
            ->map(fn ($c) => [
                'id' => $c['id'] ?? '',
                'name' => $c['function']['name'] ?? '',
                'input' => is_array($d = json_decode($c['function']['arguments'] ?? '{}', true)) ? $d : [],
            ])->values()->all();

        return [
            'stopReason' => ($choice['finish_reason'] ?? null) === 'tool_calls' ? 'tool_use' : ($choice['finish_reason'] ?? null),
            'text' => trim((string) ($msg['content'] ?? '')),
            'toolUses' => $toolUses,
            'assistant' => $msg, // رسالة المساعد الخام (تحوي tool_calls) تُلحَق كما هي
            'usage' => [
                'input' => (int) ($data['usage']['prompt_tokens'] ?? 0),
                'output' => (int) ($data['usage']['completion_tokens'] ?? 0),
            ],
        ];
    }

    /** يشكّل دور المساعد (tool_calls) + رسائل الأدوار «tool» بنتائجها بلغة OpenAI. */
    public function formatToolResultTurn(mixed $assistant, array $toolResults): array
    {
        return array_merge(
            [$assistant], // رسالة المساعد كما هي (بحقل tool_calls)
            array_map(fn ($r) => ['role' => 'tool', 'tool_call_id' => $r['id'], 'content' => $r['output']], $toolResults),
        );
    }

    /**
     * استخراج منظّم عبر function tool_choice — رؤية عبر image_url (صورة) أو file (PDF).
     * منقول عن نهج «موازين» (OpenAiDriver::extract).
     */
    public function extract(string $prompt, string $base64, string $mediaType, array $tool, array $options = []): array
    {
        $key = $this->cleanApiKey((string) $this->setting->api_key);
        if ($key === '') {
            throw new \RuntimeException('openai_missing_key');
        }

        $model = $this->setting->model ?: self::DEFAULT_MODEL;
        $maxTokens = (int) ($options['maxTokens'] ?? 1500);
        $dataUrl = "data:{$mediaType};base64,{$base64}";
        $filePart = $mediaType === 'application/pdf'
            ? ['type' => 'file', 'file' => ['filename' => 'cv.pdf', 'file_data' => $dataUrl]]
            : ['type' => 'image_url', 'image_url' => ['url' => $dataUrl]];

        $response = Http::withToken($key)
            ->timeout(60)
            ->post($this->setting->endpoint ?: self::DEFAULT_ENDPOINT, [
                'model' => $model,
                'max_completion_tokens' => max(256, min(8192, $maxTokens)),
                'tools' => [[
                    'type' => 'function',
                    'function' => ['name' => $tool['name'], 'description' => $tool['description'], 'parameters' => $tool['schema']],
                ]],
                'tool_choice' => ['type' => 'function', 'function' => ['name' => $tool['name']]],
                'messages' => [[
                    'role' => 'user',
                    'content' => [$filePart, ['type' => 'text', 'text' => $prompt]],
                ]],
            ]);

        if (! $response->successful()) {
            throw new \RuntimeException('openai_http_'.$response->status());
        }

        $data = $response->json() ?? [];
        $arguments = null;
        foreach ($data['choices'][0]['message']['tool_calls'] ?? [] as $call) {
            if (($call['function']['name'] ?? null) === $tool['name']) {
                $arguments = $call['function']['arguments'] ?? null;
                break;
            }
        }
        if ($arguments === null || $arguments === '') {
            throw new \RuntimeException('openai_extract_empty');
        }

        $raw = json_decode($arguments, true);
        if (json_last_error() !== JSON_ERROR_NONE || ! is_array($raw)) {
            throw new \RuntimeException('openai_extract_parse');
        }

        return [
            'raw' => $raw,
            'usage' => [
                'input' => (int) ($data['usage']['prompt_tokens'] ?? 0),
                'output' => (int) ($data['usage']['completion_tokens'] ?? 0),
            ],
        ];
    }

    /** تنظيف المفتاح: إزالة أيّ محرف خارج ASCII المطبوع (يمنع كسر ترويسة Authorization). */
    private function cleanApiKey(?string $raw): string
    {
        return (string) preg_replace('/[^\x21-\x7E]/', '', $raw ?? '');
    }
}
