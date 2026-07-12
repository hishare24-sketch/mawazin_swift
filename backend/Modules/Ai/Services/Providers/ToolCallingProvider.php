<?php

namespace Modules\Ai\Services\Providers;

/**
 * عقد المزوّدات القادرة على استدعاء الأدوات (function-calling).
 * يعزل تباين شكل الرسائل بين Anthropic وOpenAI عن منسّق حلقة الأدوات:
 * المنسّق يبني الرسائل الأوّليّة الموحّدة ({role, content:string})، والمزوّد
 * يطبّع الاستجابة ويشكّل دورة نتائج الأدوات بلغته الخاصّة.
 */
interface ToolCallingProvider
{
    /**
     * محادثة مع أدوات — تعيد استجابة مطبّعة.
     *
     * @param  array  $messages  أدوار المحادثة (نصّيّة أو مشكّلة سابقًا عبر formatToolResultTurn)
     * @param  array  $tools  [{name, description, schema}]
     * @return array{stopReason:?string, text:string, toolUses:array<int,array{id:string,name:string,input:array}>, assistant:mixed, usage:array{input:int,output:int}}
     */
    public function chatWithTools(string $systemPrompt, array $messages, array $tools, array $options = []): array;

    /**
     * يشكّل دورة «طلب الأدوات + نتائجها» رسائلَ تُلحَق بالمحادثة قبل الجولة التالية.
     *
     * @param  mixed  $assistant  المحتوى الخام لدور المساعد كما أعادته chatWithTools
     * @param  array  $toolResults  [{id:string, output:string}] — output نصّ/JSON نتيجة كلّ أداة
     * @return array<int, array> رسائل جاهزة للإلحاق بمصفوفة messages
     */
    public function formatToolResultTurn(mixed $assistant, array $toolResults): array;
}
