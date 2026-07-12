<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * يفرض Accept: application/json على كلّ طلبات api/* قبل دخول الإطار،
 * فيعامل Laravel الطلب كطلب JSON: غير المصادَق → 401 JSON (لا تحويل لمسار
 * login غير الموجود الذي يُنتج 500)، وأخطاء التحقّق → 422 JSON. دفاع عميق
 * لا يعتمد على إرسال العميل للترويسة.
 */
class ForceJsonForApi
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->is('api/*')) {
            $request->headers->set('Accept', 'application/json');
        }

        return $next($request);
    }
}
