<?php

namespace Modules\Admin\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Modules\Admin\Http\Resources\Admin\AdminUserResource;
use Modules\User\Entities\User;

class AdminUserController extends Controller
{
    /** قائمة المستخدمين (لوحة الأدمن) — مقسّمة صفحات {data, meta}. */
    public function index(Request $request)
    {
        $this->authorize('view_users');

        $users = User::orderByDesc('id')->paginate((int) $request->query('perPage', 15));
        $users->setCollection(
            $users->getCollection()->map(fn (User $user) => (new AdminUserResource($user))->resolve())
        );

        return $this->dashboardResponse($users);
    }
}
