<?php

namespace Modules\Notification\Services;

use Kreait\Firebase\Messaging\CloudMessage;
use Kreait\Firebase\Messaging\Notification as FcmNotification;
use Modules\Notification\Entities\DeviceToken;

/**
 * إشعارات Firebase Cloud Messaging (Push) — تُكمّل بثّ Reverb للوصول حين يُغلَق التطبيق.
 * محكومة: no-op آمن حين غياب اعتماد Firebase أو توكنات الجهاز؛ لا تكسر أيّ تدفّق.
 */
class FcmService
{
    /** يُرسِل Push لكلّ أجهزة المستخدم — يعيد عدد ما نجح. */
    public function sendToUser(int $userId, string $title, string $body, array $data = []): int
    {
        if (! $this->configured()) {
            return 0;
        }

        $tokens = DeviceToken::where('user_id', $userId)->pluck('token')->all();
        if ($tokens === []) {
            return 0;
        }

        return $this->dispatch($tokens, $title, $body, $data);
    }

    /** هل Firebase مُهيّأ (اعتماد موجود)؟ */
    public function configured(): bool
    {
        return (bool) (env('FIREBASE_CREDENTIALS') || config('firebase.projects.app.credentials'));
    }

    /** الإرسال الفعليّ عبر kreait — مُحاط بحماية فلا يعطّل شيئًا. */
    protected function dispatch(array $tokens, string $title, string $body, array $data): int
    {
        try {
            $messaging = app('firebase.messaging');
            $message = CloudMessage::new()
                ->withNotification(FcmNotification::create($title, $body))
                ->withData(array_map('strval', $data));

            $report = $messaging->sendMulticast($message, $tokens);

            // نظّف التوكنات غير الصالحة (أُلغيت من الجهاز)
            foreach ($report->invalidTokens() as $invalid) {
                DeviceToken::where('token', $invalid)->delete();
            }

            return $report->successes()->count();
        } catch (\Throwable $e) {
            report($e);

            return 0;
        }
    }
}
