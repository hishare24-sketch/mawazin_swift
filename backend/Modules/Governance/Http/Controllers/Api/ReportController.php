<?php

namespace Modules\Governance\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Modules\Governance\Http\Requests\Api\CreateReportRequest;
use Modules\Governance\Services\ModerationService;

class ReportController extends Controller
{
    public function __construct(private readonly ModerationService $service) {}

    /** بلاغ محتوى من المستخدم → طابور الإشراف. */
    public function store(CreateReportRequest $request)
    {
        $item = $this->service->report($request->user(), $request->validated());

        return $this->createdResponse(['id' => $item->id, 'status' => $item->status]);
    }
}
