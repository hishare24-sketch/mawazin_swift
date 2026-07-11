<?php

namespace Modules\Ai\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Modules\Ai\Entities\AssistantConversation;
use Modules\Ai\Entities\AssistantPreference;
use Modules\Ai\Services\AiUsageService;
use Modules\Ai\Services\AssistantService;
use Modules\Support\Entities\Ticket;

class AssistantController extends Controller
{
    public function __construct(
        private readonly AssistantService $service,
        private readonly AiUsageService $usage,
    ) {}

    /** لقطة سياق المستخدم + الحوكمة + الاقتراحات + التنبيهات + حصّة التوكن (شفافيّة: ما يعرفه المساعد). */
    public function context(Request $request)
    {
        $user = $request->user();
        $context = $this->service->context($user);

        return $this->dataResponse([
            'governance' => $this->service->governance(),
            'context' => $context,
            'suggestions' => $this->service->suggestions($context),
            'nudges' => $this->service->nudges($context),
            'quota' => $this->usage->snapshot($user),
        ]);
    }

    /** رسالة للمساعد — محكومة سياقيّة؛ إن كان محجوبًا يردّ ودّيًّا مع إتاحة التصعيد. */
    public function message(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'message' => ['required', 'string', 'max:2000'],
            'conversationId' => ['nullable', 'integer'],
        ]);

        $blocked = $this->service->blockedReason();

        $conversation = $this->resolveConversation($user, $data['conversationId'] ?? null, $data['message']);
        $conversation->messages()->create(['role' => 'user', 'body' => $data['message']]);

        if ($blocked !== null) {
            $conversation->messages()->create(['role' => 'assistant', 'body' => $blocked, 'meta' => ['blocked' => true]]);
            $conversation->touch();

            return $this->dataResponse([
                'conversationId' => $conversation->id,
                'reply' => $blocked,
                'blocked' => true,
                'canEscalate' => true,
                'meta' => ['blocked' => true],
                'nudges' => [],
            ]);
        }

        // إنفاذ حصّة التوكن (يوميّ/أسبوعيّ/شهريّ + حدّ الطلب) — الحجب مهذّب مع إتاحة التصعيد.
        $requestTokens = $this->usage->estimate($data['message']);
        $quotaBlock = $this->usage->check($user, $requestTokens);
        if ($quotaBlock !== null) {
            $conversation->messages()->create(['role' => 'assistant', 'body' => $quotaBlock['reason'], 'meta' => ['quotaBlocked' => $quotaBlock['kind']]]);
            $conversation->touch();

            return $this->dataResponse([
                'conversationId' => $conversation->id,
                'reply' => $quotaBlock['reason'],
                'blocked' => true,
                'quotaBlocked' => $quotaBlock['kind'],
                'canEscalate' => true,
                'meta' => ['quotaBlocked' => $quotaBlock['kind']],
                'nudges' => [],
                'quota' => $this->usage->snapshot($user),
            ]);
        }

        $context = $this->service->context($user);
        $composed = $this->service->compose($data['message'], $context);

        // قياس الاستهلاك: تفضيل ما يعيده المزوّد الحقيقيّ، وإلّا تقدير الردّ.
        $responseTokens = (int) ($composed['meta']['usage']['response'] ?? $this->usage->estimate($composed['reply']));
        $requestTokens = (int) ($composed['meta']['usage']['request'] ?? $requestTokens);
        $this->usage->record($user, $requestTokens, $responseTokens, $composed['meta']['provider'] ?? null, $composed['meta']['model'] ?? null);

        $conversation->messages()->create(['role' => 'assistant', 'body' => $composed['reply'], 'meta' => $composed['meta']]);
        $conversation->touch();

        return $this->dataResponse([
            'conversationId' => $conversation->id,
            'reply' => $composed['reply'],
            'blocked' => false,
            'canEscalate' => true,
            'meta' => $composed['meta'],
            'nudges' => $composed['meta']['nudges'] ?? [],
            'quota' => $this->usage->snapshot($user),
        ]);
    }

    /** محادثاتي (سجلّ). */
    public function conversations(Request $request)
    {
        $items = AssistantConversation::where('user_id', $request->user()->id)
            ->withCount('messages')->orderByDesc('updated_at')->limit(50)->get()
            ->map(fn (AssistantConversation $c) => [
                'id' => $c->id,
                'title' => $c->title,
                'messagesCount' => $c->messages_count,
                'updatedAt' => optional($c->updated_at)->toISOString(),
            ]);

        return $this->dataResponse($items);
    }

    /** محادثة واحدة (ملكيّة). */
    public function conversation(Request $request, AssistantConversation $conversation)
    {
        abort_unless($conversation->user_id === $request->user()->id, 403);

        return $this->dataResponse([
            'id' => $conversation->id,
            'title' => $conversation->title,
            'messages' => $conversation->messages->map(fn ($m) => [
                'id' => $m->id, 'role' => $m->role, 'body' => $m->body,
                'meta' => $m->meta, 'at' => optional($m->created_at)->toISOString(),
            ])->values(),
        ]);
    }

    /** إعدادات/خصوصيّة المساعد. */
    public function settings(Request $request)
    {
        $p = AssistantPreference::forUser($request->user()->id);

        return $this->dataResponse(['dataAccess' => $p->data_access, 'proactive' => $p->proactive]);
    }

    public function updateSettings(Request $request)
    {
        $data = $request->validate([
            'data_access' => ['sometimes', 'boolean'],
            'proactive' => ['sometimes', 'boolean'],
        ]);
        $p = AssistantPreference::forUser($request->user()->id);
        $p->fill($data)->save();

        return $this->updatedResponse(['dataAccess' => $p->data_access, 'proactive' => $p->proactive]);
    }

    /** تصعيد للدعم البشريّ — ينشئ تذكرة من محادثة المساعد (جسر AI ← إنسان). */
    public function escalate(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'conversationId' => ['nullable', 'integer'],
            'subject' => ['nullable', 'string', 'max:160'],
            'body' => ['nullable', 'string', 'max:2000'],
            'category' => ['nullable', 'string', 'max:40'],
            'priority' => ['nullable', 'in:low,normal,high,urgent'],
        ]);

        // لخّص من المحادثة إن وُجدت
        $summary = $data['body'] ?? null;
        $subject = $data['subject'] ?? 'طلب دعم من المساعد الذكيّ';
        if ($summary === null && ! empty($data['conversationId'])) {
            $conv = AssistantConversation::where('user_id', $user->id)->find($data['conversationId']);
            if ($conv) {
                $lastUser = $conv->messages()->where('role', 'user')->latest('id')->first();
                $summary = $lastUser?->body;
                $subject = $data['subject'] ?? Str::limit($conv->title, 120);
            }
        }
        $summary ??= 'يحتاج المستخدم إلى مساعدة الدعم البشريّ.';

        $ticket = Ticket::create([
            'user_id' => $user->id,
            'user_name' => $user->name,
            'subject' => $subject,
            'category' => $data['category'] ?? 'other',
            'priority' => $data['priority'] ?? 'normal',
            'status' => 'open',
            'last_reply_at' => Carbon::now(),
        ]);
        $ticket->replies()->create([
            'author_id' => $user->id,
            'author_name' => $user->name,
            'is_staff' => false,
            'body' => $summary,
        ]);

        return $this->createdResponse([
            'id' => $ticket->id,
            'subject' => $ticket->subject,
            'status' => $ticket->status,
        ]);
    }

    /** يحضر/ينشئ محادثة يملكها المستخدم. */
    private function resolveConversation($user, ?int $id, string $firstMessage): AssistantConversation
    {
        if ($id !== null) {
            $conv = AssistantConversation::where('user_id', $user->id)->find($id);
            if ($conv !== null) {
                return $conv;
            }
        }

        return AssistantConversation::create([
            'user_id' => $user->id,
            'title' => Str::limit($firstMessage, 40, ''),
        ]);
    }
}
