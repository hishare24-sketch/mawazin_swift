<?php

namespace Modules\Admin\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Modules\Admin\Http\Resources\Admin\AdminUserResource;
use Modules\User\Entities\User;
use Spatie\Permission\Models\Role;

class AdminUserController extends Controller
{
    /** أدوار لوحة الأدمن المسموح إسنادها (guard=admin). */
    private const ADMIN_ROLES = ['super_admin', 'admin', 'governance'];

    /** الأعمدة المسموح الفرز بها (حماية من الحقن). */
    private const SORTABLE = ['id', 'name', 'email', 'role', 'tier', 'status', 'created_at'];

    /**
     * قائمة المستخدمين — بحث + فلترة (role/tier/kind/status) + فرز + ترقيم خادميّ {data, meta}.
     * معاملات: q, role, tier, kind, status, sort (مثل "-created_at")، page، perPage.
     */
    public function index(Request $request)
    {
        $this->authorize('view_users');

        $query = User::with('roles');

        if ($q = trim((string) $request->query('q', ''))) {
            $query->where(function ($sub) use ($q): void {
                $sub->where('name', 'like', "%{$q}%")
                    ->orWhere('email', 'like', "%{$q}%")
                    ->orWhere('uuid', 'like', "%{$q}%");
            });
        }

        foreach (['role', 'tier', 'kind', 'status'] as $filter) {
            if ($value = $request->query($filter)) {
                $query->where($filter, $value);
            }
        }

        [$column, $dir] = $this->parseSort((string) $request->query('sort', '-id'), self::SORTABLE);
        $query->orderBy($column, $dir);

        $users = $query->paginate((int) $request->query('perPage', 15));
        $users->setCollection(
            $users->getCollection()->map(fn (User $user) => (new AdminUserResource($user))->resolve())
        );

        return $this->dashboardResponse($users);
    }

    /** تفصيل مستخدم واحد. */
    public function show(User $user)
    {
        $this->authorize('view_users');

        return $this->dataResponse((new AdminUserResource($user->load('roles')))->resolve());
    }

    /** تحديث بيانات المستخدم الأساسيّة. */
    public function update(Request $request, User $user)
    {
        $this->authorize('update_users');

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'email' => ['sometimes', 'email', Rule::unique('users', 'email')->ignore($user->id)],
            'role' => ['sometimes', 'string', 'max:40'],
            'tier' => ['sometimes', Rule::in(['free', 'pro', 'elite'])],
            'kind' => ['sometimes', Rule::in(['individual', 'organization'])],
            'phone' => ['sometimes', 'nullable', 'string', 'max:40'],
        ]);

        $user->update($data);

        return $this->updatedResponse((new AdminUserResource($user->load('roles')))->resolve());
    }

    /** تعليق الحساب (يُمنع من الدخول). لا يجوز تعليق النفس. */
    public function suspend(Request $request, User $user)
    {
        $this->authorize('update_users');

        if ($request->user()->id === $user->id) {
            return $this->forbiddenResponse(__('You cannot suspend your own account.'));
        }

        $user->update(['status' => 'suspended']);

        return $this->updatedResponse((new AdminUserResource($user->load('roles')))->resolve());
    }

    /** إعادة تفعيل الحساب. */
    public function activate(User $user)
    {
        $this->authorize('update_users');

        $user->update(['status' => 'active']);

        return $this->updatedResponse((new AdminUserResource($user->load('roles')))->resolve());
    }

    /**
     * ضبط دور لوحة الأدمن للمستخدم (ترقية/تنزيل).
     * body: { role: "super_admin"|"admin"|"governance"|null } — null يُزيل كل أدوار الأدمن.
     */
    public function setAdminRole(Request $request, User $user)
    {
        $this->authorize('update_roles');

        $data = $request->validate([
            'role' => ['present', 'nullable', Rule::in(self::ADMIN_ROLES)],
        ]);

        // نزع كل أدوار guard=admin ثم إسناد المطلوب — بكائنات Role (الاسم النصّيّ يُحلّ على guard=web الافتراضيّ للنموذج فيفشل)
        foreach ($user->roles->where('guard_name', 'admin') as $current) {
            $user->removeRole($current);
        }
        if (! empty($data['role'])) {
            $role = Role::where(['name' => $data['role'], 'guard_name' => 'admin'])->firstOrFail();
            $user->assignRole($role);
        }

        return $this->updatedResponse((new AdminUserResource($user->load('roles')))->resolve());
    }
}
