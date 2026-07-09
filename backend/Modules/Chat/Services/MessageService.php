<?php

namespace Modules\Chat\Services;

use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Modules\Chat\Entities\DirectMessage;
use Modules\PublicProfile\Entities\PublicProfile;
use Modules\User\Entities\User;

class MessageService
{
    public function send(string $senderId, string $senderName, array $data): DirectMessage
    {
        return DirectMessage::create([
            'sender_id' => $senderId,
            'sender_name' => $senderName,
            'recipient_id' => $data['recipientId'],
            'recipient_name' => $data['recipientName'],
            'body' => $data['body'],
            'read_at' => null,
        ]);
    }

    /** كل رسائل المستخدم (مُرسَلة ووارِدة) مرتّبة زمنيًّا. */
    public function listMine(string $uuid): Collection
    {
        return DirectMessage::where('sender_id', $uuid)
            ->orWhere('recipient_id', $uuid)
            ->orderBy('created_at')
            ->orderBy('id')
            ->get();
    }

    public function markThreadRead(string $uuid, string $peerId): void
    {
        DirectMessage::where('recipient_id', $uuid)
            ->where('sender_id', $peerId)
            ->whereNull('read_at')
            ->update(['read_at' => Carbon::now()]);
    }

    /** يحلّ مالك صفحة تعريفية من slug → uuid واسمه (لتوجيه «تواصل معي»). */
    public function resolveOwner(string $slug): ?array
    {
        $page = PublicProfile::where('slug', $slug)->first();
        if (! $page) {
            return null;
        }

        $user = User::find($page->user_id);
        if (! $user) {
            return null;
        }

        $name = ($page->doc['displayName'] ?? null) ?: $user->name;

        return ['ownerId' => $user->uuid, 'name' => $name];
    }
}
