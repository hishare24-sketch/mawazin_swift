<?php

namespace Modules\Settings\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Modules\Settings\Entities\BrandingSetting;

class BrandingController extends Controller
{
    /** هويّة المنصّة العامّة — تُطبَّق عند إقلاع التطبيق (بلا مصادقة، fallback آمن). */
    public function show()
    {
        try {
            return $this->dataResponse(BrandingSetting::current()->payload());
        } catch (\Throwable) {
            return $this->dataResponse(null);
        }
    }
}
