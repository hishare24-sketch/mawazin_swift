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
}
