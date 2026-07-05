# قائمة تحقّق التحويل إلى مكدّس الفريق (حيّة)

> تتبّع تقدّم التحويل مرحلةً بمرحلة. الخطة الكاملة والقرارات في [`ARCHITECTURE.md`](./ARCHITECTURE.md).
> الهدف: **Vue SPA + NestJS + JWT (`api/`) + Docker/Nginx/staging + Tailwind**، عقد `api/openapi.yaml` مصدر الحقيقة، Supabase محوّل يُنزع.

**📍 الموضع الحالي:** انتهت المرحلة 1 — التالي المرحلة 2.

---

## ✅ المرحلة 1 — أساس الباك-إند (NestJS) — مُنجزة ومُتحقَّقة حيًّا
- [x] مشروع `api/` (NestJS 10): prefix `/api/v1`، CORS، ValidationPipe (422 نمط Laravel)
- [x] غلاف استجابة `{ data }` + فلتر أخطاء عام + نقطة `health`
- [x] قاعدة قابلة للتبديل: sql.js (تطوير) / Postgres (إنتاج) بمتغيّر `DB_CONNECTION`
- [x] كيان `User` (uuid/role/phone، password select:false + bcryptjs)
- [x] مصادقة JWT: register · login · me · logout — مختبَرة حيًّا (curl)

## ⬜ المرحلة 2 — موارد الباك-إند (لكل مورد في `openapi.yaml`)
لكل مورد: كيان (Entity) → وحدة (Module) → متحكّم (Controller) → حارس/صلاحية (Guard) → اختبار.
- [ ] `profile` (المهارات/الإثباتات/الخبرات/الشهادات)
- [ ] `public-profiles` (الصفحة العامة + الادّعاء بالمالك)
- [ ] `account/plan` + `wallet`
- [ ] `surveys` (+ الردود)
- [ ] `opportunities` + `requests`
- [ ] `interviews` + `interviewers`
- [ ] `notifications`
- المرجع الحيّ: [`../supabase/migrations/`](../supabase/migrations/) + [`CLOUD_SYNC.md`](./CLOUD_SYNC.md)

## ⬜ المرحلة 3 — ربط الواجهة بالعقد (بلا لمس الشكل)
- [ ] `.env`: `VITE_USE_REAL_API=true` + `VITE_BASE_API_URL=http://localhost:8000/api/v1`
- [ ] تحويل `AuthStore` أولًا عبر `api.auth.*` — دخول حقيقي مقابل NestJS
- [ ] بقية المخازن عبر `whenReal(() => api.x(), () => mock)` — مخزنًا بمخزن
- [ ] تحقّق حيّ بعد كل مخزن

## ⬜ المرحلة 4 — نزع Supabase + البثّ اللحظي
- [ ] استبدال `cloudSync`/`directMessages` بنداءات العقد
- [ ] البثّ اللحظي عبر **NestJS WebSocket Gateway** (بدل Supabase Realtime)
- [ ] حذف `src/services/supabase.ts` + مجلّد `supabase/` بعد التغطية
- [ ] تحقّق حيّ: رسالة لحظية بين مستخدمين

## ⬜ المرحلة 5 — الواجهة: Vuetify → Tailwind
- [ ] إعداد Tailwind + رموز التصميم من الثيم الحالي
- [ ] مكوّنات أساس (Button/Card/Dialog/Input/Chip…)
- [ ] القشرة والتخطيط (Layout/Sidebar/Topbar)
- [ ] الصفحات صفحةً بصفحة ثم نزع حزمة Vuetify
- [ ] تحقّق حيّ بعد كل مجموعة (لقطات + تباين)

## ⬜ المرحلة 6 — النشر: Docker + Nginx + staging + CI
- [ ] Dockerfile للواجهة (Vite build → nginx static)
- [ ] Dockerfile + compose للباك-إند (Node) + Postgres
- [ ] Nginx عكسي (واجهة `/` · API `/api`)
- [ ] CI: بناء + اختبار + نشر staging
- [ ] `docker compose up` يشغّل المكدّس كاملًا

---

**تشغيل الباك-إند محليًّا (بلا Docker):** `cd api && npm install && cp .env.example .env && npm run start:dev`
