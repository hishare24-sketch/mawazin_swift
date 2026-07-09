<?php

namespace Modules\Chat\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Modules\Chat\Events\MessageSent;
use Modules\Chat\Http\Requests\Api\ReadThreadRequest;
use Modules\Chat\Http\Requests\Api\SendMessageRequest;
use Modules\Chat\Http\Resources\Api\DirectMessageResource;
use Modules\Chat\Services\MessageService;

class MessageController extends Controller
{
    public function __construct(private readonly MessageService $service) {}

    public function send(SendMessageRequest $request)
    {
        $user = $request->user();
        $message = $this->service->send($user->uuid, $user->name, $request->validated());
        $payload = (new DirectMessageResource($message))->resolve();

        // بثّ لحظيّ للمستقبِل عبر Reverb (قناة خاصّة user.{uuid})
        broadcast(new MessageSent($payload));

        return response()->json($this->dataResponse($payload), 201);
    }

    public function listMine(Request $request)
    {
        return $this->dataResponse(DirectMessageResource::collection($this->service->listMine($request->user()->uuid)));
    }

    public function markRead(ReadThreadRequest $request)
    {
        $this->service->markThreadRead($request->user()->uuid, $request->validated()['peerId']);

        return response()->noContent();
    }

    public function resolve(string $slug)
    {
        return $this->dataResponse($this->service->resolveOwner($slug));
    }
}
