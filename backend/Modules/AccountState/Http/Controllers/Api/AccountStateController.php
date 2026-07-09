<?php

namespace Modules\AccountState\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Modules\AccountState\Services\AccountStateService;

class AccountStateController extends Controller
{
    public function __construct(private readonly AccountStateService $service) {}

    public function show(Request $request, string $store)
    {
        return $this->dataResponse($this->service->get($request->user()->id, $store));
    }

    public function update(Request $request, string $store)
    {
        $data = $request->input('data');
        $this->service->put($request->user()->id, $store, $data);

        return $this->dataResponse($data);
    }
}
