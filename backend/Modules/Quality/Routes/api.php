<?php

use Illuminate\Support\Facades\Route;
use Modules\Quality\Http\Controllers\Api\ObserveController;

// تُحمَّل تحت البادئة api/v1 + middleware api (بلا مصادقة) — bootstrap/app.php.
// استيعاب إشارات وقت-التشغيل من المُلتقِط الأماميّ (ف3).

Route::post('observe', [ObserveController::class, 'store']);
