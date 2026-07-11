<?php

namespace Modules\Support\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Modules\Support\Entities\Ticket;
use Modules\Support\Events\TicketReplyPosted;
use Modules\Support\Http\Resources\Admin\AdminTicketResource;
use Modules\User\Entities\User;

class AdminTicketController extends Controller
{
    private const SORTABLE = ['id', 'subject', 'priority', 'status', 'created_at', 'last_reply_at'];
    private const STATUSES = ['open', 'pending', 'resolved', 'closed'];

    /** قائمة التذاكر — بحث + فلترة (حالة/فئة/أولويّة) + فرز + ترقيم. */
    public function index(Request $request)
    {
        $this->authorize('view_support');

        $query = Ticket::withCount('replies');

        if ($q = trim((string) $request->query('q', ''))) {
            $query->where(function ($sub) use ($q): void {
                $sub->where('subject', like_op(), "%{$q}%")->orWhere('user_name', like_op(), "%{$q}%");
            });
        }
        foreach (['status', 'category', 'priority'] as $filter) {
            if ($v = $request->query($filter)) {
                $query->where($filter, $v);
            }
        }

        [$column, $dir] = $this->parseSort((string) $request->query('sort', '-id'), self::SORTABLE);
        $query->orderBy($column, $dir);

        $items = $query->paginate((int) $request->query('perPage', 15));
        $items->setCollection(
            $items->getCollection()->map(fn (Ticket $t) => (new AdminTicketResource($t))->resolve())
        );

        return $this->dashboardResponse($items);
    }

    /** إحصاءات الدعم — العدّادات + التوزيع بالفئة/الأولويّة + سلسلة. */
    public function stats()
    {
        $this->authorize('view_support');

        $all = Ticket::get(['category', 'priority', 'status', 'created_at']);
        $byCategory = $all->groupBy('category')->map->count()->map(fn ($c, $x) => ['label' => $x, 'value' => (int) $c])->values();
        $byPriority = $all->groupBy('priority')->map->count()->map(fn ($c, $x) => ['label' => $x, 'value' => (int) $c])->values();

        $raw = Ticket::where('created_at', '>=', Carbon::now()->subDays(13)->startOfDay())
            ->selectRaw('DATE(created_at) as d, COUNT(*) as c')->groupBy('d')->pluck('c', 'd');
        $series = [];
        for ($i = 13; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i)->toDateString();
            $series[] = ['date' => $date, 'value' => (int) ($raw[$date] ?? 0)];
        }

        return $this->dataResponse([
            'total' => $all->count(),
            'open' => (int) $all->where('status', 'open')->count(),
            'pending' => (int) $all->where('status', 'pending')->count(),
            'resolved' => (int) $all->whereIn('status', ['resolved', 'closed'])->count(),
            'byCategory' => $byCategory,
            'byPriority' => $byPriority,
            'series' => $series,
        ]);
    }

    /** تفصيل تذكرة مع المحادثة الكاملة. */
    public function show(Ticket $ticket)
    {
        $this->authorize('view_support');

        return $this->dataResponse((new AdminTicketResource($ticket->load('replies')))->resolve());
    }

    /** ردّ فريق الدعم — يُضيف رسالة ويحدّث آخر ردّ (والحالة إلى pending إن كانت مفتوحة). */
    public function reply(Request $request, Ticket $ticket)
    {
        $this->authorize('manage_support');

        $data = $request->validate(['body' => ['required', 'string', 'max:2000']]);
        $user = current_user();

        $reply = $ticket->replies()->create([
            'author_id' => $user?->id,
            'author_name' => $user?->name ?? __('Support'),
            'is_staff' => true,
            'body' => $data['body'],
        ]);
        $ticket->update([
            'last_reply_at' => Carbon::now(),
            'status' => $ticket->status === 'open' ? 'pending' : $ticket->status,
        ]);

        // بثّ لحظيّ لصاحب التذكرة على قناته (إن وُجد uuid) — event() يبثّ ShouldBroadcast تلقائيًّا.
        if ($ownerUuid = User::whereKey($ticket->user_id)->value('uuid')) {
            event(new TicketReplyPosted(TicketReplyPosted::payloadFor($ticket, $reply), 'user.'.$ownerUuid));
        }

        return $this->updatedResponse((new AdminTicketResource($ticket->load('replies')))->resolve());
    }

    /** تغيير حالة التذكرة. */
    public function updateStatus(Request $request, Ticket $ticket)
    {
        $this->authorize('manage_support');

        $data = $request->validate(['status' => ['required', 'in:'.implode(',', self::STATUSES)]]);
        $ticket->update(['status' => $data['status']]);

        return $this->updatedResponse((new AdminTicketResource($ticket->loadCount('replies')))->resolve());
    }

    /** إسناد التذكرة لعضو دعم (المُنفِّذ الحاليّ افتراضًا). */
    public function assign(Request $request, Ticket $ticket)
    {
        $this->authorize('manage_support');

        $user = current_user();
        $ticket->update(['assigned_to' => $user?->id, 'assignee_name' => $user?->name]);

        return $this->updatedResponse((new AdminTicketResource($ticket->loadCount('replies')))->resolve());
    }
}
