<?php

namespace Modules\Settings\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Modules\Settings\Entities\PlatformSetting;
use Modules\Settings\Http\Resources\Admin\AdminSettingResource;

class AdminSettingController extends Controller
{
    /** كلّ الإعدادات مرتّبة بالمجموعة والترتيب. */
    public function index()
    {
        $this->authorize('view_settings');

        $items = PlatformSetting::orderBy('group')->orderBy('sort')->get()
            ->map(fn (PlatformSetting $s) => (new AdminSettingResource($s))->resolve());

        return $this->dataResponse($items);
    }

    /** حفظ جماعيّ — body: { settings: { key: value, ... } }. يسجّل فرق قبل/بعد في التدقيق. */
    public function update(Request $request)
    {
        $this->authorize('manage_settings');

        $data = $request->validate([
            'settings' => ['required', 'array'],
        ]);

        $changes = [];
        foreach ($data['settings'] as $key => $value) {
            $setting = PlatformSetting::where('key', $key)->first();
            if ($setting === null) {
                continue; // تجاهل المفاتيح المجهولة
            }
            $stored = $this->normalize($setting->type, $value);
            if ((string) $setting->value !== $stored) {
                $changes[$key] = ['from' => $setting->value, 'to' => $stored];
                $setting->update(['value' => $stored]);
            }
        }

        if ($changes !== []) {
            audit_changes(['settings' => $changes]); // يلتقطه AuditMiddleware في meta
        }

        return $this->updatedResponse($this->all());
    }

    /**
     * إعادة الضبط للافتراضيّ المصنعيّ — body: { keys?: string[], group?: string }.
     * إن غاب الاثنان: يُعيد ضبط الكلّ. يسجّل قبل/بعد.
     */
    public function reset(Request $request)
    {
        $this->authorize('manage_settings');

        $data = $request->validate([
            'keys' => ['sometimes', 'array'],
            'keys.*' => ['string'],
            'group' => ['sometimes', 'string'],
        ]);

        $query = PlatformSetting::query()->whereNotNull('default_value');
        if (! empty($data['keys'])) {
            $query->whereIn('key', $data['keys']);
        }
        if (! empty($data['group'])) {
            $query->where('group', $data['group']);
        }

        $changes = [];
        foreach ($query->get() as $setting) {
            if ((string) $setting->value !== (string) $setting->default_value) {
                $changes[$setting->key] = ['from' => $setting->value, 'to' => $setting->default_value];
                $setting->update(['value' => $setting->default_value]);
            }
        }

        if ($changes !== []) {
            audit_changes(['reset' => $changes]);
        }

        return $this->updatedResponse($this->all());
    }

    /** نظرة إحصائيّة — الإجماليّ + المجموعات + عدد المُعدَّل عن الافتراضيّ + توزيع بالمجموعة. */
    public function overview()
    {
        $this->authorize('view_settings');

        $all = PlatformSetting::get();
        $byGroup = $all->groupBy('group')->map->count()
            ->map(fn ($c, $g) => ['label' => $g, 'value' => (int) $c])->values();

        return $this->dataResponse([
            'total' => $all->count(),
            'groups' => $all->pluck('group')->unique()->count(),
            'modified' => $all->filter(fn (PlatformSetting $s) => $s->isModified())->count(),
            'byGroup' => $byGroup,
        ]);
    }

    /** خزّن نصًّا مُطبَّعًا بحسب النوع (مصدر تطبيع واحد). */
    private function normalize(string $type, mixed $value): string
    {
        return match ($type) {
            'boolean' => filter_var($value, FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false',
            'number' => is_numeric($value) ? (string) ($value + 0) : '0',
            default => (string) $value,
        };
    }

    /** القائمة كاملة مرتّبة عبر الـResource. */
    private function all(): Collection
    {
        return PlatformSetting::orderBy('group')->orderBy('sort')->get()
            ->map(fn (PlatformSetting $s) => (new AdminSettingResource($s))->resolve());
    }
}
