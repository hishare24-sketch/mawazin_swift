<?php

use Illuminate\Support\Facades\Route;
use Modules\Governance\Http\Controllers\Admin\AdminModerationController;

// تُحمَّل تحت البادئة api/admin + [auth:sanctum, admin] (bootstrap/app.php).

Route::get('moderation/stats', [AdminModerationController::class, 'stats']);
Route::post('moderation/bulk-resolve', [AdminModerationController::class, 'bulkResolve']);
Route::get('moderation', [AdminModerationController::class, 'index']);
Route::get('moderation/{item}', [AdminModerationController::class, 'show']);
Route::post('moderation/{item}/resolve', [AdminModerationController::class, 'resolve']);
