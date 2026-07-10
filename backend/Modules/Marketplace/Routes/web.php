<?php

use Illuminate\Support\Facades\Route;
use Modules\Marketplace\Http\Controllers\Admin\AdminOpportunityController;
use Modules\Marketplace\Http\Controllers\Admin\AdminRequestController;

// تُحمَّل تحت البادئة api/admin + [auth:sanctum, admin] (bootstrap/app.php).

Route::get('opportunities', [AdminOpportunityController::class, 'index']);
Route::delete('opportunities/{opportunity}', [AdminOpportunityController::class, 'destroy']);

Route::get('requests', [AdminRequestController::class, 'index']);
Route::delete('requests/{request}', [AdminRequestController::class, 'destroy']);
