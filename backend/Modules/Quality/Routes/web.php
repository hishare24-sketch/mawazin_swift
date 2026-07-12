<?php

use Illuminate\Support\Facades\Route;
use Modules\Quality\Http\Controllers\Admin\AdminQualityController;

// تُحمَّل تحت البادئة api/admin + [auth:sanctum, admin] (bootstrap/app.php).
// مركز قيادة الجودة — اللوحة الذرّية (ف1: قراءة حالات الاختبار).

Route::get('quality/overview', [AdminQualityController::class, 'overview']);
Route::get('quality/atoms', [AdminQualityController::class, 'atoms']);

// التحويل (لوحة الأقسام / kanban) — ف2
Route::get('quality/board', [AdminQualityController::class, 'board']);
Route::post('quality/atoms/{testCase}/dispatch', [AdminQualityController::class, 'dispatchAtom']);
Route::patch('quality/dispatches/{dispatch}', [AdminQualityController::class, 'moveDispatch']);
Route::delete('quality/dispatches/{dispatch}', [AdminQualityController::class, 'destroyDispatch']);
