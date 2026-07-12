<?php

namespace Tests\Feature\Api;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Modules\Ai\Database\Seeders\AiSeeder;
use Modules\Ai\Entities\AiCapability;
use Modules\Ai\Entities\AiSetting;
use Modules\Ai\Entities\AiUsage;
use Modules\Marketplace\Entities\Application;
use Modules\Marketplace\Entities\Opportunity;
use Modules\Profile\Entities\Profile;
use Modules\User\Entities\User;
use Tests\Support\Api\AssertsApiJson;
use Tests\TestCase;

class AssistantTest extends TestCase
{
    use AssertsApiJson, RefreshDatabase;

    private function user(array $attrs = []): User
    {
        $u = User::create(array_merge([
            'name' => 'مستخدم', 'email' => 'u'.uniqid().'@rec.test', 'password' => 'secret123',
        ], $attrs));
        Sanctum::actingAs($u);

        return $u;
    }

    public function test_context_returns_governance_persona_and_suggestions(): void
    {
        $this->seed(AiSeeder::class);
        $this->user(['role' => 'company', 'kind' => 'organization']);

        $this->getJson('/api/v1/assistant/context')
            ->assertOk()
            ->assertJsonStructure(['data' => [
                'governance' => ['effectiveEnabled', 'level', 'provider'],
                'context' => ['name', 'persona', 'dataAccess', 'proactive'],
                'suggestions', 'nudges',
            ]])
            ->assertJsonPath('data.context.persona', 'organization');
    }

    public function test_message_replies_and_persists_conversation(): void
    {
        $this->seed(AiSeeder::class);
        $this->user(['role' => 'seeker']);

        $res = $this->postJson('/api/v1/assistant/message', ['message' => 'كيف أحسّن ملفّي؟'])
            ->assertOk()
            ->assertJsonPath('data.blocked', false)
            ->assertJsonStructure(['data' => ['conversationId', 'reply', 'meta' => ['level', 'persona', 'usedKnowledge']]]);

        $cid = $res->json('data.conversationId');
        $this->assertDatabaseHas('assistant_conversations', ['id' => $cid]);
        // رسالة المستخدم + ردّ المساعد
        $this->assertSame(2, \Modules\Ai\Entities\AssistantMessage::where('conversation_id', $cid)->count());
    }

    public function test_message_blocked_friendly_when_ai_off(): void
    {
        $this->seed(AiSeeder::class);
        AiSetting::query()->where('id', 1)->update(['enabled' => false]);
        $this->user(['role' => 'seeker']);

        $this->postJson('/api/v1/assistant/message', ['message' => 'مرحبا'])
            ->assertOk()
            ->assertJsonPath('data.blocked', true)
            ->assertJsonPath('data.canEscalate', true);
    }

    public function test_privacy_off_excludes_activity_from_context(): void
    {
        $this->seed(AiSeeder::class);
        $this->user(['role' => 'seeker']);

        $this->putJson('/api/v1/assistant/settings', ['data_access' => false])->assertOk();

        $ctx = $this->getJson('/api/v1/assistant/context')->assertOk()->json('data.context');
        $this->assertFalse($ctx['dataAccess']);
        $this->assertArrayNotHasKey('activity', $ctx);
    }

    public function test_conversation_ownership_is_enforced(): void
    {
        $this->seed(AiSeeder::class);
        $owner = $this->user(['role' => 'seeker']);
        $cid = $this->postJson('/api/v1/assistant/message', ['message' => 'مرحبا'])->json('data.conversationId');

        // مستخدم آخر لا يرى محادثة غيره
        $this->user(['role' => 'seeker']);
        $this->getJson('/api/v1/assistant/conversations/'.$cid)->assertStatus(403);
    }

    public function test_escalate_creates_ticket_owned_by_user(): void
    {
        $this->seed(AiSeeder::class);
        $user = $this->user(['role' => 'seeker']);
        $cid = $this->postJson('/api/v1/assistant/message', ['message' => 'عندي مشكلة في الدفع'])->json('data.conversationId');

        $this->postJson('/api/v1/assistant/escalate', ['conversationId' => $cid, 'category' => 'billing'])
            ->assertCreated()
            ->assertJsonStructure(['data' => ['id', 'subject', 'status']]);

        $this->assertDatabaseHas('tickets', ['user_id' => $user->id, 'category' => 'billing']);
    }

    public function test_user_can_create_list_and_reply_own_tickets(): void
    {
        $user = $this->user(['role' => 'seeker']);

        $id = $this->postJson('/api/v1/support/tickets', [
            'subject' => 'استفسار عن باقتي', 'body' => 'كيف أرقّي باقتي؟', 'category' => 'billing',
        ])->assertCreated()->json('data.id');

        $this->getJson('/api/v1/support/tickets')->assertOk()->assertJsonCount(1, 'data');

        $this->postJson("/api/v1/support/tickets/{$id}/reply", ['body' => 'شكرًا'])
            ->assertOk()
            ->assertJsonPath('data.repliesCount', 2);
    }

    public function test_user_cannot_view_others_ticket(): void
    {
        $this->user(['role' => 'seeker']);
        $id = $this->postJson('/api/v1/support/tickets', ['subject' => 'خاص', 'body' => 'سرّي'])->json('data.id');

        $this->user(['role' => 'seeker']);
        $this->getJson("/api/v1/support/tickets/{$id}")->assertStatus(403);
    }

    public function test_user_reply_broadcasts_to_admin_channel(): void
    {
        $this->user(['role' => 'seeker']);
        $id = $this->postJson('/api/v1/support/tickets', ['subject' => 'استفسار', 'body' => 'سؤال'])->json('data.id');

        \Illuminate\Support\Facades\Event::fake([\Modules\Support\Events\TicketReplyPosted::class]);
        $this->postJson("/api/v1/support/tickets/{$id}/reply", ['body' => 'تحديث'])->assertOk();

        \Illuminate\Support\Facades\Event::assertDispatched(
            \Modules\Support\Events\TicketReplyPosted::class,
            fn ($e) => $e->channelName === 'support.admin' && $e->payload['ticketId'] === $id && $e->payload['reply']['isStaff'] === false,
        );
    }

    public function test_persona_seeker_reply_mentions_applications_context(): void
    {
        $this->seed(AiSeeder::class);
        $this->user(['role' => 'seeker']);

        // المستوى 3 لردّ أعمق
        AiSetting::query()->where('id', 1)->update(['assistant_level' => 3]);

        $reply = $this->postJson('/api/v1/assistant/message', ['message' => 'ساعدني'])->json('data.reply');
        $this->assertStringContainsString('كباحث عن عمل', $reply);
    }

    public function test_message_records_token_usage(): void
    {
        $this->seed(AiSeeder::class);
        $user = $this->user(['role' => 'seeker']);

        $this->postJson('/api/v1/assistant/message', ['message' => 'كيف أحسّن ملفّي؟'])->assertOk();

        $row = \Modules\Ai\Entities\AiUsage::where('user_id', $user->id)->first();
        $this->assertNotNull($row);
        $this->assertGreaterThan(0, $row->tokens);
        $this->assertSame($row->request_tokens + $row->response_tokens, $row->tokens);
    }

    public function test_context_exposes_quota_snapshot(): void
    {
        $this->seed(AiSeeder::class);
        $this->user(['role' => 'seeker', 'tier' => 'free']);

        $this->getJson('/api/v1/assistant/context')
            ->assertOk()
            ->assertJsonStructure(['data' => ['quota' => ['tier', 'used', 'limits', 'remaining']]]);
    }

    public function test_message_blocked_when_daily_quota_exceeded(): void
    {
        $this->seed(AiSeeder::class);
        // حصّة يوميّة ضيّقة جدًّا للباقة المجّانيّة
        AiSetting::query()->where('id', 1)->update([
            'plan_quotas' => ['free' => ['maxTokensPerRequest' => 2048, 'dailyTokens' => 1, 'weeklyTokens' => 0, 'monthlyTokens' => 0]],
        ]);
        $this->user(['role' => 'seeker', 'tier' => 'free']);

        $this->postJson('/api/v1/assistant/message', ['message' => 'رسالة تتجاوز الحصّة اليوميّة'])
            ->assertOk()
            ->assertJsonPath('data.blocked', true)
            ->assertJsonPath('data.quotaBlocked', 'daily')
            ->assertJsonPath('data.canEscalate', true);

        // لم يُسجَّل أيّ استهلاك لأنّ الطلب حُجب قبل التأليف
        $this->assertDatabaseCount('ai_usage', 0);
    }

    public function test_message_blocked_when_request_exceeds_per_request_cap(): void
    {
        $this->seed(AiSeeder::class);
        AiSetting::query()->where('id', 1)->update([
            'plan_quotas' => ['free' => ['maxTokensPerRequest' => 2, 'dailyTokens' => 0, 'weeklyTokens' => 0, 'monthlyTokens' => 0]],
        ]);
        $this->user(['role' => 'seeker', 'tier' => 'free']);

        $this->postJson('/api/v1/assistant/message', ['message' => 'رسالة طويلة تتجاوز حدّ الطلب الواحد بكثير'])
            ->assertOk()
            ->assertJsonPath('data.blocked', true)
            ->assertJsonPath('data.quotaBlocked', 'perRequest');
    }

    private function useClaudeProvider(): void
    {
        AiSetting::query()->where('id', 1)->update(['provider' => 'claude', 'api_key' => 'sk-test-key', 'model' => 'claude-opus-4-8']);
    }

    public function test_uses_live_claude_provider_and_records_real_tokens(): void
    {
        $this->seed(AiSeeder::class);
        $this->useClaudeProvider();
        Http::fake(['api.anthropic.com/*' => Http::response([
            'content' => [['type' => 'text', 'text' => 'ردّ كلود الحقيقيّ للمستخدم.']],
            'stop_reason' => 'end_turn',
            'usage' => ['input_tokens' => 42, 'output_tokens' => 17],
        ], 200)]);
        $user = $this->user(['role' => 'seeker']);

        $this->postJson('/api/v1/assistant/message', ['message' => 'ساعدني'])
            ->assertOk()
            ->assertJsonPath('data.blocked', false)
            ->assertJsonPath('data.reply', 'ردّ كلود الحقيقيّ للمستخدم.')
            ->assertJsonPath('data.meta.simulated', false);

        $row = \Modules\Ai\Entities\AiUsage::where('user_id', $user->id)->first();
        $this->assertSame(42, $row->request_tokens);
        $this->assertSame(17, $row->response_tokens);
    }

    public function test_message_passes_conversation_history_to_live_provider(): void
    {
        $this->seed(AiSeeder::class);
        $this->useClaudeProvider();
        Http::fake(['api.anthropic.com/*' => Http::response([
            'content' => [['type' => 'text', 'text' => 'ردّ المساعد الأوّل.']],
            'stop_reason' => 'end_turn',
            'usage' => ['input_tokens' => 10, 'output_tokens' => 5],
        ], 200)]);
        $this->user(['role' => 'seeker']);

        $first = $this->postJson('/api/v1/assistant/message', ['message' => 'سؤالي الأوّل'])->assertOk();
        $cid = $first->json('data.conversationId');
        $this->postJson('/api/v1/assistant/message', ['message' => 'سؤالي الثاني', 'conversationId' => $cid])->assertOk();

        // آخر طلب للمزوّد يحمل الأدوار السابقة (ذاكرة المحادثة) قبل السؤال الثاني.
        Http::assertSent(function ($request) {
            if (! str_contains($request->url(), 'anthropic.com')) {
                return false;
            }
            $contents = collect($request['messages'] ?? [])->pluck('content')->implode(' | ');

            return str_contains($contents, 'سؤالي الأوّل')
                && str_contains($contents, 'ردّ المساعد الأوّل.')
                && str_contains($contents, 'سؤالي الثاني');
        });
    }

    public function test_assistant_uses_platform_tools_to_answer(): void
    {
        $this->seed(AiSeeder::class);
        $this->useClaudeProvider();
        $user = $this->user(['role' => 'seeker']);

        $emp = User::create(['name' => 'Emp', 'email' => 'emp'.uniqid().'@rec.test', 'password' => 'secret123']);
        $opp = Opportunity::create(['user_id' => $emp->id, 'title' => 'مطوّر واجهات', 'company' => 'أفق', 'location' => 'عن بُعد', 'salary' => '—', 'category' => 'tech']);
        Application::create(['user_id' => $user->id, 'opportunity_id' => $opp->id, 'stage' => 'applied']);

        // جولة 1: المزوّد يطلب أداة · جولة 2: يُنتج الردّ النهائيّ مستندًا لنتيجتها.
        Http::fake(['api.anthropic.com/*' => Http::sequence()
            ->push(['content' => [['type' => 'tool_use', 'id' => 'tu_1', 'name' => 'get_my_applications', 'input' => []]], 'stop_reason' => 'tool_use', 'usage' => ['input_tokens' => 30, 'output_tokens' => 10]], 200)
            ->push(['content' => [['type' => 'text', 'text' => 'لديك تقديم واحد على «مطوّر واجهات».']], 'stop_reason' => 'end_turn', 'usage' => ['input_tokens' => 50, 'output_tokens' => 20]], 200),
        ]);

        $this->postJson('/api/v1/assistant/message', ['message' => 'ما حالة تقديماتي؟'])
            ->assertOk()
            ->assertJsonPath('data.blocked', false)
            ->assertJsonPath('data.meta.simulated', false)
            ->assertJsonPath('data.reply', 'لديك تقديم واحد على «مطوّر واجهات».')
            ->assertJsonPath('data.meta.usedTools', ['get_my_applications']);

        // التوكن مجموع عبر الجولتين (30+50 مدخل، 10+20 مخرج).
        $row = AiUsage::where('user_id', $user->id)->first();
        $this->assertSame(80, $row->request_tokens);
        $this->assertSame(30, $row->response_tokens);
    }

    public function test_assistant_uses_platform_tools_via_openai(): void
    {
        $this->seed(AiSeeder::class);
        $this->useOpenAiProvider();
        $user = $this->user(['role' => 'seeker']);

        $emp = User::create(['name' => 'Emp', 'email' => 'emp'.uniqid().'@rec.test', 'password' => 'secret123']);
        $opp = Opportunity::create(['user_id' => $emp->id, 'title' => 'محلّل بيانات', 'company' => 'بيان', 'location' => 'الرياض', 'salary' => '—', 'category' => 'data']);
        Application::create(['user_id' => $user->id, 'opportunity_id' => $opp->id, 'stage' => 'screening']);

        Http::fake(['api.openai.com/*' => Http::sequence()
            ->push(['choices' => [['message' => ['content' => null, 'tool_calls' => [['id' => 'call_1', 'type' => 'function', 'function' => ['name' => 'get_my_applications', 'arguments' => '{}']]]], 'finish_reason' => 'tool_calls']], 'usage' => ['prompt_tokens' => 30, 'completion_tokens' => 10]], 200)
            ->push(['choices' => [['message' => ['content' => 'تقديمك على «محلّل بيانات» في مرحلة الفرز.'], 'finish_reason' => 'stop']], 'usage' => ['prompt_tokens' => 50, 'completion_tokens' => 20]], 200),
        ]);

        $this->postJson('/api/v1/assistant/message', ['message' => 'أين وصلت تقديماتي؟'])
            ->assertOk()
            ->assertJsonPath('data.meta.simulated', false)
            ->assertJsonPath('data.reply', 'تقديمك على «محلّل بيانات» في مرحلة الفرز.')
            ->assertJsonPath('data.meta.usedTools', ['get_my_applications']);

        $row = AiUsage::where('user_id', $user->id)->first();
        $this->assertSame(80, $row->request_tokens);
        $this->assertSame(30, $row->response_tokens);
    }

    public function test_assistant_recommends_opportunities_via_tool(): void
    {
        $this->seed(AiSeeder::class);
        $this->useClaudeProvider();
        $user = $this->user(['role' => 'seeker']);
        Profile::create(['user_id' => $user->id, 'skills' => ['Vue', 'TypeScript'], 'prefs' => ['interestedSectors' => ['tech']]]);

        $emp = User::create(['name' => 'Emp', 'email' => 'emp'.uniqid().'@rec.test', 'password' => 'secret123']);
        Opportunity::create(['user_id' => $emp->id, 'title' => 'مطوّر Vue', 'company' => 'أفق', 'location' => 'عن بُعد', 'salary' => '—', 'category' => 'tech', 'skills' => ['Vue', 'TypeScript']]);

        Http::fake(['api.anthropic.com/*' => Http::sequence()
            ->push(['content' => [['type' => 'tool_use', 'id' => 'tu_r', 'name' => 'get_recommended_opportunities', 'input' => []]], 'stop_reason' => 'tool_use', 'usage' => ['input_tokens' => 20, 'output_tokens' => 8]], 200)
            ->push(['content' => [['type' => 'text', 'text' => 'أنسب فرصة لك: «مطوّر Vue» بتطابق عالٍ.']], 'stop_reason' => 'end_turn', 'usage' => ['input_tokens' => 40, 'output_tokens' => 15]], 200),
        ]);

        $this->postJson('/api/v1/assistant/message', ['message' => 'اقترح لي فرصًا'])
            ->assertOk()
            ->assertJsonPath('data.meta.usedTools', ['get_recommended_opportunities'])
            ->assertJsonPath('data.reply', 'أنسب فرصة لك: «مطوّر Vue» بتطابق عالٍ.');
    }

    public function test_personal_tools_hidden_when_data_access_off(): void
    {
        $this->seed(AiSeeder::class);
        $this->useClaudeProvider();
        $user = $this->user(['role' => 'seeker']);
        \Modules\Ai\Entities\AssistantPreference::forUser($user->id)->update(['data_access' => false]);

        Http::fake(['api.anthropic.com/*' => Http::response([
            'content' => [['type' => 'text', 'text' => 'تمام.']], 'stop_reason' => 'end_turn', 'usage' => ['input_tokens' => 5, 'output_tokens' => 3],
        ], 200)]);

        $this->postJson('/api/v1/assistant/message', ['message' => 'كم رصيدي؟'])->assertOk();

        // بلا سماح ببياناته: تُعرَض الأداة العامّة فقط (بحث الفرص)، وتُخفى الشخصيّة.
        Http::assertSent(function ($request) {
            if (! str_contains($request->url(), 'anthropic.com')) {
                return false;
            }

            return collect($request['tools'] ?? [])->pluck('name')->all() === ['search_opportunities'];
        });
    }

    public function test_falls_back_to_simulation_on_provider_error(): void
    {
        $this->seed(AiSeeder::class);
        $this->useClaudeProvider();
        Http::fake(['api.anthropic.com/*' => Http::response('upstream down', 500)]);
        $this->user(['role' => 'seeker']);

        $this->postJson('/api/v1/assistant/message', ['message' => 'ساعدني'])
            ->assertOk()
            ->assertJsonPath('data.blocked', false)
            ->assertJsonPath('data.meta.fallback', true);
    }

    public function test_falls_back_to_simulation_on_refusal(): void
    {
        $this->seed(AiSeeder::class);
        $this->useClaudeProvider();
        Http::fake(['api.anthropic.com/*' => Http::response([
            'content' => [], 'stop_reason' => 'refusal', 'usage' => ['input_tokens' => 5, 'output_tokens' => 0],
        ], 200)]);
        $this->user(['role' => 'seeker']);

        $this->postJson('/api/v1/assistant/message', ['message' => 'ساعدني'])
            ->assertOk()
            ->assertJsonPath('data.blocked', false)
            ->assertJsonPath('data.meta.fallback', true)
            ->assertJsonPath('data.meta.fallbackReason', 'claude_refusal');
    }

    private function useOpenAiProvider(): void
    {
        AiSetting::query()->where('id', 1)->update(['provider' => 'openai', 'api_key' => 'sk-openai-test', 'model' => 'gpt-4o-mini']);
    }

    public function test_uses_live_openai_provider_and_records_real_tokens(): void
    {
        $this->seed(AiSeeder::class);
        $this->useOpenAiProvider();
        Http::fake(['api.openai.com/*' => Http::response([
            'choices' => [['message' => ['content' => 'ردّ OpenAI الحقيقيّ للمستخدم.'], 'finish_reason' => 'stop']],
            'usage' => ['prompt_tokens' => 55, 'completion_tokens' => 23],
        ], 200)]);
        $user = $this->user(['role' => 'seeker']);

        $this->postJson('/api/v1/assistant/message', ['message' => 'ساعدني'])
            ->assertOk()
            ->assertJsonPath('data.blocked', false)
            ->assertJsonPath('data.reply', 'ردّ OpenAI الحقيقيّ للمستخدم.')
            ->assertJsonPath('data.meta.simulated', false);

        $row = \Modules\Ai\Entities\AiUsage::where('user_id', $user->id)->first();
        $this->assertSame(55, $row->request_tokens);
        $this->assertSame(23, $row->response_tokens);
    }

    public function test_openai_provider_falls_back_to_simulation_on_error(): void
    {
        $this->seed(AiSeeder::class);
        $this->useOpenAiProvider();
        Http::fake(['api.openai.com/*' => Http::response('rate limited', 429)]);
        $this->user(['role' => 'seeker']);

        $this->postJson('/api/v1/assistant/message', ['message' => 'ساعدني'])
            ->assertOk()
            ->assertJsonPath('data.blocked', false)
            ->assertJsonPath('data.meta.fallback', true);
    }

    // ═══ استخراج السيرة الذاتيّة ═══

    public function test_extract_cv_via_openai_returns_structured_profile(): void
    {
        $this->seed(AiSeeder::class);
        $this->useOpenAiProvider();
        Http::fake(['api.openai.com/*' => Http::response([
            'choices' => [['message' => ['tool_calls' => [[
                'function' => ['name' => 'extract_cv', 'arguments' => json_encode([
                    'name' => 'أحمد المنصور',
                    'headline' => 'مطوّر واجهات أمامية',
                    'skills' => [['name' => 'Vue.js', 'level' => 5], ['name' => 'TypeScript', 'level' => 4]],
                    'experiences' => [['title' => 'مطوّر أول', 'org' => 'شركة تقنية', 'years' => 3]],
                    'certificates' => [],
                    'confidence' => 88,
                ])],
            ]]]]],
            'usage' => ['prompt_tokens' => 300, 'completion_tokens' => 120],
        ], 200)]);
        $user = $this->user(['role' => 'seeker']);

        $this->postJson('/api/v1/assistant/extract-cv', ['base64' => base64_encode('fake-image-bytes'), 'mediaType' => 'image/png'])
            ->assertOk()
            ->assertJsonPath('data.live', true)
            ->assertJsonPath('data.data.name', 'أحمد المنصور')
            ->assertJsonPath('data.data.headline', 'مطوّر واجهات أمامية')
            ->assertJsonPath('data.data.skills.0.name', 'Vue.js')
            ->assertJsonPath('data.data.skills.0.level', 5)
            ->assertJsonPath('data.data.confidence', 88);

        $row = \Modules\Ai\Entities\AiUsage::where('user_id', $user->id)->first();
        $this->assertSame(300, $row->request_tokens);
    }

    public function test_extract_cv_via_claude_returns_structured_profile(): void
    {
        $this->seed(AiSeeder::class);
        $this->useClaudeProvider();
        Http::fake(['api.anthropic.com/*' => Http::response([
            'content' => [['type' => 'tool_use', 'name' => 'extract_cv', 'input' => [
                'name' => 'سارة العتيبي',
                'skills' => [['name' => 'Laravel', 'level' => 4]],
                'confidence' => 76,
            ]]],
            'usage' => ['input_tokens' => 210, 'output_tokens' => 90],
        ], 200)]);
        $this->user(['role' => 'seeker']);

        $this->postJson('/api/v1/assistant/extract-cv', ['base64' => base64_encode('x'), 'mediaType' => 'application/pdf'])
            ->assertOk()
            ->assertJsonPath('data.live', true)
            ->assertJsonPath('data.data.name', 'سارة العتيبي')
            ->assertJsonPath('data.data.skills.0.name', 'Laravel')
            ->assertJsonPath('data.meta.simulated', false);
    }

    public function test_extract_cv_returns_empty_suggestion_without_provider(): void
    {
        $this->seed(AiSeeder::class); // البذرة: provider=simulation، بلا مفتاح
        $this->user(['role' => 'seeker']);

        $this->postJson('/api/v1/assistant/extract-cv', ['base64' => base64_encode('x'), 'mediaType' => 'image/png'])
            ->assertOk()
            ->assertJsonPath('data.live', false)
            ->assertJsonPath('data.data.confidence', 0)
            ->assertJsonPath('data.data.skills', []);
    }

    public function test_extract_cv_validates_media_type(): void
    {
        $this->seed(AiSeeder::class);
        $this->user(['role' => 'seeker']);

        $this->postJson('/api/v1/assistant/extract-cv', ['base64' => 'x', 'mediaType' => 'application/zip'])
            ->assertStatus(422);
    }

    // ═══ صياغة السيرة التكيّفيّة ═══

    private function sampleProfile(): array
    {
        return [
            'headline' => 'مطوّر واجهات', 'field' => 'تطوير الويب',
            'skills' => [['name' => 'Vue.js', 'level' => 5], ['name' => 'Laravel', 'level' => 4]],
            'experiences' => [['title' => 'مطوّر أول', 'org' => 'شركة تقنية', 'years' => 3, 'summary' => 'قيادة فريق']],
            'certificates' => [],
        ];
    }

    public function test_compose_cv_simulation_respects_length(): void
    {
        $this->seed(AiSeeder::class); // simulation
        $this->user(['role' => 'seeker']);

        $short = $this->postJson('/api/v1/assistant/compose-cv', ['length' => 'short', 'profile' => $this->sampleProfile()])
            ->assertOk()->assertJsonPath('data.live', false)->assertJsonPath('data.data.length', 'short');
        $expanded = $this->postJson('/api/v1/assistant/compose-cv', ['length' => 'expanded', 'profile' => $this->sampleProfile()])
            ->assertOk()->assertJsonPath('data.data.length', 'expanded');

        $this->assertLessThanOrEqual(3, count($short->json('data.data.highlights')));
        $this->assertLessThanOrEqual(5, count($expanded->json('data.data.highlights')));
        $this->assertNotEmpty($short->json('data.data.summary'));
        // الموسّع أطول من المختصر
        $this->assertGreaterThan(mb_strlen($short->json('data.data.summary')), mb_strlen($expanded->json('data.data.summary')));
    }

    public function test_compose_cv_live_via_openai(): void
    {
        $this->seed(AiSeeder::class);
        $this->useOpenAiProvider();
        Http::fake(['api.openai.com/*' => Http::response([
            'choices' => [['message' => ['content' => '{"headline":"مهندس واجهات أول","summary":"نبذة احترافيّة مصاغة بالذكاء.","highlights":["إتقان Vue.js","قيادة فرق"]}'], 'finish_reason' => 'stop']],
            'usage' => ['prompt_tokens' => 200, 'completion_tokens' => 80],
        ], 200)]);
        $this->user(['role' => 'seeker']);

        $this->postJson('/api/v1/assistant/compose-cv', ['length' => 'medium', 'profile' => $this->sampleProfile()])
            ->assertOk()
            ->assertJsonPath('data.live', true)
            ->assertJsonPath('data.data.headline', 'مهندس واجهات أول')
            ->assertJsonPath('data.data.highlights.0', 'إتقان Vue.js')
            ->assertJsonPath('data.meta.simulated', false);
    }

    public function test_compose_cv_validates_length(): void
    {
        $this->seed(AiSeeder::class);
        $this->user(['role' => 'seeker']);

        $this->postJson('/api/v1/assistant/compose-cv', ['length' => 'huge', 'profile' => $this->sampleProfile()])
            ->assertStatus(422);
    }
}
