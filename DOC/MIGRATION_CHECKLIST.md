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
- [x] **ProfileStore** — إماهة من `api.profile.get()`+`proofRequests()` عند الدخول (الخادم مرجع الحقيقة؛ الفارغ يعود للبذرة تفاديًا لتسرّب كاش مستخدم سابق)، و`persist` يدفع اللقطة الكاملة PATCH مُمهَّلًا (600ms) خلف علَم `ready`، و`resolveProofRequest` عبر النقطة. **الواجهة بلا تغيير.** توسعة الخادم: عمود `prefs` + `UpdateProfileDto` يقبل الوثيقة الكاملة (skills/experiences/certificates/prefs). **مُتحقَّق حيًّا:** بعد مسح الكاش وإعادة التحميل عادت البيانات من NestJS (عنوان + 5 مهارات)، بلا أخطاء console
- [x] **PublicProfileStore** — إماهة المالك من `GET /public-profiles/me` (كتلة `doc` + عدّادات `stats` الحيّة تعلوها؛ الفارغ يبقي البذرة)، حفظ مُمهَّل `PATCH /me {doc}`، وأفعال الزوّار (view/follow/rate/comment/testimonial/contact/schedule/requestProof) تُرسَل لنقاط الخادم. توسعة الخادم: عمود `doc` + `GET /me` + `present()` يُسطّح `doc` ويُخفي `inbox`/`doc`. **مزامنة Supabase مُعطَّلة عند `USE_REAL_API`** (نُزعت فعليًّا في هذه الدفعة — كانت تصارع NestJS على الصفحة العامة). **مُتحقَّق حيًّا:** تحرير العنوان + متابعة + تقييم زائر → حُفظت في NestJS، وبعد مسح الكاش وإعادة التحميل عادت من الخادم؛ 0 نداء Supabase، بلا أخطاء console
- [x] **آلية عامة للمستندات الخاصة (blob):** مورد خادمي `GET/PUT /account-states/:store` (كيان `AccountState` بمفتاح فريد userId×store) يقابل جدول Supabase `account_states`. `syncPrivateDoc` يُوجَّه إليه عند `USE_REAL_API` (إماهة + حفظ مُمهَّل خلف `ready`) لكل مخزن **مُدرَج** في `NEST_PRIVATE_STORES` (يتوسّع مخزنًا بمخزن؛ المخازن ذات المورد المخصّص تُوصَل عبر موردها لا هنا). الحقن الصريح للاختبار يتجاوز التوجيه.
- [x] **Marketplace** — `RequestsStore` (طلباتي) · `PostedOpportunitiesStore` · `ApplicationsStore` (كلها blob خاص) صارت تُحفظ في NestJS عبر الآلية العامة (بلا أي تغيير في المخازن — فقط إدراجها). كتالوج الفرص/الطلبات الغنيّ يبقى بذرة عميل (بيانات عرض). **مُتحقَّق حيًّا:** تقديم على طلب → PUT مُمهَّل لـ account-states → مسح الكاش + reload → عادت التطبيقات الخمسة من الخادم، `syncStatus:synced`، بلا أخطاء console
- [x] **Interviews + Interviewers** — `InterviewsStore` (مقابلاتي بنتائجها الغنية) · `InterviewersStore` (ورشة المقيّم: حجوزات/أجندة/تسعير/عناصر تقييم) أُدرجا في `NEST_PRIVATE_STORES` فصارا يُحفظان في NestJS عبر الآلية العامة (بلا تعديل عليهما). **ملاحظة:** المخزنان أغنى من موردَي `/interviews` و`/interviewers` المبسّطَين فاعتُمد الـ blob (أوفى لبياناتهما الغنية). كتالوج المقيّمين يبقى بذرة عرض. **مُتحقَّق حيًّا:** بدء مقابلة + حجز → PUT مُمهَّل → مسح كل مفاتيح المقابلات + reload → عادا من الخادم (`synced`)، بلا أخطاء console
- [ ] بقية المخازن عبر `whenReal(() => api.x(), () => mock)` — مخزنًا بمخزن (التالي: Surveys → Notifications → Wallet/Plan)
- [x] تحقّق حيّ بعد كل مخزن (Auth ✓ · Profile ✓ · PublicProfile ✓ · Marketplace ✓ · Interviews/Interviewers ✓)

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
