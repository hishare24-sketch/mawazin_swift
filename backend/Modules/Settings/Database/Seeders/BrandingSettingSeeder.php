<?php

namespace Modules\Settings\Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\Settings\Entities\BrandingSetting;

class BrandingSettingSeeder extends Seeder
{
    public function run(): void
    {
        BrandingSetting::query()->updateOrCreate(['id' => 1], [
            'platform_name' => 'منظومة التوظيف الذكية',
            'tagline' => 'وظّف بذكاء، وتطوّر بثقة',
            'default_preset' => 'littlebee',
            'default_mode' => 'dark',
            'login_headline' => 'مرحبًا بك في منظومة التوظيف الذكية',
            'login_subtext' => 'منصّة توظيف متكاملة تجمع المرشّحين والمنشآت والمقيّمين بذكاء.',
        ]);
    }
}
