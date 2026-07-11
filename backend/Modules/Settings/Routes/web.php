<?php

use Illuminate\Support\Facades\Route;
use Modules\Settings\Http\Controllers\Admin\AdminBrandingController;
use Modules\Settings\Http\Controllers\Admin\AdminSettingController;

// تُحمَّل تحت البادئة api/admin + [auth:sanctum, admin] (bootstrap/app.php).

Route::get('settings', [AdminSettingController::class, 'index']);
Route::put('settings', [AdminSettingController::class, 'update']);

Route::get('branding', [AdminBrandingController::class, 'show']);
Route::put('branding', [AdminBrandingController::class, 'update']);
