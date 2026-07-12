<?php

namespace Tests\Feature\Api\Quality;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Modules\Quality\Entities\RuntimeError;
use Modules\User\Entities\User;
use Spatie\Permission\Models\Role;
use Tests\Support\Api\AssertsApiJson;
use Tests\TestCase;

class ObserveTest extends TestCase
{
    use AssertsApiJson, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('permission:insert');
    }

    private function signal(array $over = []): array
    {
        return array_merge(['type' => 'api_5xx', 'message' => 'Boom on /x', 'route' => '/x', 'status' => 500], $over);
    }

    public function test_public_ingest_creates_grouped_error(): void
    {
        $this->postJson('/api/v1/observe', $this->signal())
            ->assertOk()
            ->assertJsonPath('data.status', 'new')
            ->assertJsonPath('data.severity', 'high');

        $this->assertSame(1, RuntimeError::count());
        $this->assertSame(1, RuntimeError::first()->count);
    }

    public function test_duplicate_increments_count_and_marks_ongoing(): void
    {
        // رسالتان تختلفان بالأرقام فقط → تُطبَّع فتتجمّعان في بصمة واحدة
        $this->postJson('/api/v1/observe', $this->signal(['message' => 'Timeout after 100ms']));
        $this->postJson('/api/v1/observe', $this->signal(['message' => 'Timeout after 950ms']))->assertOk();

        $err = RuntimeError::first();
        $this->assertSame(1, RuntimeError::count());   // مطبّع → نفس البصمة
        $this->assertSame(2, $err->count);
        $this->assertSame('ongoing', $err->status);
    }

    public function test_resolved_error_regresses_on_recurrence(): void
    {
        $this->postJson('/api/v1/observe', $this->signal());
        RuntimeError::query()->update(['status' => 'resolved']);

        $this->postJson('/api/v1/observe', $this->signal())->assertJsonPath('data.status', 'regressed');
    }

    public function test_ingest_validates_required_fields(): void
    {
        $this->postJson('/api/v1/observe', ['route' => '/x'])->assertStatus(422);
    }

    // ═══ عرض الأدمن ═══

    private function admin(): void
    {
        $admin = User::create(['name' => 'Q', 'email' => 'q'.uniqid().'@rec.test', 'password' => 'secret123']);
        $admin->assignRole(Role::where(['name' => 'super_admin', 'guard_name' => 'admin'])->first());
        Sanctum::actingAs($admin);
    }

    public function test_admin_runtime_lists_and_filters(): void
    {
        $this->postJson('/api/v1/observe', $this->signal());                                   // high
        $this->postJson('/api/v1/observe', $this->signal(['type' => 'console', 'message' => 'warn', 'route' => '/a', 'status' => null])); // warning

        $this->admin();
        $this->getJson('/api/admin/quality/runtime')
            ->assertOk()
            ->assertJsonStructure(['data' => [['fingerprint', 'type', 'severity', 'status', 'count', 'lastSeen']], 'meta']);

        $rows = $this->getJson('/api/admin/quality/runtime?severity=high')->assertOk()->json('data');
        $this->assertNotEmpty($rows);
        foreach ($rows as $row) {
            $this->assertSame('high', $row['severity']);
        }
    }

    public function test_overview_includes_runtime_summary(): void
    {
        $this->postJson('/api/v1/observe', $this->signal());
        $this->admin();

        $res = $this->getJson('/api/admin/quality/overview')
            ->assertOk()
            ->assertJsonStructure(['data' => ['runtime' => ['open', 'critical', 'today']]]);
        $this->assertGreaterThanOrEqual(1, $res->json('data.runtime.open'));
    }

    public function test_non_admin_cannot_view_runtime(): void
    {
        Sanctum::actingAs(User::create(['name' => 'U', 'email' => 'u'.uniqid().'@rec.test', 'password' => 'secret123']));
        $this->getJson('/api/admin/quality/runtime')->assertStatus(403);
    }
}
