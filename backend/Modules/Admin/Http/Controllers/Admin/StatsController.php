<?php

namespace Modules\Admin\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Modules\Interview\Entities\Interview;
use Modules\Interviewer\Entities\Interviewer;
use Modules\Marketplace\Entities\MarketRequest;
use Modules\Marketplace\Entities\Opportunity;
use Modules\Survey\Entities\Survey;
use Modules\User\Entities\User;

class StatsController extends Controller
{
    /** مؤشّرات لوحة النظرة العامّة — عدّادات + توزيعات + سلسلة تسجيلات 14 يومًا. */
    public function index()
    {
        $this->authorize('view_analytics');

        return $this->dataResponse([
            'totals' => [
                'users' => User::count(),
                'suspended' => User::where('status', 'suspended')->count(),
                'opportunities' => Opportunity::count(),
                'requests' => MarketRequest::count(),
                'interviews' => Interview::count(),
                'interviewers' => Interviewer::count(),
                'surveys' => Survey::count(),
            ],
            'usersByRole' => User::selectRaw('role, COUNT(*) as c')->groupBy('role')->pluck('c', 'role'),
            'usersByTier' => User::selectRaw('tier, COUNT(*) as c')->groupBy('tier')->pluck('c', 'tier'),
            'usersByKind' => User::selectRaw('kind, COUNT(*) as c')->groupBy('kind')->pluck('c', 'kind'),
            'signups' => $this->signupSeries(),
        ]);
    }

    /** سلسلة تسجيلات آخر 14 يومًا (مملوءة بالأصفار للأيّام الفارغة). */
    private function signupSeries(): array
    {
        $raw = User::where('created_at', '>=', now()->subDays(13)->startOfDay())
            ->selectRaw('DATE(created_at) as d, COUNT(*) as c')
            ->groupBy('d')
            ->pluck('c', 'd');

        $series = [];
        for ($i = 13; $i >= 0; $i--) {
            $date = now()->subDays($i)->toDateString();
            $series[] = ['date' => $date, 'count' => (int) ($raw[$date] ?? 0)];
        }

        return $series;
    }
}
