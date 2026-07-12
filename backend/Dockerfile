# ===== منظومة التوظيف — صورة الباك-إند الإنتاجيّة (FrankenPHP) =====
# تُستخدم على Render لثلاث خدمات بالصورة نفسها: web + queue worker + reverb.
# الأمر يُحدَّد لكلّ خدمة في render.yaml (dockerCommand)؛ الافتراضيّ هنا هو الويب.

FROM dunglas/frankenphp:1-php8.4

# إضافات PHP المطلوبة (Postgres لـ Supabase + Redis + الأساسيّات)
RUN install-php-extensions \
    pdo_pgsql \
    pdo_mysql \
    redis \
    pcntl \
    gd \
    zip \
    bcmath \
    intl \
    opcache

WORKDIR /app

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# طبقة تبعيّات مخزّنة (تتغيّر أقلّ من الكود)
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction

# بقيّة التطبيق + بناء autoload المحسّن
COPY . .
RUN composer dump-autoload --optimize --no-dev --classmap-authoritative \
    && chmod +x docker/entrypoint.sh

ENV APP_ENV=production \
    APP_DEBUG=false \
    LOG_CHANNEL=stderr

# نُلغي ENTRYPOINT الأساس (يتعارض مع تشغيل Render/Compose) ونُقلِع عبر entrypoint
# الذي ينتظر DB ثم يمرّر الأمر (frankenphp / queue / reverb).
# الهجرة افتراضيًا مفعّلة؛ عطّلها في queue/reverb عبر RUN_MIGRATIONS=0.
ENTRYPOINT ["/bin/sh", "/app/docker/entrypoint.sh"]
CMD ["/bin/sh", "-c", "exec frankenphp php-server --listen 0.0.0.0:${PORT:-10000} --root public/"]
