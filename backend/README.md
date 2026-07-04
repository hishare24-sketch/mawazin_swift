# الباك-إند — Laravel 10 + Sanctum

باك-إند منظومة التوظيف الذكية، يُنفّذ عقد [`../api/openapi.yaml`](../api/openapi.yaml).
جزء من monorepo (الواجهة في الجذر، الباك-إند هنا).

الملفات هنا **دلتا التطبيق** (متحكّمات، مسارات، هجرات، إعدادات) فوق هيكل Laravel القياسي — نفس الكود في المسارين، تختلف القاعدة/الخادم عبر `.env` فقط.

## المسار (أ) — الأسهل للتطوير المحلي: Laravel Herd + SQLite (بلا Docker)

1. ثبّت **[Laravel Herd](https://herd.laravel.com)** لويندوز (مثبّت واحد يتضمّن PHP + Composer + خادم — مجاني).
2. من **Git Bash** في مجلّد `backend`:
   ```bash
   # توليد هيكل Laravel ودمج دلتانا (Composer يأتي مع Herd)
   composer create-project laravel/laravel:^10.0 _skeleton && cp -rn _skeleton/. . && rm -rf _skeleton && composer require laravel/sanctum
   cp .env.example .env
   touch database/database.sqlite      # قاعدة SQLite (ملف واحد)
   php artisan key:generate
   php artisan migrate
   php artisan serve                   # الـAPI على http://localhost:8000
   ```
3. اختبار: `curl -X POST http://localhost:8000/api/v1/auth/register -H "Content-Type: application/json" -d '{"name":"تجربة","email":"t@t.com","password":"secret12"}'`

## المسار (ب) — للفريق/الإنتاج: Docker + Nginx + Postgres

```bash
cd backend
docker run --rm -v "$PWD":/app -w /app composer:2 \
  bash -c "composer create-project laravel/laravel:^10.0 _skeleton && cp -rn _skeleton/. . && rm -rf _skeleton && composer require laravel/sanctum"
cp .env.example .env
docker compose up -d
docker compose exec app php artisan key:generate
docker compose exec app php artisan migrate   # compose يفرض Postgres تلقائيًا
```

> ربط الواجهة (المسارين): `VITE_USE_REAL_API=true` و`VITE_BASE_API_URL=http://localhost:8000/api/v1`.

## البنية (دلتا التطبيق)

```
backend/
├── compose.yaml           خدمات: app (php-fpm) · web (nginx) · db (postgres)
├── docker/
│   ├── Dockerfile         php:8.3-fpm + إضافات + composer
│   └── nginx.conf         يوجّه إلى php-fpm
├── .env.example
├── routes/api.php         مسارات v1 (تطابق العقد)
├── app/Http/Controllers/Api/V1/
│   └── AuthController.php  تسجيل/دخول/أنا/خروج (Sanctum)
└── database/migrations/   امتداد users + جداول النطاق (مرحلة تلو مرحلة)
```

## خريطة التنفيذ (openapi.yaml → Laravel)

| العقد | الحالة | المرجع (Supabase) |
|---|---|---|
| `/auth/*` | ✅ المرحلة 1 | GoTrue + AuthService |
| `/profile/*` | 🔜 المرحلة 2 | ProfileStore |
| `/public-profiles/*` | 🔜 المرحلة 2 | `public_profiles` + RLS → Policy |
| `/conversations/*` (لحظي) | 🔜 المرحلة 4 | `direct_messages` + Realtime → Reverb/Echo |
| بقية الموارد | 🔜 المرحلة 2 | `../supabase/migrations/` |

المرجع الكامل: [`../DOC/ARCHITECTURE.md`](../DOC/ARCHITECTURE.md) · [`../DOC/BACKEND_INTEGRATION.md`](../DOC/BACKEND_INTEGRATION.md)
