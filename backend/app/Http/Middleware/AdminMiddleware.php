<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdminMiddleware
{
    /**
     * حارس لوحة الأدمن (/api/admin): المستخدم مصادَق (auth:sanctum) ويحمل دورًا على guard admin.
     * الفحص الدقيق للصلاحية يتمّ في كل متحكّم عبر $this->authorize('...').
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! $user->roles()->where('guard_name', 'admin')->exists()) {
            abort(403, __('You are not authorized to access the admin panel'));
        }

        return $next($request);
    }
}
