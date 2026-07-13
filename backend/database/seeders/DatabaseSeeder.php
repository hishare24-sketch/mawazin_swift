<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Modules\Account\Database\Seeders\PlanSeeder;
use Modules\Account\Database\Seeders\PlatformAccountSeeder;
use Modules\Ai\Database\Seeders\AiSeeder;
use Modules\Chat\Database\Seeders\ChatSeeder;
use Modules\Compliance\Database\Seeders\ComplianceDemoSeeder;
use Modules\Governance\Database\Seeders\ModerationSeeder;
use Modules\Interview\Database\Seeders\InterviewQualitySeeder;
use Modules\Interview\Database\Seeders\InterviewRubricSeeder;
use Modules\Settings\Database\Seeders\BrandingSettingSeeder;
use Modules\Settings\Database\Seeders\PlatformSettingSeeder;
use Modules\Support\Database\Seeders\TicketSeeder;
use Modules\Survey\Database\Seeders\SurveyTemplateSeeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

        $this->call(PlanSeeder::class);
        $this->call(PlatformAccountSeeder::class);
        $this->call(SurveyTemplateSeeder::class);
        $this->call(PlatformSettingSeeder::class);
        $this->call(BrandingSettingSeeder::class);
        $this->call(ModerationSeeder::class);
        $this->call(TicketSeeder::class);
        $this->call(AiSeeder::class);
        $this->call(ChatSeeder::class);
        $this->call(InterviewRubricSeeder::class);
        $this->call(InterviewQualitySeeder::class);
        $this->call(ComplianceDemoSeeder::class);
        $this->call(DemoSeeder::class);
    }
}
