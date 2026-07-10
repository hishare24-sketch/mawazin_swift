<?php

namespace App\Http\Controllers;

use App\Http\Traits\ApiResponder;
use Illuminate\Foundation\Bus\DispatchesJobs;
use Illuminate\Routing\Controller as BaseController;

class Controller extends BaseController
{
    use ApiResponder, DispatchesJobs;

    /** فحص صلاحية أدمن المنصّة (guard admin) — Spatie. */
    public function checkAuthorize(string $permission): bool
    {
        $user = current_user();

        return $user !== null && $user->hasPermissionTo($permission, 'admin');
    }

    /** يُجهض 403 عند غياب الصلاحية (نمط hi-share). */
    public function authorize($ability, $arguments = [])
    {
        return $this->checkAuthorize($ability)
            ?: abort(403, __('You are not authorized to perform this action'));
    }

    /** يفكّ معامل فرز "-field" → [column, direction] مع قائمة بيضاء (حماية من الحقن). */
    protected function parseSort(string $sort, array $sortable, string $default = 'id'): array
    {
        $desc = str_starts_with($sort, '-');
        $column = ltrim($sort, '-');
        if (! in_array($column, $sortable, true)) {
            $column = $default;
        }

        return [$column, $desc ? 'desc' : 'asc'];
    }
}
