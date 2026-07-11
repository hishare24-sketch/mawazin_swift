<?php

namespace Modules\Notification\Services;

use Illuminate\Support\Collection;
use Modules\Notification\Entities\Notification;
use Modules\Notification\Events\NotificationSent;
use Modules\User\Entities\User;

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

    /** إنشاء إشعار وبثّه لحظيًّا — يُستدعى داخليًّا من التدفّقات (حجز/قبول/رسالة/بثّ…). */
    public function push(int $userId, array $data): Notification
    {
        $notification = Notification::create([
            'user_id' => $userId,
            'icon' => $data['icon'] ?? 'mdi-bell',
            'title' => $data['title'],
            'body' => $data['body'] ?? '',
            'category' => $data['category'] ?? 'system',
            'action_to' => $data['actionTo'] ?? null,
            'read' => false,
        ]);

        $this->broadcast($notification, $data['uuid'] ?? User::whereKey($userId)->value('uuid'));

        return $notification;
    }

    /** بثّ إشعار مُنشأ للمستخدم على قناته (لا يكسر التدفّق عند غياب uuid). */
    private function broadcast(Notification $n, ?string $uuid): void
    {
        if (! $uuid) {
            return;
        }
        event(new NotificationSent([
            'id' => $n->id,
            'icon' => $n->icon,
            'title' => $n->title,
            'body' => $n->body ?? '',
            'category' => $n->category,
            'read' => false,
            'actionTo' => $n->action_to,
            'at' => optional($n->created_at)->toISOString(),
        ], $uuid));
    }

    public function markAllRead(int $userId): void
    {
        Notification::where('user_id', $userId)->where('read', false)->update(['read' => true]);
    }

    /** عدد غير المقروء. */
    public function unread(int $userId): int
    {
        return (int) Notification::where('user_id', $userId)->where('read', false)->count();
    }
}
