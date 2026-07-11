<?php

namespace Modules\Interviewer\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Modules\Interviewer\Entities\Interviewer;
use Modules\Interviewer\Http\Resources\Admin\AdminInterviewerResource;

class AdminInterviewerController extends Controller
{
    private const SORTABLE = ['id', 'name', 'specialty', 'status', 'rating', 'price_from', 'created_at'];

    /** قائمة المقيّمين — بحث بالاسم/التخصّص + فلترة حالة/تخصّص + فرز + ترقيم. */
    public function index(Request $request)
    {
        $this->authorize('view_interviewers');

        $query = Interviewer::with('user');

        if ($q = trim((string) $request->query('q', ''))) {
            $query->where(function ($sub) use ($q): void {
                $sub->where('name', like_op(), "%{$q}%")->orWhere('specialty', like_op(), "%{$q}%");
            });
        }
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($specialty = $request->query('specialty')) {
            $query->where('specialty', $specialty);
        }

        [$column, $dir] = $this->parseSort((string) $request->query('sort', '-rating'), self::SORTABLE);
        $query->orderBy($column, $dir);

        $items = $query->paginate((int) $request->query('perPage', 15));
        $items->setCollection(
            $items->getCollection()->map(fn (Interviewer $i) => (new AdminInterviewerResource($i))->resolve())
        );

        return $this->dashboardResponse($items);
    }

    /** إحصاءات المقيّمين — عدّادات الحالة + التخصّص + متوسّط التقييم. */
    public function stats()
    {
        $this->authorize('view_interviewers');

        $all = Interviewer::all();
        $byStatus = collect(['pending', 'approved', 'rejected'])
            ->map(fn ($s) => ['label' => $s, 'value' => (int) $all->where('status', $s)->count()])
            ->filter(fn ($d) => $d['value'] > 0)->values();
        $bySpecialty = $all->groupBy('specialty')->map->count()
            ->map(fn ($c, $x) => ['label' => $x, 'value' => (int) $c])->values();

        return $this->dataResponse([
            'total' => $all->count(),
            'approved' => (int) $all->where('status', 'approved')->count(),
            'pending' => (int) $all->where('status', 'pending')->count(),
            'avgRating' => $all->count() > 0 ? round((float) $all->avg('rating'), 2) : 0,
            'byStatus' => $byStatus,
            'bySpecialty' => $bySpecialty,
        ]);
    }

    /** إنشاء مقيّم (تسجيل يدويّ من الأدمن). */
    public function store(Request $request)
    {
        $this->authorize('update_interviewers');

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'specialty' => ['required', 'string', 'max:60'],
            'status' => ['nullable', 'in:pending,approved,rejected'],
            'rating' => ['nullable', 'numeric', 'min:0', 'max:5'],
            'price_from' => ['nullable', 'numeric', 'min:0'],
        ]);
        $data['status'] ??= 'approved';

        $interviewer = Interviewer::create($data);

        return $this->createdResponse((new AdminInterviewerResource($interviewer))->resolve());
    }

    /** اعتماد مقيّم (يظهر في السوق العامّ). */
    public function approve(Interviewer $interviewer)
    {
        $this->authorize('approve_interviewers');
        $interviewer->update(['status' => 'approved']);

        return $this->updatedResponse((new AdminInterviewerResource($interviewer->load('user')))->resolve());
    }

    /** رفض مقيّم (يُخفى من السوق العامّ). */
    public function reject(Interviewer $interviewer)
    {
        $this->authorize('reject_interviewers');
        $interviewer->update(['status' => 'rejected']);

        return $this->updatedResponse((new AdminInterviewerResource($interviewer->load('user')))->resolve());
    }

    /** حذف مقيّم. */
    public function destroy(Interviewer $interviewer)
    {
        $this->authorize('update_interviewers');
        $interviewer->delete();

        return $this->updatedResponse(null, __('Deleted successfully'));
    }
}
