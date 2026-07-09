<?php

use Illuminate\Support\Facades\Route;
use Modules\Chat\Http\Controllers\Api\MessageController;

// تُحمَّل تحت البادئة api/v1 (bootstrap/app.php)
Route::middleware('auth:sanctum')->group(function (): void {
    Route::post('direct-messages', [MessageController::class, 'send']);
    Route::get('direct-messages', [MessageController::class, 'listMine']);
    Route::post('direct-messages/read', [MessageController::class, 'markRead']);
    Route::get('direct-messages/resolve/{slug}', [MessageController::class, 'resolve']);
});
