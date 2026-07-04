<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * المصادقة — يطابق /auth/* في api/openapi.yaml.
 * التوكن عبر Sanctum (Personal Access Token) — الواجهة ترسله Bearer.
 */
class AuthController extends Controller
{
    /** تسجيل حساب جديد (كل الأدوار متاحة فورًا — فلسفة الحساب الموحّد). */
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'phone' => ['nullable', 'string', 'max:32'],
            'role' => ['nullable', 'string', 'max:32'],
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'phone' => $data['phone'] ?? null,
            'role' => $data['role'] ?? 'seeker',
        ]);

        return $this->tokenResponse($user, 201);
    }

    /** تسجيل الدخول بالبريد وكلمة المرور. */
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $data['email'])->first();
        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['بيانات الدخول غير صحيحة'],
            ]);
        }

        return $this->tokenResponse($user);
    }

    /** المستخدم الحالي من التوكن. */
    public function me(Request $request): JsonResponse
    {
        return response()->json(['data' => $request->user()]);
    }

    /** إبطال التوكن الحالي (خروج). */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'تم تسجيل الخروج']);
    }

    /** استجابة موحّدة: المستخدم + توكن جديد. */
    private function tokenResponse(User $user, int $status = 200): JsonResponse
    {
        $token = $user->createToken('api')->plainTextToken;

        return response()->json([
            'data' => [
                'user' => $user,
                'token' => $token,
            ],
        ], $status);
    }
}
