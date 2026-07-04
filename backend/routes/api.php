<?php

use App\Http\Controllers\Api\V1\AuthController;
use Illuminate\Support\Facades\Route;

// ===== مسارات API v1 — تطابق api/openapi.yaml =====

Route::prefix('v1')->group(function () {
    // المصادقة (عامة)
    Route::post('auth/register', [AuthController::class, 'register']);
    Route::post('auth/login', [AuthController::class, 'login']);

    // محميّة بتوكن Sanctum
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('auth/me', [AuthController::class, 'me']);
        Route::post('auth/logout', [AuthController::class, 'logout']);

        // 🔜 المرحلة 2: profile · public-profiles · conversations · …
    });
});
