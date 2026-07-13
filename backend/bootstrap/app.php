<?php

use App\Http\Middleware\AdminMiddleware;
use App\Http\Middleware\ForceJsonForApi;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Route;
use Modules\Audit\Http\Middleware\AuditMiddleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function (): void {
            // بثّ Reverb: مسار توثيق القنوات بحارس Sanctum (توكن Bearer) بدل web الافتراضيّ.
            // نسجّله يدويًّا (بدل تمرير channels: لـ withRouting) للتحكّم في الـ middleware.
            Broadcast::routes(['middleware' => ['auth:sanctum']]);
            require base_path('routes/channels.php');

            // عميل / تطبيق: /api/v1 (Sanctum) — يجمّع Modules/*/Routes/api.php
            Route::group(['prefix' => 'api/v1', 'middleware' => 'api'], function (): void {
                foreach (glob(base_path('Modules/*/Routes/api.php')) as $file) {
                    require $file;
                }
            });

            // لوحة الأدمن: /api/admin — يجمّع Modules/*/Routes/web.php (+ تدقيق آليّ للأفعال)
            Route::group(['prefix' => 'api/admin', 'middleware' => ['api', 'auth:sanctum', 'admin', AuditMiddleware::class]], function (): void {
                foreach (glob(base_path('Modules/*/Routes/web.php')) as $file) {
                    require $file;
                }
            });
        },
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // خلف nginx/Docker: اعتمد X-Forwarded-* حتى تُولَّد روابط https صحيحة
        $middleware->trustProxies(at: '*');
        // يفرض معاملة كلّ طلبات api/* كـJSON (غير المصادَق → 401 لا 500 login-redirect).
        $middleware->prepend(ForceJsonForApi::class);
        $middleware->alias([
            'admin' => AdminMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
