<?php

use Illuminate\Support\Facades\Route;
use Modules\Notification\Http\Controllers\Api\DeviceTokenController;
use Modules\Notification\Http\Controllers\Api\NotificationController;

// تُحمَّل تحت البادئة api/v1 (bootstrap/app.php)
Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('notifications', [NotificationController::class, 'index']);
    Route::post('notifications/read-all', [NotificationController::class, 'readAll']);
    Route::post('notifications/{notification}/read', [NotificationController::class, 'readOne']);

    // توكنات أجهزة FCM (تسجيل/إلغاء)
    Route::post('device-tokens', [DeviceTokenController::class, 'store']);
    Route::delete('device-tokens', [DeviceTokenController::class, 'destroy']);
});
