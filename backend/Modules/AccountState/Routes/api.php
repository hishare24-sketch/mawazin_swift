<?php

use Illuminate\Support\Facades\Route;
use Modules\AccountState\Http\Controllers\Api\AccountStateController;

// تُحمَّل تحت البادئة api/v1 (bootstrap/app.php)
Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('account-states/{store}', [AccountStateController::class, 'show']);
    Route::put('account-states/{store}', [AccountStateController::class, 'update']);
});
