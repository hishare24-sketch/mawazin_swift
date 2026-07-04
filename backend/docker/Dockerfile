# php:8.3-fpm + الإضافات التي يحتاجها Laravel 10 + Composer + امتداد pgsql
FROM php:8.3-fpm

RUN apt-get update && apt-get install -y --no-install-recommends \
    git unzip libpq-dev libzip-dev libicu-dev \
    && docker-php-ext-install pdo pdo_pgsql pgsql zip intl bcmath \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# التبعيات تُثبَّت عند bootstrap (composer install) — انظر README
CMD ["php-fpm"]
