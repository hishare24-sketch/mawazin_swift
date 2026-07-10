<?php

namespace Modules\Admin\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Modules\Admin\Enums\PermissionEnum;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    /** قائمة أدوار لوحة الأدمن مع صلاحيّاتها + كل الصلاحيّات المتاحة (مصفوفة الصلاحيّات). */
    public function index()
    {
        $this->authorize('view_roles');

        // عدّ حاملي كل دور عبر جدول pivot مباشرةً (تفادي حلّ علاقة users عبر guard مخصّص عبر الموديول)
        $counts = DB::table('model_has_roles')
            ->selectRaw('role_id, COUNT(*) as c')
            ->groupBy('role_id')
            ->pluck('c', 'role_id');

        $roles = Role::where('guard_name', 'admin')
            ->with('permissions')
            ->orderBy('id')
            ->get()
            ->map(fn (Role $role) => [
                'name' => $role->name,
                'usersCount' => (int) ($counts[$role->id] ?? 0),
                'permissions' => $role->permissions->pluck('name')->values(),
            ]);

        return $this->dataResponse([
            'roles' => $roles,
            'permissions' => PermissionEnum::permissions(),
        ]);
    }

    /**
     * تعديل صلاحيّات دور. super_admin محميّ (يبقى بكل الصلاحيّات دائمًا).
     * body: { permissions: string[] }
     */
    public function updatePermissions(Request $request, string $role)
    {
        $this->authorize('update_roles');

        if ($role === 'super_admin') {
            return $this->forbiddenResponse(__('The super_admin role always holds all permissions.'));
        }

        $target = Role::where(['name' => $role, 'guard_name' => 'admin'])->firstOrFail();

        $data = $request->validate([
            'permissions' => ['present', 'array'],
            'permissions.*' => ['string'],
        ]);

        // اقتصار على الصلاحيّات المعروفة فقط (حماية)
        $allowed = array_values(array_intersect($data['permissions'], PermissionEnum::permissions()));
        $target->syncPermissions($allowed);

        return $this->updatedResponse([
            'name' => $target->name,
            'permissions' => $allowed,
        ]);
    }
}
