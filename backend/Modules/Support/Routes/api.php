<?php

use Illuminate\Support\Facades\Route;
use Modules\Support\Http\Controllers\Api\TicketController;

// تُحمَّل تحت البادئة api/v1 (bootstrap/app.php). تذاكر الدعم من جهة المستخدم.
Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('support/tickets', [TicketController::class, 'index']);
    Route::post('support/tickets', [TicketController::class, 'store']);
    Route::get('support/tickets/{ticket}', [TicketController::class, 'show']);
    Route::post('support/tickets/{ticket}/reply', [TicketController::class, 'reply']);
});
