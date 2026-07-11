<?php

namespace Tests\Feature\Api\Admin;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Modules\Interview\Database\Seeders\InterviewQualitySeeder;
use Modules\Interview\Database\Seeders\InterviewRubricSeeder;
use Modules\Interview\Entities\Interview;
use Modules\Interview\Entities\InterviewRubric;
use Modules\User\Entities\User;
use Spatie\Permission\Models\Role;
use Tests\Support\Api\AssertsApiJson;
use Tests\TestCase;

class AdminInterviewQualityTest extends TestCase
{
    use AssertsApiJson, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('permission:insert');
    }

    private function admin(): User
    {
        $admin = User::create(['name' => 'Q', 'email' => 'q'.uniqid().'@rec.test', 'password' => 'secret123']);
        $admin->assignRole(Role::where(['name' => 'super_admin', 'guard_name' => 'admin'])->first());
        Sanctum::actingAs($admin);

        return $admin;
    }

    public function test_board_lists_with_computed_integrity_and_filters(): void
    {
        $this->admin();
        $this->seed(InterviewRubricSeeder::class);
        $this->seed(InterviewQualitySeeder::class);

        $this->getJson('/api/admin/interview-quality')
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'track', 'score', 'reviewStatus', 'integrityScore', 'integrityLevel']], 'meta']);

        // فلتر مستوى النزاهة العالي — ريم الزهراني (لصق + تعدّد وجوه)
        $high = $this->getJson('/api/admin/interview-quality?integrity=high')->assertOk()->json('data');
        $this->assertNotEmpty($high);
        $this->assertSame('high', $high[0]['integrityLevel']);
    }

    public function test_show_returns_criteria_breakdown_and_integrity(): void
    {
        $this->admin();
        $this->seed(InterviewRubricSeeder::class);
        $this->seed(InterviewQualitySeeder::class);
        $interview = Interview::where('track', 'technical')->first();

        $this->getJson("/api/admin/interview-quality/{$interview->id}")
            ->assertOk()
            ->assertJsonStructure(['data' => ['weightedScore', 'breakdown' => [['key', 'label', 'weight', 'score']], 'integrity' => ['score', 'level', 'signals']]]);
    }

    public function test_review_marks_interview(): void
    {
        $this->admin();
        $this->seed(InterviewRubricSeeder::class);
        $this->seed(InterviewQualitySeeder::class);
        $interview = Interview::where('review_status', 'pending')->first();

        $this->postJson("/api/admin/interview-quality/{$interview->id}/review", ['status' => 'approved'])
            ->assertOk()
            ->assertJsonPath('data.reviewStatus', 'approved');

        $this->assertNotNull($interview->fresh()->reviewed_at);
    }

    public function test_stats_and_calibration(): void
    {
        $this->admin();
        $this->seed(InterviewRubricSeeder::class);
        $this->seed(InterviewQualitySeeder::class);

        $this->getJson('/api/admin/interview-quality/stats')
            ->assertOk()
            ->assertJsonStructure(['data' => ['total', 'avgScore', 'flagged', 'highRisk', 'byStatus', 'byIntegrity']]);

        $this->getJson('/api/admin/interview-quality/calibration')
            ->assertOk()
            ->assertJsonStructure(['data' => ['overallAvg', 'tracks' => [['track', 'count', 'avgScore', 'highRiskRate', 'bias']]]]);
    }

    public function test_rubric_crud_and_system_guard(): void
    {
        $this->admin();
        $this->seed(InterviewRubricSeeder::class);

        $this->getJson('/api/admin/interview-rubrics')->assertOk()->assertJsonStructure(['data' => [['id', 'name', 'track', 'criteria', 'isSystem']]]);

        $id = $this->postJson('/api/admin/interview-rubrics', [
            'name' => 'معيار مخصّص', 'track' => 'custom',
            'criteria' => [['key' => 'a', 'label' => 'أ', 'weight' => 60], ['key' => 'b', 'label' => 'ب', 'weight' => 40]],
        ])->assertCreated()->json('data.id');

        $this->putJson("/api/admin/interview-rubrics/{$id}", ['name' => 'محدّث'])
            ->assertOk()->assertJsonPath('data.name', 'محدّث');

        $this->deleteJson("/api/admin/interview-rubrics/{$id}")->assertOk();

        // حذف النظاميّ ممنوع
        $sys = InterviewRubric::where('is_system', true)->first();
        $this->deleteJson("/api/admin/interview-rubrics/{$sys->id}")->assertStatus(405);
    }

    public function test_non_admin_forbidden(): void
    {
        Sanctum::actingAs(User::create(['name' => 'U', 'email' => 'u'.uniqid().'@rec.test', 'password' => 'secret123']));
        $this->getJson('/api/admin/interview-quality')->assertStatus(403);
    }
}
