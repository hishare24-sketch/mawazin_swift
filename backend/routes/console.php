<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// مركز قيادة الجودة — أتمتة الاستشعار الذاتيّ (ف6):
// الوكيل L1 يُنهي دورة حياة الأخطاء الصامتة، ولقطة تغطية يوميّة تبني الاتّجاه.
Schedule::command('quality:resolve-stale --hours=48')->dailyAt('03:00')->withoutOverlapping();
Schedule::command('quality:snapshot')->dailyAt('02:30')->withoutOverlapping();
