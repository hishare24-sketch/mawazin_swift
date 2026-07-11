> # ⚠️ مُهمَل (DEPRECATED)
> هذا الباك-إند (NestJS) **مُقاعَد**. الباك-إند الحيّ الآن هو **Laravel في [`../backend/`](../backend/)**،
> والواجهة تعمل عليه. يبقى **[`openapi.yaml`](./openapi.yaml) مرجع العقد** فقط — لا يُبنى ولا يُنشَر.
> خطّة الهجرة: [`../DOC/LARAVEL_MIGRATION_PLAN.md`](../DOC/LARAVEL_MIGRATION_PLAN.md) · النشر: [`../DOC/DEPLOYMENT.md`](../DOC/DEPLOYMENT.md).

# الباك-إند — NestJS + JWT (مُهمَل)

باك-إند منظومة التوظيف الذكية، ينفّذ عقد [`openapi.yaml`](./openapi.yaml).
جزء من monorepo (الواجهة في الجذر، الباك-إند هنا). **يعمل على Node** — بلا PHP/Docker للتطوير.

## التشغيل (تطوير محلي — SQLite داخل العملية)

```bash
cd api
npm install
cp .env.example .env
npm run start:dev          # الـAPI على http://localhost:8000/api/v1
```

القاعدة الافتراضية **sql.js** (SQLite بلا خادم ولا بناء أصلي)، تُحفظ في `data/dev.sqlite`، والجداول تُنشأ تلقائيًا (`synchronize`).

اختبار سريع:
```bash
curl -X POST http://localhost:8000/api/v1/auth/register -H "Content-Type: application/json" \
  -d '{"name":"تجربة","email":"t@t.com","password":"secret12"}'
```

## البنية

```
api/
├── src/
│   ├── main.ts                    bootstrap: prefix /api/v1 · CORS · تحقّق 422 · غلاف · فلتر
│   ├── app.module.ts
│   ├── common/                    ResponseInterceptor ({data}) · HttpExceptionFilter ({message,errors})
│   ├── database/                  قابلة للتبديل: sqljs (تطوير) / postgres (إنتاج)
│   ├── health/                    GET /health
│   ├── users/                     كيان User (uuid/role/phone)
│   └── auth/                      register · login · me · logout (JWT) + DTOs + strategy + guard
├── .env.example
└── package.json
```

## القاعدة قابلة للتبديل بالبيئة (12-factor)

| البيئة | `DB_CONNECTION` | ملاحظة |
|---|---|---|
| تطوير | `sqljs` | ملف واحد، بلا خادم — الافتراضي |
| إنتاج/فريق | `postgres` | عبر Docker؛ migrations بدل synchronize |

## عقد الاستجابة

- نجاح: `{ "data": ... }` (غلاف موحّد).
- خطأ: `{ "message": "...", "errors"?: { "field": ["..."] } }` — التحقّق 422 بنمط Laravel.
- المصادقة: `Authorization: Bearer <JWT>`.

## خريطة التنفيذ (openapi.yaml → NestJS)

| العقد | الحالة |
|---|---|
| `/auth/*` | ✅ المرحلة 1 |
| `/profile/*` · `/public-profiles/*` · بقية الموارد | 🔜 المرحلة 2 |
| `/conversations/*` (لحظي عبر WebSocket/Gateway) | 🔜 المرحلة 4 |

المرجع: [`../DOC/ARCHITECTURE.md`](../DOC/ARCHITECTURE.md) · [`../DOC/BACKEND_INTEGRATION.md`](../DOC/BACKEND_INTEGRATION.md) · مرجع Supabase الحيّ في [`../supabase/`](../supabase/).
