<?php

namespace Tests\Feature\Api\Admin;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Modules\Marketplace\Entities\MarketRequest;
use Modules\Marketplace\Entities\Opportunity;
use Modules\User\Entities\User;
use Spatie\Permission\Models\Role;
use Tests\Support\Api\AssertsApiJson;
use Tests\TestCase;

class AdminMarketplaceTest extends TestCase
{
    use AssertsApiJson, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('permission:insert');
    }

    private function admin(): User
    {
        $admin = User::create(['name' => 'A', 'email' => 'm'.uniqid().'@rec.test', 'password' => 'secret123']);
        $admin->assignRole(Role::where(['name' => 'super_admin', 'guard_name' => 'admin'])->first());
        Sanctum::actingAs($admin);

        return $admin;
    }

    public function test_admin_can_list_and_delete_opportunities(): void
    {
        $this->admin();
        $opp = Opportunity::create(['title' => 'Dev', 'company' => 'Acme', 'location' => 'Riyadh', 'salary' => '10k', 'category' => 'tech', 'skills' => ['Vue']]);

        $this->getJson('/api/admin/opportunities')
            ->assertOk()
            ->assertJsonStructure(['data', 'meta' => ['current_page', 'total']]);

        $this->deleteJson("/api/admin/opportunities/{$opp->id}")->assertOk();
        $this->assertDatabaseMissing('opportunities', ['id' => $opp->id]);
    }

    public function test_admin_can_list_and_delete_requests(): void
    {
        $this->admin();
        $req = MarketRequest::create(['type' => 'project', 'title' => 'Build', 'org' => 'Org', 'state' => 'new', 'compensation' => 'fixed', 'remote' => true]);

        $this->getJson('/api/admin/requests?type=project')
            ->assertOk()
            ->assertJsonStructure(['data', 'meta']);

        $this->deleteJson("/api/admin/requests/{$req->id}")->assertOk();
        $this->assertDatabaseMissing('market_requests', ['id' => $req->id]);
    }

    public function test_non_admin_cannot_list_opportunities(): void
    {
        Sanctum::actingAs(User::create(['name' => 'U', 'email' => 'u'.uniqid().'@rec.test', 'password' => 'secret123']));
        $this->getJson('/api/admin/opportunities')->assertStatus(403);
    }
}
