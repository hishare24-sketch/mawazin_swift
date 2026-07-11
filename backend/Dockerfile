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

# Render يمرّر PORT؛ FrankenPHP يخدم public/ (تطبيق Laravel كلاسيكيّ، بلا Octane).
# صيغة shell كي يتوسّع ${PORT}. (بلا config:cache/route:cache — تفاديًا لفشل الإقلاع مع مسارات closure.)
CMD frankenphp php-server --root public/ --listen :${PORT:-8080}
