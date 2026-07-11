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
RUN composer dump-autoload --optimize --no-dev --classmap-authoritative

ENV APP_ENV=production \
    APP_DEBUG=false \
    LOG_CHANNEL=stderr

# الإقلاع بصيغة شِل (Docker يُشغّلها عبر /bin/sh -c). على المثيل المجّانيّ 512MB نستخدم
# php artisan serve (عمليّة واحدة خفيفة) بدل FrankenPHP متعدّد الخيوط (يتجنّب نفاد الذاكرة).
CMD timeout 60 php artisan migrate --force || true; php artisan permission:insert || true; exec php artisan serve --host=0.0.0.0 --port=${PORT:-8080}
