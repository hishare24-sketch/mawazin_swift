<?php

namespace Modules\Support\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Modules\Support\Entities\Ticket;

/**
 * تذاكر الدعم من جهة المستخدم — يملك المستخدم تذاكره فقط.
 * التذكرة = محادثة دعم (الردود = الشات الحيّ بين المستخدم وفريق الدعم).
 */
class TicketController extends Controller
{
    /** تذاكري (محادثات الدعم). */
    public function index(Request $request)
    {
        $items = Ticket::where('user_id', $request->user()->id)
            ->withCount('replies')->orderByDesc('last_reply_at')->orderByDesc('id')->get()
            ->map(fn (Ticket $t) => $this->row($t));

        return $this->dataResponse($items);
    }

    /** فتح تذكرة/محادثة دعم جديدة. */
    public function store(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'subject' => ['required', 'string', 'max:160'],
            'body' => ['required', 'string', 'max:2000'],
            'category' => ['nullable', 'in:billing,technical,account,other'],
            'priority' => ['nullable', 'in:low,normal,high,urgent'],
        ]);

        $ticket = Ticket::create([
            'user_id' => $user->id,
            'user_name' => $user->name,
            'subject' => $data['subject'],
            'category' => $data['category'] ?? 'other',
            'priority' => $data['priority'] ?? 'normal',
            'status' => 'open',
            'last_reply_at' => Carbon::now(),
        ]);
        $ticket->replies()->create([
            'author_id' => $user->id,
            'author_name' => $user->name,
            'is_staff' => false,
            'body' => $data['body'],
        ]);

        return $this->createdResponse($this->row($ticket->loadCount('replies')));
    }

    /** تذكرتي بالمحادثة الكاملة. */
    public function show(Request $request, Ticket $ticket)
    {
        abort_unless($ticket->user_id === $request->user()->id, 403);

        return $this->dataResponse($this->detail($ticket->load('replies')));
    }

    /** ردّ المستخدم على تذكرته (يعيد فتحها إن كانت محلولة). */
    public function reply(Request $request, Ticket $ticket)
    {
        abort_unless($ticket->user_id === $request->user()->id, 403);

        $data = $request->validate(['body' => ['required', 'string', 'max:2000']]);
        $user = $request->user();

        $ticket->replies()->create([
            'author_id' => $user->id,
            'author_name' => $user->name,
            'is_staff' => false,
            'body' => $data['body'],
        ]);
        $ticket->update([
            'last_reply_at' => Carbon::now(),
            'status' => in_array($ticket->status, ['resolved', 'closed'], true) ? 'open' : $ticket->status,
        ]);

        return $this->updatedResponse($this->detail($ticket->load('replies')));
    }

    private function row(Ticket $t): array
    {
        return [
            'id' => $t->id,
            'subject' => $t->subject,
            'category' => $t->category,
            'priority' => $t->priority,
            'status' => $t->status,
            'repliesCount' => $t->replies_count ?? $t->replies()->count(),
            'lastReplyAt' => optional($t->last_reply_at)->toISOString(),
            'createdAt' => optional($t->created_at)->toISOString(),
        ];
    }

    private function detail(Ticket $t): array
    {
        return array_merge($this->row($t), [
            'assignee' => $t->assignee_name,
            'replies' => $t->replies->map(fn ($r) => [
                'id' => $r->id,
                'author' => $r->author_name,
                'isStaff' => (bool) $r->is_staff,
                'body' => $r->body,
                'at' => optional($r->created_at)->toISOString(),
            ])->values(),
        ]);
    }
}
