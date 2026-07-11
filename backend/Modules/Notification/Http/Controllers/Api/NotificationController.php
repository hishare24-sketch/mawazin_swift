<?php

namespace Modules\Notification\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Modules\Notification\Entities\Notification;
use Modules\Notification\Http\Resources\Api\NotificationResource;
use Modules\Notification\Services\NotificationService;

class NotificationController extends Controller
{
    public function __construct(private readonly NotificationService $service) {}

    public function index(Request $request)
    {
        $items = $this->service->list($request->user()->id);

        return $this->dataResponse(
            NotificationResource::collection($items)->resolve(),
            ['unread' => $this->service->unread($request->user()->id)]
        );
    }

    public function readAll(Request $request)
    {
        $this->service->markAllRead($request->user()->id);

        return response()->noContent();
    }

    /** تعليم إشعار واحد مقروءًا (ملكيّة). */
    public function readOne(Request $request, Notification $notification)
    {
        abort_unless($notification->user_id === $request->user()->id, 403);
        $notification->update(['read' => true]);

        return response()->noContent();
    }
}
