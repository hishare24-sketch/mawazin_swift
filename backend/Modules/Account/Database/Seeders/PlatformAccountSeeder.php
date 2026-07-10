<?php

namespace Modules\Account\Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\Account\Entities\PlatformAccount;

class PlatformAccountSeeder extends Seeder
{
    /** الخزينة الرئيسيّة (حساب استقبال الإيرادات الافتراضيّ) + حساب بنكيّ نموذجيّ. */
    public function run(): void
    {
        PlatformAccount::updateOrCreate(
            ['name' => 'الخزينة الرئيسيّة'],
            ['type' => 'cash', 'currency' => 'SAR', 'is_default' => true, 'active' => true, 'notes' => 'حساب استقبال إيرادات الباقات']
        );

        PlatformAccount::updateOrCreate(
            ['name' => 'حساب الراجحي — التشغيل'],
            ['type' => 'bank', 'bank_name' => 'مصرف الراجحي', 'account_no_masked' => 'SA•• •••• 4417', 'currency' => 'SAR', 'active' => true]
        );
    }
}
