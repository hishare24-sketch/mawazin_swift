<?php

namespace Modules\Notification\Services;

use Illuminate\Support\Collection;
use Modules\Notification\Entities\Notification;

class NotificationService
{
    public function list(int $userId): Collection
    {
        if (Notification::where('user_id', $userId)->count() === 0) {
            // إشعار ترحيبيّ عند أول وصول
            $this->push($userId, [
                'icon' => 'mdi-hand-wave',
                'title' => __('Welcome to the smart recruitment system'),
                'body' => __('Complete your profile to raise your trust score and appear to employers.'),
                'category' => 'system',
                'actionTo' => '/profile',
            ]);
        }

        return Notification::where('user_id', $userId)->orderByDesc('id')->get();
    }

    /** إنشاء إشعار — يُستدعى داخليًّا من التدفّقات (حجز/قبول/رسالة…). */
    public function push(int $userId, array $data): Notification
    {
        return Notification::create([
            'user_id' => $userId,
            'icon' => $data['icon'] ?? 'mdi-bell',
            'title' => $data['title'],
            'body' => $data['body'] ?? '',
            'category' => $data['category'] ?? 'system',
            'action_to' => $data['actionTo'] ?? null,
            'read' => false,
        ]);
    }

    public function markAllRead(int $userId): void
    {
        Notification::where('user_id', $userId)->where('read', false)->update(['read' => true]);
    }
}
