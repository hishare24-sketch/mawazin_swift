<?php

namespace Tests\Feature\Api\Marketplace;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Modules\Marketplace\Entities\Application;
use Modules\Marketplace\Entities\Opportunity;
use Modules\User\Entities\User;
use Tests\Support\Api\AssertsApiJson;
use Tests\TestCase;

class MarketplaceTest extends TestCase
{
    use AssertsApiJson, RefreshDatabase;

    private function actingAsUser(): User
    {
        $user = User::create([
            'name' => 'Mkt',
            'email' => 'mkt'.uniqid().'@rec.test',
            'password' => 'secret123',
        ]);
        Sanctum::actingAs($user);

        return $user;
    }

    public function test_opportunities_are_seeded_on_first_list(): void
    {
        $this->actingAsUser();

        $this->getJson('/api/v1/opportunities')
            ->assertOk()
            ->assertJsonCount(3, 'data');
    }

    public function test_filter_opportunities_by_category(): void
    {
        $this->actingAsUser();
        $this->getJson('/api/v1/opportunities'); // seed

        $this->getJson('/api/v1/opportunities?category=design')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.category', 'design');
    }

    public function test_search_opportunities_by_q(): void
    {
        $this->actingAsUser();
        $this->postJson('/api/v1/opportunities', ['title' => 'Backend Engineer', 'company' => 'Acme', 'category' => 'tech']);

        $response = $this->getJson('/api/v1/opportunities?q=Backend')->assertOk();
        $this->assertSame('Backend Engineer', $response->json('data.0.title'));
    }

    public function test_search_is_case_insensitive_across_drivers(): void
    {
        $this->actingAsUser();
        $this->postJson('/api/v1/opportunities', ['title' => 'Backend Engineer', 'company' => 'Acme', 'category' => 'tech']);

        // حالة مغايرة تمامًا — يجب أن تجد النتيجة على MySQL و Postgres (عبر like_op/ilike)
        $response = $this->getJson('/api/v1/opportunities?q=BACKEND')->assertOk();
        $this->assertSame('Backend Engineer', $response->json('data.0.title'));
    }

    public function test_create_opportunity_returns_201(): void
    {
        $this->actingAsUser();

        $this->postJson('/api/v1/opportunities', ['title' => 'DevOps', 'skills' => ['Docker']])
            ->assertStatus(201)
            ->assertJsonPath('data.title', 'DevOps')
            ->assertJsonPath('data.skills.0', 'Docker');
    }

    public function test_apply_is_idempotent(): void
    {
        $user = $this->actingAsUser();
        $opp = Opportunity::create(['title' => 'X']);

        $this->postJson("/api/v1/opportunities/{$opp->id}/apply")->assertStatus(201);
        $this->postJson("/api/v1/opportunities/{$opp->id}/apply")->assertStatus(201);

        $this->assertSame(1, Application::where('user_id', $user->id)->count());
    }

    public function test_apply_to_missing_opportunity_returns_404(): void
    {
        $this->actingAsUser();

        $this->postJson('/api/v1/opportunities/9999/apply')->assertStatus(404);
    }

    public function test_requests_type_filter_and_mine(): void
    {
        $user = $this->actingAsUser();
        $this->getJson('/api/v1/requests'); // seed

        $this->getJson('/api/v1/requests?type=job')
            ->assertOk()
            ->assertJsonPath('data.0.type', 'job');

        // طلباتي فارغة (البذور بلا مالك)
        $this->getJson('/api/v1/requests/mine')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_opportunities_expose_pagination_meta(): void
    {
        $this->actingAsUser();

        $this->getJson('/api/v1/opportunities') // seeds 3
            ->assertOk()
            ->assertJsonStructure(['data', 'meta' => ['current_page', 'last_page', 'itemPerPage', 'total']])
            ->assertJsonPath('meta.current_page', 1)
            ->assertJsonPath('meta.total', 3);
    }

    public function test_opportunities_honor_per_page_and_page(): void
    {
        $user = $this->actingAsUser();
        // نُنشئ 5 قبل أيّ list — فيتخطّى البذر (العدّاد > 0) ويصير الإجماليّ 5 حتميًّا
        foreach (range(1, 5) as $i) {
            Opportunity::create(['user_id' => $user->id, 'title' => "Extra {$i}", 'category' => 'tech']);
        }

        $first = $this->getJson('/api/v1/opportunities?perPage=2&page=1')->assertOk();
        $first->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.itemPerPage', 2)
            ->assertJsonPath('meta.total', 5)
            ->assertJsonPath('meta.last_page', 3); // ceil(5 / 2)

        $second = $this->getJson('/api/v1/opportunities?perPage=2&page=2')->assertOk();
        $this->assertNotSame($first->json('data.0.id'), $second->json('data.0.id'));
    }
}
