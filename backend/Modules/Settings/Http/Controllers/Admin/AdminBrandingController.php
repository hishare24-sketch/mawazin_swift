<?php

namespace Modules\Settings\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Modules\Settings\Entities\BrandingSetting;

class AdminBrandingController extends Controller
{
    public function show()
    {
        $this->authorize('view_branding');

        return $this->dataResponse(BrandingSetting::current()->payload());
    }

    public function update(Request $request)
    {
        $this->authorize('manage_branding');

        $data = $request->validate([
            'platform_name' => ['sometimes', 'string', 'max:120'],
            'tagline' => ['sometimes', 'nullable', 'string', 'max:200'],
            'logo_url' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'default_preset' => ['sometimes', 'in:littlebee,ocean,royal,desert,emerald'],
            'primary_color' => ['sometimes', 'nullable', 'string', 'regex:/^#?[0-9a-fA-F]{6}$/'],
            'secondary_color' => ['sometimes', 'nullable', 'string', 'regex:/^#?[0-9a-fA-F]{6}$/'],
            'default_mode' => ['sometimes', 'in:dark,light,mixed'],
            'login_headline' => ['sometimes', 'nullable', 'string', 'max:200'],
            'login_subtext' => ['sometimes', 'nullable', 'string', 'max:300'],
        ]);

        // طبّع لون hex بإضافة # إن غاب
        foreach (['primary_color', 'secondary_color'] as $c) {
            if (! empty($data[$c]) && $data[$c][0] !== '#') {
                $data[$c] = '#'.$data[$c];
            }
        }

        $s = BrandingSetting::current();
        $s->fill($data)->save();

        return $this->updatedResponse($s->fresh()->payload());
    }
}
