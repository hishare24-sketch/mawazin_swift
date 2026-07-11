#!/bin/sh
# أمر إقلاع الحاوية على Render (يتجنّب مشاكل تفسير && في dockerCommand).
# هجرة بمهلة (لا تُعلّق الاستيقاظ لو تباطأت القاعدة المجّانيّة) ثمّ صلاحيّات ثمّ تقديم.
timeout 60 php artisan migrate --force || true
php artisan permission:insert || true
exec frankenphp php-server --root public/ --listen ":${PORT:-8080}"
