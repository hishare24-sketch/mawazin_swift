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
                $sub->where('name', like_op(), "%{$q}%")
                    ->orWhere('email', like_op(), "%{$q}%")
                    ->orWhere('uuid', like_op(), "%{$q}%");
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

    /** إنشاء مستخدم جديد (دعوة يدويّة من الأدمن). */
    public function store(Request $request)
    {
        $this->authorize('create_users');

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', Rule::unique('users', 'email')],
            'password' => ['required', 'string', 'min:6'],
            'role' => ['nullable', 'string', 'max:40'],
            'tier' => ['nullable', Rule::in(['free', 'pro', 'elite'])],
            'kind' => ['nullable', Rule::in(['individual', 'organization'])],
            'phone' => ['nullable', 'string', 'max:40'],
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'role' => $data['role'] ?? 'seeker',
            'tier' => $data['tier'] ?? 'free',
            'kind' => $data['kind'] ?? 'individual',
            'phone' => $data['phone'] ?? null,
        ]);

        return $this->createdResponse((new AdminUserResource($user->load('roles')))->resolve());
    }

    /** إحصاءات المستخدمين — عدّادات + توزيع الأدوار/الطبقات + سلسلة تسجيلات. */
    public function stats()
    {
        $this->authorize('view_users');

        $total = User::count();
        $byRole = User::selectRaw('role, COUNT(*) as c')->groupBy('role')->pluck('c', 'role')
            ->map(fn ($c, $x) => ['label' => $x, 'value' => (int) $c])->values();
        $byTier = User::selectRaw('tier, COUNT(*) as c')->groupBy('tier')->pluck('c', 'tier')
            ->map(fn ($c, $x) => ['label' => $x, 'value' => (int) $c])->values();

        $raw = User::where('created_at', '>=', \Illuminate\Support\Carbon::now()->subDays(13)->startOfDay())
            ->selectRaw('DATE(created_at) as d, COUNT(*) as c')->groupBy('d')->pluck('c', 'd');
        $series = [];
        for ($i = 13; $i >= 0; $i--) {
            $date = \Illuminate\Support\Carbon::now()->subDays($i)->toDateString();
            $series[] = ['date' => $date, 'value' => (int) ($raw[$date] ?? 0)];
        }

        return $this->dataResponse([
            'total' => $total,
            'suspended' => User::where('status', 'suspended')->count(),
            'organizations' => User::where('kind', 'organization')->count(),
            'admins' => (int) \Illuminate\Support\Facades\DB::table('model_has_roles')->distinct('model_id')->count('model_id'),
            'byRole' => $byRole,
            'byTier' => $byTier,
            'series' => $series,
        ]);
    }

    /** تفصيل مستخدم واحد — مُثرًى بالمحفظة وعدّادات النشاط (استعراض عميق). */
    public function show(User $user)
    {
        $this->authorize('view_users');

        $data = (new AdminUserResource($user->load('roles')))->resolve();
        $data['wallet'] = (float) (\Modules\Account\Entities\Wallet::where('user_id', $user->id)->value('balance') ?? 0);
        $data['stats'] = [
            'opportunities' => \Modules\Marketplace\Entities\Opportunity::where('user_id', $user->id)->count(),
            'applications' => \Modules\Marketplace\Entities\Application::where('user_id', $user->id)->count(),
            'surveys' => \Modules\Survey\Entities\Survey::where('user_id', $user->id)->count(),
        ];

        return $this->dataResponse($data);
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
        audit_changes(['user' => $user->name, 'status' => ['from' => 'active', 'to' => 'suspended']]);

        return $this->updatedResponse((new AdminUserResource($user->load('roles')))->resolve());
    }

    /** إعادة تفعيل الحساب. */
    public function activate(User $user)
    {
        $this->authorize('update_users');

        $from = $user->status;
        $user->update(['status' => 'active']);
        audit_changes(['user' => $user->name, 'status' => ['from' => $from, 'to' => 'active']]);

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

        $before = $user->roles->where('guard_name', 'admin')->pluck('name')->values()->all();

        // نزع كل أدوار guard=admin ثم إسناد المطلوب — بكائنات Role (الاسم النصّيّ يُحلّ على guard=web الافتراضيّ للنموذج فيفشل)
        foreach ($user->roles->where('guard_name', 'admin') as $current) {
            $user->removeRole($current);
        }
        if (! empty($data['role'])) {
            $role = Role::where(['name' => $data['role'], 'guard_name' => 'admin'])->firstOrFail();
            $user->assignRole($role);
        }

        audit_changes(['user' => $user->name, 'from' => $before, 'to' => $data['role'] ? [$data['role']] : []]);

        return $this->updatedResponse((new AdminUserResource($user->load('roles')))->resolve());
    }
}
