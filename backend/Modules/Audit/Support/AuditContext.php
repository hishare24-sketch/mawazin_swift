<?php

namespace Modules\Audit\Support;

/**
 * حامل قبل/بعد لطلب واحد — تدفع فيه الكنترولرات فرق التغيير (added/removed/from/to)
 * فيلتقطه AuditMiddleware ويخزّنه في meta. حامل ثابت (طلب واحد لكلّ عمليّة PHP-FPM؛
 * والوسيط يعيد الضبط بعد التسجيل فيُصان بين النداءات في الاختبار).
 */
class AuditContext
{
    private static ?array $changes = null;

    public static function set(array $changes): void
    {
        self::$changes = $changes;
    }

    public static function payload(): ?array
    {
        return self::$changes;
    }

    public static function reset(): void
    {
        self::$changes = null;
    }
}
