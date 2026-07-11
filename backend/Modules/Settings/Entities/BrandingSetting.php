<?php

namespace Modules\Settings\Entities;

use Illuminate\Database\Eloquent\Model;

class BrandingSetting extends Model
{
    protected $fillable = [
        'platform_name', 'tagline', 'logo_url', 'default_preset',
        'primary_color', 'secondary_color', 'default_mode', 'login_headline', 'login_subtext',
    ];

    public static function current(): self
    {
        $s = static::query()->first();
        if ($s === null) {
            $s = static::create([]);
            $s->refresh();
        }

        return $s;
    }

    /** حمولة موحّدة (camelCase) للواجهة والنقطة العامّة. */
    public function payload(): array
    {
        return [
            'platformName' => $this->platform_name,
            'tagline' => $this->tagline,
            'logoUrl' => $this->logo_url,
            'preset' => $this->default_preset,
            'primaryColor' => $this->primary_color,
            'secondaryColor' => $this->secondary_color,
            'mode' => $this->default_mode,
            'loginHeadline' => $this->login_headline,
            'loginSubtext' => $this->login_subtext,
        ];
    }
}
