<?php

use Illuminate\Support\Facades\Route;
use Modules\Account\Http\Controllers\Admin\AdminPlanController;
use Modules\Account\Http\Controllers\Admin\AdminPlatformAccountController;
use Modules\Account\Http\Controllers\Admin\AdminWalletController;

// تُحمَّل تحت البادئة api/admin + [auth:sanctum, admin] (bootstrap/app.php).

Route::get('wallets/stats', [AdminWalletController::class, 'stats']);
Route::get('wallets', [AdminWalletController::class, 'index']);
Route::post('wallets/{wallet}/adjust', [AdminWalletController::class, 'adjust']);

// خزينة المنصّة (حسابات بنكيّة + دفتر حركات)
Route::get('platform-accounts/stats', [AdminPlatformAccountController::class, 'stats']);
Route::get('platform-accounts', [AdminPlatformAccountController::class, 'index']);
Route::post('platform-accounts', [AdminPlatformAccountController::class, 'store']);
Route::get('platform-accounts/{account}/transactions', [AdminPlatformAccountController::class, 'transactions']);
Route::post('platform-accounts/{account}/adjust', [AdminPlatformAccountController::class, 'adjust']);
Route::put('platform-accounts/{account}', [AdminPlatformAccountController::class, 'update']);
Route::delete('platform-accounts/{account}', [AdminPlatformAccountController::class, 'destroy']);

Route::get('plans/stats', [AdminPlanController::class, 'stats']);
Route::get('plans', [AdminPlanController::class, 'index']);
Route::post('plans', [AdminPlanController::class, 'store']);
Route::put('plans/{plan}', [AdminPlanController::class, 'update']);
Route::delete('plans/{plan}', [AdminPlanController::class, 'destroy']);
