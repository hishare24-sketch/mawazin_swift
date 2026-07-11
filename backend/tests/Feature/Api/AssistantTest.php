<?php

namespace Tests\Feature\Api;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Modules\Ai\Database\Seeders\AiSeeder;
use Modules\Ai\Entities\AiCapability;
use Modules\Ai\Entities\AiSetting;
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
}
