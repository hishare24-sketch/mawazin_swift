<?php

use Illuminate\Support\Facades\Route;
use Modules\Reports\Http\Controllers\Admin\AdminReportController;

// تُحمَّل تحت البادئة api/admin + [auth:sanctum, admin] (bootstrap/app.php).

Route::get('reports/overview', [AdminReportController::class, 'overview']);
Route::get('reports/report', [AdminReportController::class, 'report']);
