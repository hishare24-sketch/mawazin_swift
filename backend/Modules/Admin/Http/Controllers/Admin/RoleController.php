<?php

namespace Modules\Admin\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Modules\Admin\Enums\PermissionEnum;
use Modules\User\Entities\User;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    /** الأدوار النظاميّة المحميّة من الحذف/التعديل الهيكليّ. */
    private const SYSTEM_ROLES = ['super_admin', 'admin', 'governance'];
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

    /** إحصاءات الأدوار — عدّادات + الحاملون لكلّ دور + عدد الصلاحيّات لكلّ دور. */
    public function stats()
    {
        $this->authorize('view_roles');

        $counts = DB::table('model_has_roles')
            ->selectRaw('role_id, COUNT(DISTINCT model_id) as c')
            ->groupBy('role_id')
            ->pluck('c', 'role_id');

        $roles = Role::where('guard_name', 'admin')->withCount('permissions')->orderBy('id')->get();

        // إجمالي حسابات الأدمن المميّزة (أيّ دور على guard admin)
        $adminUsers = (int) DB::table('model_has_roles')
            ->whereIn('role_id', $roles->pluck('id'))
            ->distinct('model_id')
            ->count('model_id');

        return $this->dataResponse([
            'totalRoles' => $roles->count(),
            'systemRoles' => $roles->whereIn('name', self::SYSTEM_ROLES)->count(),
            'customRoles' => $roles->whereNotIn('name', self::SYSTEM_ROLES)->count(),
            'adminUsers' => $adminUsers,
            'holders' => $roles->map(fn (Role $r) => ['label' => $r->name, 'value' => (int) ($counts[$r->id] ?? 0)])->values(),
            'permissionCounts' => $roles->map(fn (Role $r) => ['label' => $r->name, 'value' => (int) $r->permissions_count])->values(),
        ]);
    }

    /** إنشاء دور جديد على guard admin (اسم فريد + صلاحيّات اختياريّة). */
    public function store(Request $request)
    {
        $this->authorize('create_roles');

        $data = $request->validate([
            'name' => ['required', 'string', 'max:40', 'regex:/^[a-z][a-z0-9_]*$/', Rule::unique('roles', 'name')->where('guard_name', 'admin')],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string'],
        ]);

        // إنشاء الدور على guard admin ثمّ إسناد الصلاحيّات المعروفة فقط
        $role = Role::create(['name' => $data['name'], 'guard_name' => 'admin']);
        $allowed = array_values(array_intersect($data['permissions'] ?? [], PermissionEnum::permissions()));
        if ($allowed) {
            $role->syncPermissions($allowed);
        }

        audit_changes(['role' => $role->name, 'granted' => $allowed]);

        return $this->createdResponse([
            'name' => $role->name,
            'usersCount' => 0,
            'permissions' => $allowed,
        ]);
    }

    /** حذف دور — الأدوار النظاميّة محميّة، والأدوار المأهولة لا تُحذف. */
    public function destroy(string $role)
    {
        $this->authorize('delete_roles');

        if (in_array($role, self::SYSTEM_ROLES, true)) {
            return $this->forbiddenResponse(__('System roles cannot be deleted.'));
        }

        $target = Role::where(['name' => $role, 'guard_name' => 'admin'])->firstOrFail();

        $holders = DB::table('model_has_roles')->where('role_id', $target->id)->count();
        if ($holders > 0) {
            return $this->forbiddenResponse(__('Cannot delete a role that is still assigned to users.'));
        }

        audit_changes(['role' => $role, 'deleted' => true]);
        $target->delete();

        return $this->updatedResponse(null, __('Deleted successfully'));
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

        // فرق قبل/بعد (تدقيق دقيق للتغيير على الصلاحيّات)
        $before = $target->permissions->pluck('name')->values()->all();
        $added = array_values(array_diff($allowed, $before));
        $removed = array_values(array_diff($before, $allowed));

        $target->syncPermissions($allowed);

        if ($added || $removed) {
            audit_changes(['role' => $role, 'added' => $added, 'removed' => $removed]);
        }

        return $this->updatedResponse([
            'name' => $target->name,
            'permissions' => $allowed,
        ]);
    }

    /** حاملو دور محدّد (إدارة عضويّة الأدوار — عمق RBAC). */
    public function members(string $role)
    {
        $this->authorize('view_roles');

        $target = Role::where(['name' => $role, 'guard_name' => 'admin'])->firstOrFail();
        $ids = DB::table('model_has_roles')->where('role_id', $target->id)->pluck('model_id');
        $members = User::whereIn('id', $ids)->orderBy('name')->get(['id', 'name', 'email', 'status'])
            ->map(fn (User $u) => ['id' => $u->id, 'name' => $u->name, 'email' => $u->email, 'status' => $u->status]);

        return $this->dataResponse(['role' => $role, 'members' => $members]);
    }

    /** إسناد دور لمستخدم (يجعله أدمن بصلاحيّات الدور). */
    public function assign(Request $request, string $role)
    {
        $this->authorize('update_roles');

        $target = Role::where(['name' => $role, 'guard_name' => 'admin'])->firstOrFail();
        $data = $request->validate(['userId' => ['required', 'integer', Rule::exists('users', 'id')]]);
        $user = User::findOrFail($data['userId']);

        if ($user->hasRole($target)) {
            return $this->forbiddenResponse(__('User already holds this role.'));
        }

        $user->assignRole($target);
        audit_changes(['role' => $role, 'assigned' => $user->name, 'userId' => $user->id]);

        return $this->updatedResponse(['id' => $user->id, 'name' => $user->name, 'email' => $user->email, 'status' => $user->status]);
    }

    /** نزع دور من مستخدم — لا يُنزع آخر super_admin (حارس القفل). */
    public function revoke(Request $request, string $role)
    {
        $this->authorize('update_roles');

        $target = Role::where(['name' => $role, 'guard_name' => 'admin'])->firstOrFail();
        $data = $request->validate(['userId' => ['required', 'integer']]);
        $user = User::findOrFail($data['userId']);

        // حارس آخر super_admin — يُطبَّق فقط حين يكون الهدف حاملًا فعلًا (وإلّا 405 زائف لغير الحامل).
        if ($role === 'super_admin' && $user->hasRole($target)) {
            $holders = DB::table('model_has_roles')->where('role_id', $target->id)->count();
            if ($holders <= 1) {
                return $this->forbiddenResponse(__('Cannot revoke the last super_admin.'));
            }
        }

        $user->removeRole($target);
        audit_changes(['role' => $role, 'revoked' => $user->name, 'userId' => $user->id]);

        return $this->updatedResponse(null, __('Updated successfully'));
    }
}
