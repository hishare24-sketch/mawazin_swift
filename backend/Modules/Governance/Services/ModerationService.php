<?php

namespace Modules\Governance\Services;

use Illuminate\Support\Carbon;
use Modules\Governance\Entities\ModerationItem;
use Modules\Marketplace\Entities\MarketRequest;
use Modules\Marketplace\Entities\Opportunity;
use Modules\Notification\Services\NotificationService;
use Modules\User\Entities\User;

/**
 * منطق الإشراف والحوكمة: استقبال البلاغات + بتّها بفعل حقيقيّ على الهدف + إخطار المُبلِّغ.
 * (الكنترولر رفيع — كلّ القرار هنا.)
 */
class ModerationService
{
    public function __construct(private readonly NotificationService $notifications) {}

    /** بلاغ محتوى من مستخدم → عنصر مراجعة معلّق (لا يُكرَّر لنفس الهدف من نفس المُبلِّغ وهو معلّق). */
    public function report(User $user, array $data): ModerationItem
    {
        return ModerationItem::firstOrCreate(
            [
                'submitted_by' => $user->id,
                'target_ref' => $data['targetRef'],
                'status' => 'pending',
            ],
            [
                'type' => $data['type'] ?? 'content_report',
                'subject' => $data['subject'],
                'submitter_name' => $user->name,
                'reason' => $data['reason'] ?? null,
            ],
        );
    }

    /**
     * بتّ عنصر: يضبط الحالة + يخطر المُبلِّغ + (لبلاغ محتوى مقبول) يزيل الهدف فعليًّا.
     * يفترض المستدعي أنّ العنصر معلّق.
     */
    public function resolve(ModerationItem $item, string $decision, User $admin): ModerationItem
    {
        $from = $item->status;

        $takedown = null;
        if ($item->type === 'content_report' && $decision === 'approved') {
            $takedown = $this->takedownTarget($item->target_ref); // البلاغ صحيح → يُزال المحتوى
        }

        $item->update([
            'status' => $decision,
            'resolved_by' => $admin->id,
            'resolver_name' => $admin->name,
            'resolved_at' => Carbon::now(),
            'meta' => array_merge($item->meta ?? [], $takedown ? ['takedown' => $takedown] : []),
        ]);

        $this->notifySubmitter($item, $decision, $takedown);
        audit_changes(array_filter([
            'status' => ['from' => $from, 'to' => $decision],
            'subject' => $item->subject,
            'takedown' => $takedown,
        ]));

        return $item;
    }

    /** بتّ جماعيّ — يعيد عدد ما بُتّ فعلًا (المعلّق فقط). */
    public function bulkResolve(array $ids, string $decision, User $admin): int
    {
        $count = 0;
        foreach (ModerationItem::whereIn('id', $ids)->where('status', 'pending')->get() as $item) {
            $this->resolve($item, $decision, $admin);
            $count++;
        }

        return $count;
    }

    /** لقطة الهدف (لواجهة التفصيل) — يحلّ opportunity/request إلى عنوان/حالة إن وُجد. */
    public function targetSnapshot(?string $targetRef): ?array
    {
        [$type, $id] = $this->parseRef($targetRef);
        if ($type === null) {
            return null;
        }

        $model = match ($type) {
            'opportunity' => Opportunity::withTrashed()->find($id),
            'request', 'market_request' => MarketRequest::withTrashed()->find($id),
            default => null,
        };

        return [
            'type' => $type,
            'id' => $id,
            'title' => $model?->title,
            'exists' => $model !== null,
            'removed' => $model !== null && $model->trashed(),
        ];
    }

    /** يزيل الهدف فعليًّا (حذف ناعم) إن كان مورَدًا قابلًا للإزالة. */
    private function takedownTarget(?string $targetRef): ?array
    {
        [$type, $id] = $this->parseRef($targetRef);
        if ($type === null) {
            return null;
        }

        $model = match ($type) {
            'opportunity' => Opportunity::find($id),
            'request', 'market_request' => MarketRequest::find($id),
            default => null,
        };

        $removed = false;
        if ($model !== null) {
            $model->delete(); // حذف ناعم — يبقى في الأرشيف قابلًا للاستعادة
            $removed = true;
        }

        return ['type' => $type, 'id' => $id, 'removed' => $removed];
    }

    /** يخطر المُبلِّغ/مقدّم الطلب بالقرار (إن كان مستخدمًا معروفًا). */
    private function notifySubmitter(ModerationItem $item, string $decision, ?array $takedown): void
    {
        if ($item->submitted_by === null) {
            return; // عنصر مبذور بلا مالك حقيقيّ
        }

        $approved = $decision === 'approved';
        $this->notifications->push($item->submitted_by, [
            'icon' => $approved ? 'mdi-check-decagram' : 'mdi-information-outline',
            'title' => __('Update on your report: :subject', ['subject' => $item->subject]),
            'body' => $takedown && $takedown['removed']
                ? __('The reported content was reviewed and removed.')
                : __('Your submission was reviewed. Decision: :decision', ['decision' => $decision]),
            'category' => 'governance',
        ]);
    }

    /** يفكّ "type:id" → [type, id] أو [null, null]. */
    private function parseRef(?string $ref): array
    {
        if (! $ref || ! str_contains($ref, ':')) {
            return [null, null];
        }
        [$type, $id] = explode(':', $ref, 2);

        return ctype_digit($id) ? [$type, (int) $id] : [null, null];
    }
}
