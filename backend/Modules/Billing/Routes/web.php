<?php

use Illuminate\Support\Facades\Route;
use Modules\Billing\Http\Controllers\Admin\AdminInvoiceController;

// تُحمَّل تحت البادئة api/admin + [auth:sanctum, admin] (bootstrap/app.php).

Route::get('invoices/stats', [AdminInvoiceController::class, 'stats']);
Route::get('invoices', [AdminInvoiceController::class, 'index']);
Route::post('invoices/{invoice}/refund', [AdminInvoiceController::class, 'refund']);
