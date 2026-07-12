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

# نُلغي ENTRYPOINT الأساس (يتعارض مع تشغيل Render) ونُقلِع عبر خادم FrankenPHP
# الإنتاجيّ المُدمج (php-server، متعدّد الخيوط، يعالج التزامن) — بديل جذريّ عن
# php artisan serve (خادم تطوير أحاديّ الطلب). يناسب 512MB (بلا وضع worker).
# الهجرة + بذر الصلاحيّات غير حاجبين (|| true) كي لا يمنع تعذّر القاعدة الإقلاع.
ENTRYPOINT []
CMD ["/bin/sh", "-c", "timeout 60 php artisan migrate --force || true; php artisan permission:insert || true; exec frankenphp php-server --listen 0.0.0.0:${PORT:-10000} --root public/"]
