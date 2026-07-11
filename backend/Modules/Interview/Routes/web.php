<?php

use Illuminate\Support\Facades\Route;
use Modules\Interview\Http\Controllers\Admin\AdminInterviewQualityController;

// تُحمَّل تحت البادئة api/admin + [auth:sanctum, admin] (bootstrap/app.php). جودة المقابلات (B3).

Route::get('interview-quality/stats', [AdminInterviewQualityController::class, 'stats']);
Route::get('interview-quality/calibration', [AdminInterviewQualityController::class, 'calibration']);

Route::get('interview-rubrics', [AdminInterviewQualityController::class, 'rubrics']);
Route::post('interview-rubrics', [AdminInterviewQualityController::class, 'storeRubric']);
Route::put('interview-rubrics/{rubric}', [AdminInterviewQualityController::class, 'updateRubric']);
Route::delete('interview-rubrics/{rubric}', [AdminInterviewQualityController::class, 'destroyRubric']);

Route::get('interview-quality', [AdminInterviewQualityController::class, 'board']);
Route::get('interview-quality/{interview}', [AdminInterviewQualityController::class, 'show']);
Route::post('interview-quality/{interview}/review', [AdminInterviewQualityController::class, 'review']);
