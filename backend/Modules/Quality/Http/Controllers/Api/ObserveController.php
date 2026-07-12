<?php

namespace Modules\Quality\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Modules\Quality\Entities\RuntimeError;
use Modules\Quality\Services\RuleEngine;

/**
 * استيعاب إشارات وقت-التشغيل من المُلتقِط الأماميّ (POST /api/v1/observe) — عامّ
 * (بلا مصادقة، ليُلتقَط ما قبل الدخول). يمرّ بمحرّك القواعد ويجمّع بالبصمة.
 */
class ObserveController extends Controller
{
    public function store(Request $request, RuleEngine $engine)
    {
        $data = $request->validate([
            'type' => ['required', 'string', 'max:20'],
            'message' => ['required', 'string', 'max:2000'],
            'route' => ['nullable', 'string', 'max:300'],
            'status' => ['nullable', 'integer'],
            'layer' => ['nullable', 'string', 'max:20'],
            'scope' => ['nullable', 'string', 'max:40'],
            'stack' => ['nullable', 'string', 'max:6000'],
            'url' => ['nullable', 'string', 'max:500'],
            'blank' => ['nullable', 'boolean'],
        ]);

        $sig = $engine->evaluate($data + ['meta' => ['blank' => $data['blank'] ?? false]]);
        $now = Carbon::now();

        $rec = RuntimeError::where('fingerprint', $sig['fingerprint'])->first();
        if ($rec) {
            $rec->count += 1;
            $rec->last_seen_at = $now;
            $rec->message = $sig['message'];
            $rec->severity = $sig['severity'];
            $rec->route = $sig['route'];
            // عاد بعد الحلّ → انحدار؛ جديد → مستمرّ عند تكراره
            $rec->status = $rec->status === 'resolved' ? 'regressed' : ($rec->status === 'new' ? 'ongoing' : $rec->status);
            $rec->save();
        } else {
            $rec = RuntimeError::create([
                'fingerprint' => $sig['fingerprint'],
                'type' => $sig['type'],
                'message' => $sig['message'],
                'layer' => $sig['layer'],
                'scope' => $sig['scope'],
                'route' => $sig['route'],
                'severity' => $sig['severity'],
                'status' => 'new',
                'count' => 1,
                'first_seen_at' => $now,
                'last_seen_at' => $now,
                'meta' => ['url' => $data['url'] ?? null],
            ]);
        }

        return $this->dataResponse([
            'fingerprint' => $rec->fingerprint,
            'status' => $rec->status,
            'severity' => $rec->severity,
        ]);
    }
}
