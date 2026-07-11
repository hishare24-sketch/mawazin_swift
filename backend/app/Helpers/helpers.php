<?php

if (! function_exists('current_user')) {
    /**
     * المستخدم الحاليّ. المرحلة 1 توسّعه لدعم حارسَي api (client) و admin.
     */
    function current_user()
    {
        return auth()->user();
    }
}

if (! function_exists('audit_changes')) {
    /**
     * يسجّل فرق قبل/بعد على طلب التدقيق الحاليّ (يلتقطه AuditMiddleware في meta).
     */
    function audit_changes(array $changes): void
    {
        \Modules\Audit\Support\AuditContext::set($changes);
    }
}

if (! function_exists('setting')) {
    /**
     * قيمة إعداد منصّة مُطبَّعة (أو الافتراضيّ). آمنة حين غياب الجدول/الإعداد.
     */
    function setting(string $key, mixed $default = null): mixed
    {
        try {
            $row = \Modules\Settings\Entities\PlatformSetting::where('key', $key)->first();

            return $row !== null ? $row->typedValue() : $default;
        } catch (\Throwable $e) {
            return $default;
        }
    }
}

if (! function_exists('getLocaleField')) {
    function getLocaleField(array|string|null $data, $col = null)
    {
        if (is_null($data)) {
            return null;
        }
        if (is_string($data)) {
            return $data;
        }

        return $data[app()->getLocale()] ?? null;
    }
}

if (! function_exists('checkBoolean')) {
    function checkBoolean($col): bool
    {
        return $col === 1 || $col === '1' || $col === true || $col === 'true';
    }
}
