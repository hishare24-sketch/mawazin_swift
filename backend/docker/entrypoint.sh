#!/bin/sh
# إقلاع موحّد لخدمات Laravel داخل Docker (api / queue / reverb)
set -e

cd /app

mkdir -p \
  storage/framework/cache \
  storage/framework/sessions \
  storage/framework/views \
  storage/logs \
  storage/app \
  bootstrap/cache
chmod -R ug+rwx storage bootstrap/cache 2>/dev/null || true

# إن لم يُمرَّر APP_KEY من البيئة، ولّد واحدًا ثابتًا على حجم التخزين
if [ -z "$APP_KEY" ]; then
  KEY_FILE=storage/app/.docker_app_key
  if [ -f "$KEY_FILE" ]; then
    export APP_KEY="$(cat "$KEY_FILE")"
  else
    export APP_KEY="$(php -r 'echo "base64:".base64_encode(random_bytes(32));')"
    echo -n "$APP_KEY" > "$KEY_FILE"
    echo "[entrypoint] generated APP_KEY → $KEY_FILE"
  fi
fi

# انتظار MySQL (يتخطّى لو الاتصال غير جاهز بعد المهلة)
if [ -n "$DB_HOST" ] && [ "${DB_CONNECTION:-mysql}" != "sqlite" ]; then
  echo "[entrypoint] waiting for database ${DB_HOST}:${DB_PORT:-3306}…"
  i=0
  until php -r "
    try {
      new PDO(
        'mysql:host='.getenv('DB_HOST').';port='.(getenv('DB_PORT')?:'3306').';dbname='.getenv('DB_DATABASE'),
        getenv('DB_USERNAME'),
        getenv('DB_PASSWORD')
      );
      exit(0);
    } catch (Throwable \$e) { exit(1); }
  " 2>/dev/null; do
    i=$((i + 1))
    if [ "$i" -ge 60 ]; then
      echo "[entrypoint] database still unreachable — continuing anyway"
      break
    fi
    sleep 2
  done
fi

# الهجرات — افتراضيًا مفعّلة؛ عطّلها في queue/reverb عبر RUN_MIGRATIONS=0
if [ "${RUN_MIGRATIONS:-1}" = "1" ]; then
  echo "[entrypoint] migrate + permission:insert…"
  php artisan package:discover --ansi 2>/dev/null || true
  php artisan migrate --force || true
  php artisan permission:insert || true
fi

exec "$@"
