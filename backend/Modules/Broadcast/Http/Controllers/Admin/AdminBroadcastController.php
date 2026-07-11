<?php

namespace Modules\Broadcast\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Modules\Broadcast\Entities\Broadcast;
use Modules\Broadcast\Http\Resources\Admin\AdminBroadcastResource;
use Modules\Notification\Services\NotificationService;
use Modules\User\Entities\User;

class AdminBroadcastController extends Controller
{
    /** حدّ أمان للتوزيع اللحظيّ (يبقى العدّ في السجلّ كاملًا). */
    private const FANOUT_CAP = 1000;

    public function __construct(private readonly NotificationService $notifications) {}

    private const SORTABLE = ['id', 'title', 'channel', 'recipients_count', 'created_at'];
    private const CHANNELS = ['notification', 'banner', 'email'];
    private const AUDIENCES = ['all', 'role', 'tier'];

    /** سجلّ عمليّات البثّ. */
    public function index(Request $request)
    {
        $this->authorize('view_broadcast');

        $query = Broadcast::query();

        if ($q = trim((string) $request->query('q', ''))) {
            $query->where('title', like_op(), "%{$q}%");
        }
        foreach (['channel', 'audience'] as $filter) {
            if ($v = $request->query($filter)) {
                $query->where($filter, $v);
            }
        }

        [$column, $dir] = $this->parseSort((string) $request->query('sort', '-id'), self::SORTABLE);
        $query->orderBy($column, $dir);

        $items = $query->paginate((int) $request->query('perPage', 15));
        $items->setCollection(
            $items->getCollection()->map(fn (Broadcast $b) => (new AdminBroadcastResource($b))->resolve())
        );

        return $this->dashboardResponse($items);
    }

    /** إحصاءات البثّ — العدد + الوصول + التوزيع بالقناة/الجمهور. */
    public function stats()
    {
        $this->authorize('view_broadcast');

        $all = Broadcast::get(['channel', 'audience', 'recipients_count']);
        $byChannel = $all->groupBy('channel')->map->count()->map(fn ($c, $x) => ['label' => $x, 'value' => (int) $c])->values();
        $byAudience = $all->groupBy('audience')->map->count()->map(fn ($c, $x) => ['label' => $x, 'value' => (int) $c])->values();

        return $this->dataResponse([
            'total' => $all->count(),
            'reach' => (int) $all->sum('recipients_count'),
            'audienceSize' => User::count(),
            'byChannel' => $byChannel,
            'byAudience' => $byAudience,
        ]);
    }

    /** تقدير حجم الجمهور المستهدف قبل الإرسال. */
    public function audienceCount(Request $request)
    {
        $this->authorize('view_broadcast');

        $data = $request->validate([
            'audience' => ['required', 'in:'.implode(',', self::AUDIENCES)],
            'audience_value' => ['nullable', 'string', 'max:40'],
        ]);

        return $this->dataResponse(['count' => $this->recipientsFor($data['audience'], $data['audience_value'] ?? null)]);
    }

    /** إنشاء بثّ وإرساله — يحسب الجمهور المستهدف من المستخدمين. */
    public function store(Request $request)
    {
        $this->authorize('create_broadcast');

        $data = $request->validate([
            'title' => ['required', 'string', 'max:120'],
            'body' => ['required', 'string', 'max:1000'],
            'channel' => ['required', 'in:'.implode(',', self::CHANNELS)],
            'audience' => ['required', 'in:'.implode(',', self::AUDIENCES)],
            'audience_value' => ['nullable', 'required_unless:audience,all', 'string', 'max:40'],
        ]);

        $user = current_user();
        $recipients = $this->recipientsFor($data['audience'], $data['audience_value'] ?? null);

        $broadcast = Broadcast::create([
            ...$data,
            'status' => 'sent',
            'recipients_count' => $recipients,
            'sent_by' => $user?->id,
            'sender_name' => $user?->name,
            'sent_at' => Carbon::now(),
        ]);

        // قناة الإشعار → إنشاء إشعارات فعليّة وبثّها لحظيًّا لكلّ مستهدف (banner/email تُسجَّل فقط).
        if ($data['channel'] === 'notification') {
            foreach ($this->recipientUsers($data['audience'], $data['audience_value'] ?? null) as $u) {
                $this->notifications->push($u->id, [
                    'icon' => 'mdi-bullhorn-outline',
                    'title' => $data['title'],
                    'body' => $data['body'],
                    'category' => 'system',
                    'uuid' => $u->uuid, // مُحمَّل مسبقًا — لا استعلام إضافيّ
                ]);
            }
        }

        return $this->createdResponse((new AdminBroadcastResource($broadcast))->resolve());
    }

    /** عدد المستخدمين المطابقين للجمهور المستهدف. */
    private function recipientsFor(string $audience, ?string $value): int
    {
        return match ($audience) {
            'role' => $value ? User::where('role', $value)->count() : 0,
            'tier' => $value ? User::where('tier', $value)->count() : 0,
            default => User::count(),
        };
    }

    /** مستخدمو الجمهور المستهدف (id+uuid) بحدّ أمان التوزيع. */
    private function recipientUsers(string $audience, ?string $value)
    {
        $q = User::query()->select('id', 'uuid');
        if ($audience === 'role' && $value) {
            $q->where('role', $value);
        } elseif ($audience === 'tier' && $value) {
            $q->where('tier', $value);
        }

        return $q->limit(self::FANOUT_CAP)->get();
    }
}
