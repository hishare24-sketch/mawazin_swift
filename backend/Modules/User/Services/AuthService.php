<?php

namespace Modules\User\Services;

use Illuminate\Support\Facades\Hash;
use Modules\User\Entities\User;

class AuthService
{
    public function register(array $data): array
    {
        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'phone' => $data['phone'] ?? null,
            'role' => $data['role'] ?? 'seeker',
            'kind' => $data['kind'] ?? 'individual',
        ]);

        return $this->sessionFor($user);
    }

    /** يعيد الجلسة أو null عند فشل بيانات الاعتماد. */
    public function login(array $data): ?array
    {
        $user = User::where('email', $data['email'])->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            return null;
        }

        // الحساب المُعلَّق من الأدمن يُمنع من الدخول (403 — البيانات صحيحة لكن الحساب موقوف)
        if ($user->isSuspended()) {
            abort(403, __('This account is suspended. Please contact support.'));
        }

        return $this->sessionFor($user);
    }

    public function logout(User $user): void
    {
        $user->currentAccessToken()?->delete();
    }

    private function sessionFor(User $user): array
    {
        return [
            'user' => $user,
            'token' => $user->createToken('api')->plainTextToken,
        ];
    }
}
