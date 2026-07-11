<?php

namespace Modules\User\Services;

use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Modules\User\Emails\WelcomeMail;
use Modules\User\Entities\User;

class AuthService
{
    public function register(array $data): array
    {
        // بوّابة التسجيل من إعدادات المنصّة (الافتراضيّ مسموح)
        if (! setting('registration.allow_signups', true)) {
            abort(403, __('Registration is currently disabled.'));
        }

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'phone' => $data['phone'] ?? null,
            'role' => $data['role'] ?? 'seeker',
            'kind' => $data['kind'] ?? 'individual',
        ]);

        // بريد ترحيبيّ عبر Resend (مُصفَّر؛ لا يعطّل الاستجابة ولا يكسر التسجيل لو فشل)
        Mail::to($user->email)->send(new WelcomeMail($user->name));

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
