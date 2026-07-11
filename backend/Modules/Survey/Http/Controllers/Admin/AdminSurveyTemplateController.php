<?php

namespace Modules\Survey\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Modules\Survey\Entities\SurveyTemplate;
use Modules\Survey\Http\Resources\Admin\AdminSurveyTemplateResource;

class AdminSurveyTemplateController extends Controller
{
    private const SORTABLE = ['id', 'name', 'category', 'sort'];
    private const CATEGORIES = ['satisfaction', 'feedback', 'nps', 'poll', 'assessment', 'custom'];
    private const QUESTION_TYPES = ['single', 'multiple', 'dropdown', 'text', 'longtext', 'rating', 'nps', 'scale', 'matrix', 'ranking'];

    /** مكتبة النماذج — بحث + فلترة فئة + فرز + ترقيم. */
    public function index(Request $request)
    {
        $this->authorize('view_survey_templates');

        $query = SurveyTemplate::query();

        if ($q = trim((string) $request->query('q', ''))) {
            $query->where('name', like_op(), "%{$q}%");
        }
        if ($category = $request->query('category')) {
            $query->where('category', $category);
        }

        [$column, $dir] = $this->parseSort((string) $request->query('sort', 'sort'), self::SORTABLE, 'sort');
        $query->orderBy($column, $dir);

        $items = $query->paginate((int) $request->query('perPage', 15));
        $items->setCollection(
            $items->getCollection()->map(fn (SurveyTemplate $t) => (new AdminSurveyTemplateResource($t))->resolve())
        );

        return $this->dashboardResponse($items);
    }

    /** إحصاءات المكتبة — العدد + بالفئة + النظاميّة/المخصّصة. */
    public function stats()
    {
        $this->authorize('view_survey_templates');

        $all = SurveyTemplate::all();
        $byCategory = $all->groupBy('category')->map->count();
        $distribution = collect(self::CATEGORIES)
            ->map(fn ($c) => ['label' => $c, 'value' => (int) ($byCategory[$c] ?? 0)])
            ->filter(fn ($d) => $d['value'] > 0)->values();

        return $this->dataResponse([
            'total' => $all->count(),
            'active' => $all->where('active', true)->count(),
            'system' => $all->where('is_system', true)->count(),
            'custom' => $all->where('is_system', false)->count(),
            'distribution' => $distribution,
        ]);
    }

    /** إنشاء نموذج جديد. */
    public function store(Request $request)
    {
        $this->authorize('manage_survey_templates');

        $data = $this->validated($request);
        $data['is_system'] = false;
        $data['sort'] ??= (int) (SurveyTemplate::max('sort') ?? 0) + 1;

        $template = SurveyTemplate::create($data);

        return $this->createdResponse((new AdminSurveyTemplateResource($template))->resolve());
    }

    /** تعديل نموذج. */
    public function update(Request $request, SurveyTemplate $surveyTemplate)
    {
        $this->authorize('manage_survey_templates');

        $surveyTemplate->update($this->validated($request, true));

        return $this->updatedResponse((new AdminSurveyTemplateResource($surveyTemplate->fresh()))->resolve());
    }

    /** حذف نموذج — النظاميّة محميّة (405). */
    public function destroy(SurveyTemplate $surveyTemplate)
    {
        $this->authorize('manage_survey_templates');

        if ($surveyTemplate->is_system) {
            return $this->forbiddenResponse(__('System templates cannot be deleted.'));
        }

        $surveyTemplate->delete();

        return $this->updatedResponse(null, __('Deleted successfully'));
    }

    private function validated(Request $request, bool $partial = false): array
    {
        $req = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'name' => [$req, 'string', 'max:80'],
            'category' => [$req, 'in:'.implode(',', self::CATEGORIES)],
            'description' => ['nullable', 'string', 'max:200'],
            'icon' => ['nullable', 'string', 'max:60'],
            'active' => ['boolean'],
            'sort' => ['nullable', 'integer', 'min:0'],
            'questions' => ['nullable', 'array'],
            'questions.*.text' => ['required_with:questions', 'string', 'max:300'],
            'questions.*.type' => ['required_with:questions', 'in:'.implode(',', self::QUESTION_TYPES)],
            'questions.*.options' => ['nullable', 'array'],
            'questions.*.options.*' => ['string', 'max:120'],
            'questions.*.rows' => ['nullable', 'array'],
            'questions.*.scaleMin' => ['nullable', 'string', 'max:40'],
            'questions.*.scaleMax' => ['nullable', 'string', 'max:40'],
        ]);
    }
}
