<?php

use Illuminate\Support\Facades\Route;
use Modules\Admin\Http\Controllers\Admin\AdminUserController;
use Modules\Admin\Http\Controllers\Admin\RoleController;
use Modules\Admin\Http\Controllers\Admin\StatsController;

// تُحمَّل تحت البادئة api/admin + [auth:sanctum, admin] (bootstrap/app.php).
// كل متحكّم يفرض صلاحيّته الدقيقة عبر authorize('...').

// النظرة العامّة
Route::get('stats', [StatsController::class, 'index']);

// المستخدمون
Route::get('users/stats', [AdminUserController::class, 'stats']);
Route::get('users', [AdminUserController::class, 'index']);
Route::post('users', [AdminUserController::class, 'store']);
Route::get('users/{user}', [AdminUserController::class, 'show']);
Route::patch('users/{user}', [AdminUserController::class, 'update']);
Route::post('users/{user}/suspend', [AdminUserController::class, 'suspend']);
Route::post('users/{user}/activate', [AdminUserController::class, 'activate']);
Route::put('users/{user}/admin-role', [AdminUserController::class, 'setAdminRole']);

// الأدوار والصلاحيّات
Route::get('roles/stats', [RoleController::class, 'stats']);
Route::get('roles', [RoleController::class, 'index']);
Route::post('roles', [RoleController::class, 'store']);
Route::get('roles/{role}/members', [RoleController::class, 'members']);
Route::post('roles/{role}/assign', [RoleController::class, 'assign']);
Route::post('roles/{role}/revoke', [RoleController::class, 'revoke']);
Route::put('roles/{role}/permissions', [RoleController::class, 'updatePermissions']);
Route::delete('roles/{role}', [RoleController::class, 'destroy']);
