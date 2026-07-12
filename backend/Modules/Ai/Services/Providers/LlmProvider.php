<?php

namespace Modules\Ai\Services\Providers;

/**
 * عقد مزوّد نموذج لغويّ — يفصل التأليف عن المزوّد الفعليّ (Claude/محاكاة).
 */
interface LlmProvider
{
    /**
     * يولّد ردًّا من نظام + رسالة المستخدم.
     *
     * @return array{text:string, usage:array{input:int,output:int}, stopReason:?string}
     *
     * @throws \RuntimeException عند فشل المزوّد أو رفضه — ليلتقطه المنسّق ويعود للمحاكاة.
     */
    public function generate(string $systemPrompt, string $userMessage, array $options = []): array;

    /**
     * يستخرج حقولًا منظّمة من مستند (صورة/PDF) عبر استدعاء أداة (tool/function-calling).
     *
     * @param  string  $base64  محتوى المستند بترميز base64 (بلا بادئة data:)
     * @param  string  $mediaType  نوع الوسيط (image/jpeg|png|webp|application/pdf)
     * @param  array{name:string, description:string, schema:array}  $tool  تعريف الأداة (JSON Schema للمخرجات)
     * @return array{raw:array, usage:array{input:int,output:int}}
     *
     * @throws \RuntimeException عند الفشل — ليعود المنسّق للمحاكاة بأمان.
     */
    public function extract(string $prompt, string $base64, string $mediaType, array $tool, array $options = []): array;
}
