<?php

namespace Tests\Feature\Api\Admin;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Modules\Ai\Database\Seeders\AiSeeder;
use Modules\Ai\Entities\AiCapability;
use Modules\Ai\Entities\AiSetting;
use Modules\Marketplace\Entities\Application;
use Modules\Marketplace\Entities\Opportunity;
use Modules\Profile\Entities\Profile;
use Modules\User\Entities\User;
use Spatie\Permission\Models\Role;
use Tests\Support\Api\AssertsApiJson;
use Tests\TestCase;

class AdminMatchTest extends TestCase
{
    use AssertsApiJson, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('permission:insert');
    }

    private function admin(): User
    {
        $admin = User::create(['name' => 'A', 'email' => 'mt'.uniqid().'@rec.test', 'password' => 'secret123']);
        $admin->assignRole(Role::where(['name' => 'super_admin', 'guard_name' => 'admin'])->first());
        Sanctum::actingAs($admin);

        return $admin;
    }

    private function seedMatchData(): Opportunity
    {
        $employer = User::create(['name' => 'Emp', 'email' => 'e'.uniqid().'@rec.test', 'password' => 'secret123']);
        $opp = Opportunity::create(['user_id' => $employer->id, 'title' => 'مطوّر واجهات', 'company' => 'أفق', 'location' => 'عن بُعد', 'salary' => '—', 'category' => 'tech', 'skills' => ['Vue', 'TypeScript']]);

        // مرشّح قويّ (كل المهارات) وضعيف (بلا مهارات)
        $strong = User::create(['name' => 'قويّ', 'email' => 'st'.uniqid().'@rec.test', 'password' => 'secret123']);
        Profile::create(['user_id' => $strong->id, 'skills' => ['Vue', 'TypeScript'], 'experiences' => [['t' => 'a'], ['t' => 'b'], ['t' => 'c']], 'prefs' => ['interestedSectors' => ['tech']]]);
        Application::create(['user_id' => $strong->id, 'opportunity_id' => $opp->id]);

        $weak = User::create(['name' => 'ضعيف', 'email' => 'wk'.uniqid().'@rec.test', 'password' => 'secret123']);
        Application::create(['user_id' => $weak->id, 'opportunity_id' => $opp->id]);

        return $opp;
    }

    public function test_settings_returns_weights_and_ai_state(): void
    {
        $this->admin();
        $this->seed(AiSeeder::class);

        $this->getJson('/api/admin/matching/settings')
            ->assertOk()
            ->assertJsonStructure(['data' => ['settings' => ['skillsWeight', 'experienceWeight', 'categoryWeight', 'threshold', 'aiBoost'], 'aiActive']])
            ->assertJsonPath('data.aiActive', true);
    }

    public function test_admin_can_update_weights(): void
    {
        $this->admin();
        $this->putJson('/api/admin/matching/settings', ['skills_weight' => 80, 'threshold' => 70])
            ->assertOk()
            ->assertJsonPath('data.skillsWeight', 80)
            ->assertJsonPath('data.threshold', 70);
        $this->assertDatabaseHas('match_settings', ['skills_weight' => 80]);
    }

    public function test_shortlist_ranks_strong_candidate_first(): void
    {
        $this->admin();
        $this->seed(AiSeeder::class);
        $opp = $this->seedMatchData();

        $res = $this->getJson('/api/admin/matching/shortlist?opportunity_id='.$opp->id)
            ->assertOk()
            ->assertJsonStructure(['data' => ['opportunity', 'aiActive', 'threshold', 'shortlist' => [['candidate', 'score', 'breakdown', 'matchedSkills']]]]);

        $list = $res->json('data.shortlist');
        $this->assertSame('قويّ', $list[0]['candidate']);
        $this->assertGreaterThan($list[1]['score'], $list[0]['score']);
        $this->assertContains('vue', $list[0]['matchedSkills']);
    }

    public function test_disabling_matching_capability_turns_off_ai_boost(): void
    {
        $this->admin();
        $this->seed(AiSeeder::class);
        AiCapability::where('key', 'candidate_matching')->update(['enabled' => false]);

        $this->getJson('/api/admin/matching/settings')->assertOk()->assertJsonPath('data.aiActive', false);
    }

    /** معرّف تقديم المرشّح القويّ على الفرصة. */
    private function strongApplicationId(Opportunity $opp): int
    {
        return (int) Application::where('opportunity_id', $opp->id)
            ->whereHas('user', fn ($q) => $q->where('name', 'قويّ'))->firstOrFail()->id;
    }

    /** يحوّل إعدادات الذكاء لمزوّد Claude حيّ بمفتاح (لاختبار المسار الحيّ عبر Http::fake). */
    private function useClaudeKey(): void
    {
        AiSetting::current()->update(['provider' => 'claude', 'api_key' => 'sk-test', 'model' => 'claude-opus-4-8']);
    }

    public function test_explain_returns_heuristic_reasons_without_key(): void
    {
        $this->admin();
        $this->seed(AiSeeder::class); // مفعّل لكنّه simulation بلا مفتاح → استدلاليّ
        $opp = $this->seedMatchData();

        $res = $this->postJson('/api/admin/matching/explain', [
            'opportunity_id' => $opp->id,
            'application_id' => $this->strongApplicationId($opp),
        ])->assertOk()
            ->assertJsonStructure(['data' => ['candidate', 'live', 'score', 'verdict', 'reasons', 'redFlags', 'summary', 'matchedSkills']])
            ->assertJsonPath('data.live', false)
            ->assertJsonPath('data.candidate', 'قويّ');

        $this->assertNotEmpty($res->json('data.reasons'));
        $this->assertContains('vue', $res->json('data.matchedSkills'));
    }

    public function test_explain_uses_live_provider_when_configured(): void
    {
        $this->admin();
        $this->seed(AiSeeder::class);
        $this->useClaudeKey();
        $opp = $this->seedMatchData();

        Http::fake(['api.anthropic.com/*' => Http::response([
            'content' => [['type' => 'text', 'text' => '{"score":91,"verdict":"ملاءمة قويّة","reasons":["يتقن كل المهارات المطلوبة"],"redFlags":[],"summary":"مرشّح ممتاز للدور."}']],
            'stop_reason' => 'end_turn',
            'usage' => ['input_tokens' => 120, 'output_tokens' => 40],
        ], 200)]);

        $this->postJson('/api/admin/matching/explain', [
            'opportunity_id' => $opp->id,
            'application_id' => $this->strongApplicationId($opp),
        ])->assertOk()
            ->assertJsonPath('data.live', true)
            ->assertJsonPath('data.score', 91)
            ->assertJsonPath('data.verdict', 'ملاءمة قويّة')
            ->assertJsonPath('data.meta.simulated', false);
    }

    public function test_explain_falls_back_on_provider_error(): void
    {
        $this->admin();
        $this->seed(AiSeeder::class);
        $this->useClaudeKey();
        $opp = $this->seedMatchData();

        Http::fake(['api.anthropic.com/*' => Http::response('boom', 500)]);

        $this->postJson('/api/admin/matching/explain', [
            'opportunity_id' => $opp->id,
            'application_id' => $this->strongApplicationId($opp),
        ])->assertOk()
            ->assertJsonPath('data.live', false)
            ->assertJsonPath('data.meta.fallback', true);
    }

    public function test_explain_forbidden_for_non_admin(): void
    {
        Sanctum::actingAs(User::create(['name' => 'U', 'email' => 'mt'.uniqid().'@rec.test', 'password' => 'secret123']));
        $this->postJson('/api/admin/matching/explain', ['opportunity_id' => 1, 'application_id' => 1])->assertStatus(403);
    }

    public function test_non_admin_cannot_access_matching(): void
    {
        Sanctum::actingAs(User::create(['name' => 'U', 'email' => 'mt'.uniqid().'@rec.test', 'password' => 'secret123']));
        $this->getJson('/api/admin/matching/settings')->assertStatus(403);
    }
}
