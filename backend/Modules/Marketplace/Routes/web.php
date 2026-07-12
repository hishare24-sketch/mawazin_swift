<?php

use Illuminate\Support\Facades\Route;
use Modules\Marketplace\Http\Controllers\Admin\AdminApplicationController;
use Modules\Marketplace\Http\Controllers\Admin\AdminMatchController;
use Modules\Marketplace\Http\Controllers\Admin\AdminOpportunityController;
use Modules\Marketplace\Http\Controllers\Admin\AdminRequestController;

// تُحمَّل تحت البادئة api/admin + [auth:sanctum, admin] (bootstrap/app.php).

Route::get('opportunities/stats', [AdminOpportunityController::class, 'stats']);
Route::get('opportunities', [AdminOpportunityController::class, 'index']);
Route::delete('opportunities/{opportunity}', [AdminOpportunityController::class, 'destroy']);

// خطّ أنابيب التوظيف (ATS)
Route::get('pipeline/board', [AdminApplicationController::class, 'board']);
Route::get('pipeline/stats', [AdminApplicationController::class, 'stats']);
Route::get('pipeline/opportunities', [AdminApplicationController::class, 'opportunities']);
Route::post('pipeline/applications/{application}/move', [AdminApplicationController::class, 'move']);
Route::post('pipeline/bulk-move', [AdminApplicationController::class, 'bulkMove']);

// المطابقة والفرز الذكيّ
Route::get('matching/settings', [AdminMatchController::class, 'settings']);
Route::put('matching/settings', [AdminMatchController::class, 'updateSettings']);
Route::get('matching/shortlist', [AdminMatchController::class, 'shortlist']);
Route::post('matching/explain', [AdminMatchController::class, 'explain']);

Route::get('requests/stats', [AdminRequestController::class, 'stats']);
Route::get('requests', [AdminRequestController::class, 'index']);
Route::delete('requests/{request}', [AdminRequestController::class, 'destroy']);
