# الباك-إند — Laravel 10 + Sanctum

باك-إند منظومة التوظيف الذكية، يُنفّذ عقد [`../api/openapi.yaml`](../api/openapi.yaml).
جزء من monorepo (الواجهة في الجذر، الباك-إند هنا).

## المتطلبات

**Docker وحده** — لا حاجة لـ PHP/Composer محليًّا؛ كل شيء داخل الحاويات.

## التشغيل الأول (bootstrap)

الملفات هنا هي **دلتا التطبيق** (متحكّمات، مسارات، هجرات، إعدادات) فوق هيكل Laravel القياسي. الخطوة الأولى تولّد الهيكل ثم تُبقي دلتانا:

```bash
cd backend

# 1) توليد هيكل Laravel 10 في مجلّد مؤقّت ثم دمجه (يحافظ على ملفاتنا)
docker run --rm -v "$PWD":/app -w /app composer:2 \
  bash -c "composer create-project laravel/laravel:^10.0 _skeleton && \
           cp -rn _skeleton/. . && rm -rf _skeleton && \
           composer require laravel/sanctum"

# 2) الإعداد
cp .env.example .env

# 3) رفع الحاويات (php-fpm + nginx + postgres)
docker compose up -d

# 4) المفتاح + الهجرات
docker compose exec app php artisan key:generate
docker compose exec app php artisan migrate
```

الـAPI على `http://localhost:8000/api/v1`. حدّث الواجهة: `VITE_USE_REAL_API=true` و`VITE_BASE_API_URL=http://localhost:8000/api/v1`.

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
