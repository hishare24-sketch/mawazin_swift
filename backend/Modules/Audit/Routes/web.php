<?php

use Illuminate\Support\Facades\Route;
use Modules\Audit\Http\Controllers\Admin\AuditLogController;

// تُحمَّل تحت البادئة api/admin + [auth:sanctum, admin] (bootstrap/app.php).

Route::get('audit-logs/stats', [AuditLogController::class, 'stats']);
Route::get('audit-logs/export', [AuditLogController::class, 'export']);
Route::get('audit-logs', [AuditLogController::class, 'index']);
