<?php

namespace Modules\Notification\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Modules\Notification\Entities\DeviceToken;

class DeviceTokenController extends Controller
{
    /** تسجيل توكن جهاز FCM للمستخدم (upsert — لا يُكرَّر التوكن). */
    public function store(Request $request)
    {
        $data = $request->validate([
            'token' => ['required', 'string', 'max:512'],
            'platform' => ['nullable', 'in:web,android,ios'],
        ]);

        $token = DeviceToken::updateOrCreate(
            ['token' => $data['token']],
            ['user_id' => $request->user()->id, 'platform' => $data['platform'] ?? 'web'],
        );

        return $this->createdResponse(['id' => $token->id]);
    }

    /** إلغاء تسجيل توكن (عند الخروج/إلغاء الإذن). */
    public function destroy(Request $request)
    {
        $data = $request->validate(['token' => ['required', 'string']]);

        DeviceToken::where('user_id', $request->user()->id)->where('token', $data['token'])->delete();

        return response()->noContent();
    }
}
