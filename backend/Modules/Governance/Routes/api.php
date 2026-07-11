<?php

use Illuminate\Support\Facades\Route;
use Modules\Governance\Http\Controllers\Api\ReportController;

// تُحمَّل تحت البادئة api/v1 + middleware api (bootstrap/app.php). البلاغ يتطلّب مصادقة.

Route::post('reports', [ReportController::class, 'store'])->middleware('auth:sanctum');
