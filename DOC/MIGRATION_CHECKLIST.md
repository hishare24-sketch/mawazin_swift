# قائمة تحقّق التحويل إلى مكدّس الفريق (حيّة)

> تتبّع تقدّم التحويل مرحلةً بمرحلة. الخطة الكاملة والقرارات في [`ARCHITECTURE.md`](./ARCHITECTURE.md).
> الهدف: **Vue SPA + NestJS + JWT (`api/`) + Docker/Nginx/staging + Tailwind**، عقد `api/openapi.yaml` مصدر الحقيقة، Supabase محوّل يُنزع.

**📍 الموضع الحالي:** انتهت المرحلتان 1 و2 (مُتحقَّقتان حيًّا)؛ **المرحلة 3 جارية** — المصادقة محوّلة ومُتحقَّقة حيًّا، والتالي بقية المخازن مخزنًا بمخزن.

---

## ✅ المرحلة 1 — أساس الباك-إند (NestJS) — مُنجزة ومُتحقَّقة حيًّا
- [x] مشروع `api/` (NestJS 10): prefix `/api/v1`، CORS، ValidationPipe (422 نمط Laravel)
- [x] غلاف استجابة `{ data }` + فلتر أخطاء عام + نقطة `health`
- [x] قاعدة قابلة للتبديل: sql.js (تطوير) / Postgres (إنتاج) بمتغيّر `DB_CONNECTION`
- [x] كيان `User` (uuid/role/phone، password select:false + bcryptjs)
- [x] مصادقة JWT: register · login · me · logout — مختبَرة حيًّا (curl)

## ✅ المرحلة 2 — موارد الباك-إند (لكل مورد في `openapi.yaml`) — مُنجزة ومُتحقَّقة حيًّا
لكل مورد: كيان (Entity) → وحدة (Module) → متحكّم (Controller) → حارس/صلاحية (Guard) → اختبار.
الحقول المتداخلة (مهارات/إثباتات/تفضيلات…) تُخزَّن أعمدة `simple-json` لتطابق شكل المخزن الواحد في الواجهة؛ كل مورد مملوك للمستخدم عبر `@CurrentUser()` + `JwtAuthGuard`.
- [x] `profile` (المهارات/الإثباتات/الخبرات/الشهادات + طلبات الإثبات) — `src/profile/`
- [x] `public-profiles` (الصفحة العامة بلا مصادقة + تحرير المالك `/me` بـ slug مشتقّ + مشاهدة/متابعة/تقييم/تعليق/تواصل/جدولة/توصية/طلب إثبات) — `src/public-profiles/`
- [x] `account/plan` + `wallet` (رصيد ترحيبي 100؛ الترقية تخصم الفرق من المحفظة → 402 عند نقص الرصيد؛ tier على User) — `src/account/`
- [x] `surveys` (+ الردود؛ حدّ إنشاء حسب الباقة free=1/pro=10/elite=∞ → 403؛ الردّ يصرف من مجمّع النقاط) — `src/surveys/`
- [x] `opportunities` + `requests` (بذور أوليّة + فلترة q/category/type + تقديم + طلباتي) — `src/marketplace/`
- [x] `interviews` + `interviewers` (بذور مقيّمين + حجز pending + PATCH قبول/رفض/إكمال بتقرير) — `src/interviewers/` + `src/interviews/`
- [x] `notifications` (إشعار ترحيبي عند أول وصول + تعليم الكل مقروءًا + `push()` داخلي للتدفقات) — `src/notifications/`
- **التحقّق:** `test/phase2.e2e-spec.ts` — 12 اختبار تكامل e2e يمرّ على كل مورد عبر HTTP الكامل (`npm test`)، + جولة curl حيّة مقابل `dev.sqlite` (رقّي المخطط تلقائيًا: عمود tier + الجداول الجديدة).
- المرجع الحيّ: [`../supabase/migrations/`](../supabase/migrations/) + [`CLOUD_SYNC.md`](./CLOUD_SYNC.md)

## 🟡 المرحلة 3 — ربط الواجهة بالعقد (بلا لمس الشكل) — جارية
- [x] `.env.development`: `VITE_USE_REAL_API=true` + `VITE_BASE_API_URL=http://localhost:8000/api` (المسارات تحمل `/v1/...`؛ النسخة الحيّة غير متأثّرة — بناء إنتاج و`.env.production` فارغ)
- [x] **طبقة العميل تفكّ غلاف `{ data }`** للباك-إند (`unwrapEnvelope` في `src/services/api/index.ts`) + مساعد `put` — لتصل المخازن حمولة صافية بشكل mock
- [x] تحويل **المصادقة** عبر `api.auth.*` — للـ NestJS الأولوية عند تفعيل المفتاح (`AuthService.login/register/logout`)، ومُطابِق `fromNestUser`، و`realAuthEnabled = USE_REAL_API || supabaseEnabled` — **مُتحقَّق حيًّا:** دخول + تسجيل عبر الواجهة → توكن JWT حقيقي من NestJS في `authUser` (id من القاعدة، لا mock-token)، بلا أخطاء console
- [ ] بقية المخازن عبر `whenReal(() => api.x(), () => mock)` — مخزنًا بمخزن (الترتيب: Profile → PublicProfile → Marketplace → Interviewers/Interviews → Surveys → Notifications → Wallet/Plan)
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
