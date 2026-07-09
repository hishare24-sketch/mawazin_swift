<?php

namespace Modules\Notification\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Modules\Notification\Http\Resources\Api\NotificationResource;
use Modules\Notification\Services\NotificationService;

class NotificationController extends Controller
{
    public function __construct(private readonly NotificationService $service) {}

    public function index(Request $request)
    {
        return $this->dataResponse(NotificationResource::collection($this->service->list($request->user()->id)));
    }

    public function readAll(Request $request)
    {
        $this->service->markAllRead($request->user()->id);

        return response()->noContent();
    }
}
