#!/usr/bin/env bash
# صفح / التوظيف — نشر: compose up + health + migrate + ربط nginx
set -euo pipefail
cd "$(dirname "$0")"

export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-sufha}"

if docker compose version >/dev/null 2>&1; then DC="docker compose"; else DC="docker-compose"; fi
dc() { $DC "$@"; }

if [ ! -f .env ]; then
  cp .env.docker.example .env
  echo "Created .env from .env.docker.example"
fi

# حاوية nginx المشتركة
NGINX_CT="$(docker ps --format '{{.Names}}' | grep -E '^ubuntu-nginx-1$' || true)"
if [ -z "$NGINX_CT" ]; then
  NGINX_CT="$(docker ps --format '{{.Names}}' | grep -Ei 'nginx' | head -n1 || true)"
fi

# اختر شبكة nginx: فضّل dashboard-net إن وُجدت على الحاوية
NGINX_NETWORK="$(grep -E '^NGINX_NETWORK=' .env 2>/dev/null | cut -d= -f2 || true)"
NGINX_NETWORK="${NGINX_NETWORK:-dashboard-net}"
if [ -n "$NGINX_CT" ]; then
  NETS="$(docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' "$NGINX_CT" 2>/dev/null || true)"
  if echo " $NETS " | grep -q ' dashboard-net '; then
    NGINX_NETWORK=dashboard-net
  elif echo " $NETS " | grep -q " ${NGINX_NETWORK} "; then
    :
  else
    # أول شبكة حقيقية غير فارغة
    FIRST="$(echo "$NETS" | awk '{print $1}')"
    [ -n "$FIRST" ] && NGINX_NETWORK="$FIRST"
  fi
fi
export NGINX_NETWORK
echo "Using nginx container: ${NGINX_CT:-none}"
echo "Using nginx network: $NGINX_NETWORK"

if ! docker network inspect "$NGINX_NETWORK" >/dev/null 2>&1; then
  docker network create "$NGINX_NETWORK"
fi

if grep -qE '^NGINX_NETWORK=' .env 2>/dev/null; then
  sed -i "s|^NGINX_NETWORK=.*|NGINX_NETWORK=${NGINX_NETWORK}|" .env
else
  echo "NGINX_NETWORK=${NGINX_NETWORK}" >> .env
fi

echo "Building and starting containers..."
dc down --remove-orphans || true
dc up -d --build --remove-orphans

# ربط web بشبكة nginx بالـ alias sufha-web (نفس أوامرك اليدوية)
WEB="$(docker ps --format '{{.Names}}' | grep -E 'sufha.*web|recruit.*web' | head -n1 || true)"
echo "WEB=$WEB"
if [ -n "$WEB" ] && [ -n "$NGINX_CT" ]; then
  NET="$(docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' "$NGINX_CT" | awk '{print $1}')"
  # فضّل dashboard-net من شبكات nginx
  ALL_NETS="$(docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' "$NGINX_CT")"
  if echo " $ALL_NETS " | grep -q ' dashboard-net '; then
    NET=dashboard-net
  fi
  echo "NET=$NET"
  docker network connect --alias sufha-web "$NET" "$WEB" 2>/dev/null || true
fi

echo "Waiting for API health..."
ok=0
for i in $(seq 1 40); do
  if dc exec -T api php -r "exit(@file_get_contents('http://127.0.0.1:10000/up')===false?1:0);" 2>/dev/null; then
    ok=1
    echo "API healthy after ${i} attempt(s)"
    break
  fi
  sleep 5
done

if [ "$ok" != 1 ]; then
  echo "API did not become healthy" >&2
  dc ps >&2 || true
  dc logs --tail=120 api >&2 || true
  exit 1
fi

echo "Running migrations..."
dc exec -T api php artisan migrate --force
dc exec -T api php artisan permission:insert || true

# سوبر أدمن بكل صلاحيات Spatie — من البيئة أو .env
if [ -z "${SUPER_ADMIN_EMAIL:-}" ]; then
  SUPER_ADMIN_EMAIL="$(grep -E '^SUPER_ADMIN_EMAIL=' .env 2>/dev/null | cut -d= -f2- || true)"
fi
if [ -z "${SUPER_ADMIN_PASSWORD:-}" ]; then
  SUPER_ADMIN_PASSWORD="$(grep -E '^SUPER_ADMIN_PASSWORD=' .env 2>/dev/null | cut -d= -f2- | sed 's/\$\$/$/g' || true)"
fi
if [ -z "${SUPER_ADMIN_NAME:-}" ]; then
  SUPER_ADMIN_NAME="$(grep -E '^SUPER_ADMIN_NAME=' .env 2>/dev/null | cut -d= -f2- || true)"
fi
SUPER_ADMIN_NAME="${SUPER_ADMIN_NAME:-Super Admin}"

if [ -n "${SUPER_ADMIN_EMAIL:-}" ] && [ -n "${SUPER_ADMIN_PASSWORD:-}" ]; then
  echo "Ensuring super admin: $SUPER_ADMIN_EMAIL"
  RESET_ARGS=""
  if [ "${RESET_SUPER_ADMIN_PASSWORD:-0}" = "1" ]; then
    RESET_ARGS="--reset-password"
    echo "Reset password enabled for existing admin"
  fi
  dc exec -T api php artisan user:ensure-super-admin \
    "$SUPER_ADMIN_EMAIL" "$SUPER_ADMIN_PASSWORD" --name="$SUPER_ADMIN_NAME" $RESET_ARGS
else
  echo "ERROR: SUPER_ADMIN_EMAIL/PASSWORD missing — admin was not ensured" >&2
  exit 1
fi

if [ -n "$NGINX_CT" ]; then
  echo "Reloading nginx: $NGINX_CT"
  docker exec "$NGINX_CT" nginx -t
  docker exec "$NGINX_CT" nginx -s reload || true

  echo "Upstream check..."
  docker exec "$NGINX_CT" wget -qO- -T 5 http://sufha-web/ >/dev/null && echo "sufha-web OK" || echo "FAIL_upstream"
fi

curl -skI https://sufha.com 2>/dev/null | head -8 || true
echo "Done: https://sufha.com"
