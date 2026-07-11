<?php

use Illuminate\Support\Facades\Route;
use Modules\Settings\Http\Controllers\Api\BrandingController;

// تُحمَّل تحت البادئة api/v1 (bootstrap/app.php). هويّة المنصّة العامّة — بلا مصادقة.
Route::get('branding', [BrandingController::class, 'show']);
