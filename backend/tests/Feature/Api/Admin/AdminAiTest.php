<?php

namespace Tests\Feature\Api\Admin;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Modules\Ai\Database\Seeders\AiSeeder;
use Modules\Ai\Entities\AiCapability;
use Modules\User\Entities\User;
use Spatie\Permission\Models\Role;
use Tests\Support\Api\AssertsApiJson;
use Tests\TestCase;

class AdminAiTest extends TestCase
{
    use AssertsApiJson, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('permission:insert');
    }

    private function admin(): User
    {
        $admin = User::create(['name' => 'A', 'email' => 'ai'.uniqid().'@rec.test', 'password' => 'secret123']);
        $admin->assignRole(Role::where(['name' => 'super_admin', 'guard_name' => 'admin'])->first());
        Sanctum::actingAs($admin);

        return $admin;
    }

    public function test_admin_can_read_full_ai_config(): void
    {
        $this->admin();
        $this->seed(AiSeeder::class);

        $this->getJson('/api/admin/ai')
            ->assertOk()
            ->assertJsonStructure(['data' => [
                'settings' => ['enabled', 'provider', 'model', 'temperature', 'maxTokens', 'language', 'assistantLevel', 'levelTokens'],
                'capabilities' => [['id', 'key', 'label', 'enabled']],
                'knowledge' => [['id', 'title', 'content', 'tags', 'enabled']],
                'planQuotas' => [['key', 'name', 'maxTokensPerRequest', 'monthlyTokens']],
            ]])
            ->assertJsonPath('data.settings.provider', 'simulation');
    }

    public function test_config_works_without_seed_singleton_autocreates(): void
    {
        $this->admin();

        // بلا بذر — الصفّ المفرد يُنشأ بالافتراضيّات وقاعدة المعرفة/الأقسام فارغة.
        $this->getJson('/api/admin/ai')
            ->assertOk()
            ->assertJsonPath('data.settings.provider', 'simulation')
            ->assertJsonCount(0, 'data.capabilities');
    }

    public function test_admin_can_update_general_settings(): void
    {
        $this->admin();
        $this->seed(AiSeeder::class);

        $this->putJson('/api/admin/ai/settings', [
            'provider' => 'claude',
            'model' => 'claude-opus-4-8',
            'temperature' => 0.4,
            'assistant_level' => 3,
            'enabled' => false,
        ])->assertOk()->assertJsonPath('data.provider', 'claude')->assertJsonPath('data.enabled', false);

        $this->assertDatabaseHas('ai_settings', ['id' => 1, 'provider' => 'claude', 'assistant_level' => 3, 'enabled' => false]);
    }

    public function test_invalid_provider_is_rejected(): void
    {
        $this->admin();
        $this->seed(AiSeeder::class);

        $this->putJson('/api/admin/ai/settings', ['provider' => 'bogus'])->assertStatus(422);
    }

    public function test_admin_can_update_plan_quotas_and_doc_reads(): void
    {
        $this->admin();
        $this->seed(AiSeeder::class);

        $this->putJson('/api/admin/ai/quotas', [
            'doc_max_reads' => 7,
            'quotas' => [
                'pro' => ['maxTokensPerRequest' => 3000, 'dailyTokens' => 90000, 'weeklyTokens' => 500000, 'monthlyTokens' => 2000000],
            ],
        ])->assertOk()->assertJsonPath('data.docMaxReads', 7);

        $config = $this->getJson('/api/admin/ai')->json('data');
        $pro = collect($config['planQuotas'])->firstWhere('key', 'pro');
        $this->assertSame(3000, $pro['maxTokensPerRequest']);
        $this->assertSame(2000000, $pro['monthlyTokens']);
    }

    public function test_admin_can_toggle_capability(): void
    {
        $this->admin();
        $this->seed(AiSeeder::class);

        $cap = AiCapability::where('key', 'cv_screening')->first();
        $this->assertTrue($cap->enabled);

        $this->postJson("/api/admin/ai/capabilities/{$cap->id}/toggle")
            ->assertOk()->assertJsonPath('data.enabled', false);

        $this->assertFalse($cap->fresh()->enabled);
    }

    public function test_admin_can_crud_knowledge(): void
    {
        $this->admin();
        $this->seed(AiSeeder::class);

        // إنشاء
        $id = $this->postJson('/api/admin/ai/knowledge', [
            'title' => 'سياسة الخصوصيّة',
            'content' => 'لا تُشارك بيانات المرشّح دون إذن.',
            'tags' => ['خصوصيّة'],
        ])->assertCreated()->json('data.id');

        $this->assertDatabaseHas('ai_knowledge', ['id' => $id, 'title' => 'سياسة الخصوصيّة']);

        // تعديل
        $this->putJson("/api/admin/ai/knowledge/{$id}", ['enabled' => false])
            ->assertOk()->assertJsonPath('data.enabled', false);

        // حذف
        $this->deleteJson("/api/admin/ai/knowledge/{$id}")->assertOk();
        $this->assertDatabaseMissing('ai_knowledge', ['id' => $id]);
    }

    public function test_stats_reports_counts_and_distribution(): void
    {
        $this->admin();
        $this->seed(AiSeeder::class);

        $this->getJson('/api/admin/ai/stats')
            ->assertOk()
            ->assertJsonStructure(['data' => ['enabled', 'provider', 'capabilitiesTotal', 'capabilitiesEnabled', 'knowledgeTotal', 'knowledgeActive', 'plansConfigured', 'distribution']])
            ->assertJsonPath('data.capabilitiesTotal', 7);
    }

    public function test_non_admin_cannot_access_ai(): void
    {
        Sanctum::actingAs(User::create(['name' => 'U', 'email' => 'ai'.uniqid().'@rec.test', 'password' => 'secret123']));
        $this->getJson('/api/admin/ai')->assertStatus(403);
        $this->putJson('/api/admin/ai/settings', ['provider' => 'claude'])->assertStatus(403);
    }
}
