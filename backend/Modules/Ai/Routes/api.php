<?php

use Illuminate\Support\Facades\Route;
use Modules\Ai\Http\Controllers\Api\AssistantController;

// تُحمَّل تحت البادئة api/v1 (bootstrap/app.php). المساعد الذكيّ للمستخدم.
Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('assistant/context', [AssistantController::class, 'context']);
    Route::post('assistant/message', [AssistantController::class, 'message']);
    Route::get('assistant/conversations', [AssistantController::class, 'conversations']);
    Route::get('assistant/conversations/{conversation}', [AssistantController::class, 'conversation']);
    Route::get('assistant/settings', [AssistantController::class, 'settings']);
    Route::put('assistant/settings', [AssistantController::class, 'updateSettings']);
    Route::post('assistant/escalate', [AssistantController::class, 'escalate']);
});
