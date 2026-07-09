<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Support\Facades\Route;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
        then: function (): void {
            // عميل / تطبيق: /api/v1 (Sanctum) — يجمّع Modules/*/Routes/api.php
            Route::group(['prefix' => 'api/v1', 'middleware' => 'api'], function (): void {
                foreach (glob(base_path('Modules/*/Routes/api.php')) as $file) {
                    require $file;
                }
            });

            // لوحة الأدمن: /api/admin — يجمّع Modules/*/Routes/web.php
            Route::group(['prefix' => 'api/admin', 'middleware' => ['api', 'auth:sanctum', 'admin']], function (): void {
                foreach (glob(base_path('Modules/*/Routes/web.php')) as $file) {
                    require $file;
                }
            });
        },
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'admin' => \App\Http\Middleware\AdminMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
