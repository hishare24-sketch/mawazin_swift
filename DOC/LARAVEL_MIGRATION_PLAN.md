# خطة التحويل إلى مكدّس الفريق (Laravel 12 Modular Monolith) — حيّة

> تحويل الباك-إند من **NestJS (`api/`)** إلى **Laravel 12 Modular Monolith** المطابق لمعيار الفريق (`PROJECT_STRUCTURE` — hi-share).
> الواجهة (Vue) تبقى مستقرّة؛ العقد `api/openapi.yaml` هو الرابط الملزم للطرفين طوال التحويل.
> النمط المرجعيّ للتنفيذ: [`PROJECT_STRUCTURE (Laravel)`](./FILES/) + هذا الملف قائمة التحقّق الحيّة.

**📍 الموضع الحالي:** الخطة معتمدة، لم يبدأ التنفيذ. **الأولوية الحالية للواجهة هي لوحة التحكم** (مسار مستقلّ)؛ هذا الملف يوثّق مسار الباك-إند بالتوازي.

---

## القرارات النهائيّة (معتمدة)

| # | البند | القرار النهائيّ |
|---|-------|-----------------|
| 0 | العقد | `api/openapi.yaml` **مصدر الحقيقة الملزم** للواجهة و Laravel معًا — لا يتغيّر شكل أي endpoint إلا عبره |
| — | إصدار Laravel | **Laravel 12** (مطابقة تلقائية لإصدار الفريق) |
| 1 | غلاف الاستجابة | تكييف الواجهة على غلاف الفريق (`{data}` / `{data,meta}` / `{message}`) — تعديل مركزيّ في `apiClient` |
| 2 | المصادقة | **Sanctum** (توكن Bearer، متوافق مع تخزين التوكن الحاليّ) |
| 3 | الصلاحيّات | أعضاء المشاريع: **Spatie teams** (`team_id = project_id`). أدمن المنصّة: guard منفصل + `PermissionEnum` + `authorize()` |
| 4 | القاعدة | **MySQL / Amazon RDS**؛ Postgres الحاليّ يبقى حتى التقاعد؛ هجرة بيانات واحدة عند التحويل |
| 5 | المسارات | مثيلا axios: `/api/v1` عميل (Sanctum) + `/api/admin` أدمن (`AdminMiddleware`) |
| 6 | الترقيم | ترقيم خلفيّ حقيقيّ `->paginate()` + `{data,meta}` من اليوم الأوّل؛ الواجهة بصفحة كبيرة الآن، أزرار تدريجيًّا |
| 7 | البثّ اللحظيّ | **Reverb + Redis Pub/Sub** (`BROADCAST_CONNECTION=redis`)؛ الواجهة `socket.io-client` ← `laravel-echo` |

---

## قرارات معلّقة (تُثبَّت قبل المرحلة المعنيّة — لكلٍّ اقتراح افتراضيّ)

| # | القرار | الاقتراح الافتراضيّ (حتى يُثبَّت) | يُثبَّت قبل |
|---|--------|----------------------------------|-------------|
| ~~ع1~~ ✅ | **تسجيل الـ Observers** — محسوم من مشروع موازين الشقيق | **`EventServiceProvider` يدويّ + توجيه المسارات عبر `bootstrap/app.php`** (تكييف مخطّط Laravel 10 على 12) — نقلّد موازين حرفيًّا | ✅ محسوم |
| ع2 | **تعريف «المشروع»** في المجال — ما الذي يمثّله `project`؟ | مساحة عمل للتوظيف (حملة/شركة) يملكها صاحب دور company ويُدعى إليها متعاونون (مقيّمون/فريق HR) — منفصلة عن **دور المنصّة (persona)** | المرحلة 4 |
| ع3 | **مصدر `team_id`** في الطلب | مسار مُنطاقٌ `/api/v1/projects/{project}/...` + middleware يستدعي `setPermissionsTeamId()` | المرحلة 4 |
| ع4 | **حارس الأدمن** على `/api/admin` | Sanctum بـ guard منفصل `admin` + دور Spatie عامّ (بلا team) يفحصه `AdminMiddleware` | المرحلة 4 |
| ع5 | **تطبيع كل blob** — جدول مطبّع أم عمود JSON؟ | حسب جدول التصنيف في §«تطبيع الـ blobs» أدناه | المرحلة 3 |

---

## دروس المشروع الشقيق «موازين» (يسبقك بخطوة على نفس المسار)

موازين (منصّة محاسبة/مشاريع، 24 موديول NestJS) يخوض **نفس التحوّل NestJS→Laravel 12** الآن. ما تعلّمه = مكسب مجّانيّ لك:

- **✅ Laravel 12 مؤكَّد** — اختاره موازين لأن دعم حزم الفريق (Spatie/Reverb/laravel-modules) مستقرّ على 12 بينما 13 قد يتأخّر.
- **✅ نمط التأسيس:** `Laravel Sail` (Docker) محليًّا + Sanctum + `PermissionEnum` بالصلاحيّات **الحقيقيّة** (موازين 20 صلاحية — المصدر القانونيّ، لا أمثلة hi-share) + seeder + `permission:insert` + `glob` للمسارات + `AssertsApiJson` + `EventServiceProvider` يدويّ. **مخرَج المرحلة 0: هيكل مطابق للمخطّط حرفيًّا، فارغ جاهز.**
- **⚠️ أكبر خسارة:** **فقدان مشاركة أنواع TypeScript بين الواجهة والخادم** (Node→PHP) — خطّط لتكرار DTO أو توليدها من `openapi.yaml`.
- **⚠️ إعادة كتابة الاختبارات:** موازين نقل **123 اختبار خادم** من Jest إلى PHPUnit. عندك ~17 e2e خادم (+185 واجهة) تُعاد كتابتها PHPUnit — ابنِ الميزانية.
- **⚠️ فخّ Docker/MySQL:** فشلت أوّل هجرة عند موازين لأن حاوية composer المؤقّتة بلا سائق mysql — استبقه.
- **📌 لا يُنقل تلقائيًّا (القرار ع2):** «المشروع» عند موازين كيان حقيقيّ (مشاريع بأعضاء + مصفوفة صلاحيات `finance_edit`…) فـ Spatie teams يناسبه طبيعيًّا. **مجالك (توظيف) قد لا يملك «مشروعًا» طبيعيًّا** — النمط ينتقل، لكن *ما الذي يقابل الـ team عندك* يحتاج جوابك الخاصّ.

---

## خريطة المورد-بمورد (NestJS → Module لارافيل)

| مورد NestJS الحاليّ | Module لارافيل | الجداول (مطبّعة) | مسارات العقد الرئيسية |
|---------------------|----------------|-------------------|------------------------|
| `auth` + `users` (`user.entity`) | **User** | `users`, `personal_access_tokens` | `/auth/{register,login,me,logout}` |
| `profile` (`profile.entity`) | **Profile** | `profiles`, `skills`, `skill_proofs`, `experiences`, `certificates`, `proof_requests` | `/profile`, `/profile/skills*`, `/profile/proof-requests*` |
| `public-profiles` (`public-profile.entity`) | **PublicProfile** | `public_profiles`, `pp_views`, `pp_follows`, `pp_ratings`, `pp_comments`, `pp_testimonials`, `pp_contacts`, `pp_schedules` | `/public-profiles*` (view/follow/rate/comment/testimonial/contact/schedule/proof) |
| `account` (`wallet.entity`) + `/account/plan` + `/wallet` | **Account** | `wallets`, `wallet_actions`, (tier على `users`) | `/account/plan`, `/wallet` |
| `surveys` (`survey.entity`) | **Survey** | `surveys`, `survey_responses` | `/surveys`, `/surveys/{id}/responses` |
| `marketplace` (`opportunity`/`market-request`/`application`) | **Marketplace** | `opportunities`, `market_requests`, `applications` | `/opportunities*`, `/requests*` |
| `interviewers` (`interviewer`/`booking`) | **Interviewer** | `interviewers`, `bookings` | `/interviewers*`, `/bookings/{id}` |
| `interviews` (`interview.entity`) | **Interview** | `interviews` | `/interviews` |
| `notifications` (`notification.entity`) | **Notification** | `notifications` | `/notifications`, `/notifications/read-all` |
| `messages` (`direct-message.entity`) | **Chat** | `direct_messages` | `/direct-messages*`, `/conversations*` + بثّ Reverb |
| `account-states` (`account-state.entity`) | **AccountState** | `account_states` (userId×store) — احتياطيّ الـ blobs غير المطبّعة | `/account-states/{store}` |
| `/ai/{contract}` | **Ai** | `ai_*` (بيانات مشتركة/إعدادات) | `/ai/{contract}` |
| — (جديد) | **Admin** | `PermissionEnum`, أدوار، مستخدمو لوحة التحكم | كل `/api/admin/*` |

---

## تطبيع الـ blobs (المرحلة 3 — القرار ع5)

الـ 23 مخزنًا في `NEST_PRIVATE_STORES` تُصنّف:

**تُطبَّع إلى جداول موردها (لها منطق/استعلام):**
`requests` · `postedOpportunities` · `applications` → **Marketplace** · `interviews` · `interviewerWorkspace` → **Interviewer/Interview** · `surveys` → **Survey** · `notifications` → **Notification** · `wallet` · `accountPlan` → **Account** · `messages` → **Chat** · `candidates` · `roleProfiles` · `resumes` · `expertRoles` · `peerRequests` · `roleRequests` · `endorser` · `interviewerBrand` · `reviews`

**تبقى عمود JSON / `account_states` (تفضيلات عرض بلا استعلام):**
`saved` · `wishes` · `searchPrefs` · `gamification` (قابل للتطبيع لاحقًا لو احتيج تجميع نقاط خادميّ)

> القاعدة: أي مخزن يُفلتر/يُرتّب/يُجمَّع عليه خادميًّا → **جدول + فهارس** (§6 من المعيار). أي مخزن يُقرأ/يُكتب ككتلة واحدة لصاحبه فقط → JSON.

---

## المراحل

### ✅ المرحلة 0 — الأساس (Scaffold + معايير الفريق) — مُنجزة ومُتحقَّقة حيًّا
> **المكان:** `backend/` (موازٍ لـ `api/` NestJS). **التشغيل:** `cd backend && docker compose up -d` (Sail) — المنافذ **8090** تطبيق · **3307** mysql · **6380** redis · **5175** vite · **8091** reverb (مغايرة لموازين العامل على الافتراضيّة).
- [x] Laravel **12.63** عبر Docker/Sail (لا PHP محليًّا) + `nwidart/laravel-modules 13` + `laravel/sanctum 4.3` + `spatie/laravel-permission 8.3` (**teams=on**) + `laravel/reverb 1.10`
- [x] `composer.json`: `psr-4 Modules\\` + `autoload.files: app/Helpers/helpers.php` (مُتحقَّق: الهيلبرز يُحمَّل، الموديول PSR-4 يعمل)
- [x] Base `Controller` بـ `dataResponse`/`dashboardResponse`/`updatedResponse`/`createdResponse`/`errorResponse`/`forbiddenResponse` (سِمة `ApiResponder`) + `authorize()`/`checkAuthorize()` (Spatie، guard admin)
- [x] توجيه عبر **`bootstrap/app.php`** (تكييف Laravel 12): `glob` على `Modules/*/Routes/{api,web}.php` تحت `api/v1` (Sanctum) + `api/admin` (`AdminMiddleware`) — مُتحقَّق حيًّا (المجموعتان تُصيّران 404، لا 500)
- [x] `PermissionEnum` (**36 صلاحية توظيف حقيقيّة**) + `PermissionSeeder`/`RoleSeeder`/`RoleHasPermissionSeeder` + أمر `permission:insert`
- [x] **EventServiceProvider يدويّ** (مُسجَّل في `bootstrap/providers.php`) — نمط موازين (ع1)
- [x] `tests/Support/Api/AssertsApiJson.php`
- [x] MySQL عبر Sail + هجرة **خضراء** (permission_tables بـ `team_id` + `personal_access_tokens`) + `permission:insert` — **مُتحقَّق:** 36 صلاحية · 3 أدوار · super_admin يملك الكلّ · عمود `team_id` موجود
- [x] **تحقّق HTTP حيّ:** `/up`→200 · `/api/v1/*`→404 · `/api/admin/*`→404 (كلّها من Laravel، التطبيق يُقلع نظيفًا)
- [ ] **بند صفر (المرحلة 1):** نسخ `api/openapi.yaml` مرجعًا للموديولات و Postman
> **درس Sail:** بعد تعديل `bootstrap/`/`config`/`.env` **أعد تشغيل حاوية التطبيق** (`docker compose restart laravel.test`) — عمليّة `php artisan serve` تحمل opcache قديمًا فتعطي 500 عابرة حتى الإحماء.

### ✅ المرحلة 1 — المصادقة (Sanctum) — مُنجزة ومُتحقَّقة حيًّا (curl مقابل العقد)
- [x] Module **User**: `Modules/User/Entities/User` (Authenticatable + HasApiTokens + HasRoles + uuid تلقائيّ + role/tier/phone؛ password cast=hashed) + هجرة `add_recruitment_fields_to_users` (uuid unique + role/tier مفهرسة + phone) + `config/auth.php` يشير للكيان + تحميل هجرات الموديولات عبر glob في `AppServiceProvider`
- [x] `AuthController` رفيع (register/login/me/logout) + `AuthService` (كل المنطق) + `RegisterRequest`/`LoginRequest` + `AuthUserResource` (مطابق للعقد) + `Modules/User/Routes/api.php` (auth:sanctum على me/logout)
- [x] **غلاف `{data}`** مطبَّق (register 201 · login 200 · me · logout) — الواجهة تفكّه أصلًا (`unwrapEnvelope`)
- [x] **تحقّق حيّ (curl):** register→201 `{data:{token,user}}` (user كامل: id/uuid/name/email/role/tier/phone/created_at) · login→200 · me(Bearer)→200 · logout→200 · me بعد logout→401 (توكن أُبطل) · دخول خاطئ→401 · بلا توكن→401 · فاليديشن→422. **الشكل مطابق `ApiAuthSession`/`ApiAuthUser`.**
- [ ] **مؤجّل:** التحقّق عبر الواجهة الفعليّة + تحويل `VITE_BASE_API_URL`→:8090 — يبقى على NestJS حتى تُرحَّل موارد كافية (تبديل مبكّر يكسر المخازن التي تعتمد نقاط NestJS غير المنفَّذة بعد في Laravel)
> **درس Sail حاسم:** حاويات composer/artisan المؤقّتة **كـ root** تُنشئ ملفّات في `storage`/`bootstrap/cache` لا يملكها مستخدم `sail` → الخادم يدخل حلقة إعادة تشغيل (Permission denied على laravel.log). **الحلّ بعد أي عمليّة root:** `docker compose exec -u root laravel.test chown -R sail:sail storage bootstrap/cache`.

### ✅ المرحلة 2 — الموارد مورد-بمورد (لكل مورد في العقد) — مُنجزة (7 موديولات، 43 اختبارًا)
لكل مورد: Entities → Migrations (+index) → Requests (Api/Admin) → Resources → Services → Controller رفيع → Feature Test.
- [x] **Profile** — كيان بأعمدة JSON (skills/experiences/certificates/prefs/proof_requests، user_id فريد) + `GET/PATCH /profile` (وثيقة PrivateProfile) + skills add(201)/remove(204) + skill proofs + proof-requests get/resolve. **مُتحقَّق حيًّا (curl) + 6 Feature tests خضراء.** أُرسيت أداة الاختبار: MySQL `testing` (Sail) + RefreshDatabase + Sanctum::actingAs + `AssertsApiJson`. **قرار:** Profile وثيقة مملوكة لمستخدم (JSON) لا تطبيع — يطابق NestJS + الواجهة.
- [x] **PublicProfile** — كيان (doc/stats/testimonials/comments/inbox، slug مشتقّ) + `GET/PATCH /me` (auth) + `GET /{slug}` عام + view/follow/rate/comment/contact/schedule/testimonial/proof-request (بلا مصادقة). `present()` = doc مسطّح + slug/stats/تفاعلات. **التفاعل العابر:** طلب إثبات الزائر يصل ملف المالك عبر `ProfileService::pushProofRequest` (تبعيّة PublicProfile→Profile). **مُتحقَّق حيًّا (curl) + 7 Feature tests خضراء.** (الحزمة كلها: 15 اختبارًا)
- [x] **Account** — كيان `Wallet` (رصيد ترحيبيّ 100 + سجلّ عمليّات) + `GET /wallet` + `GET/PUT /account/plan` (tier على users؛ أسعار free=0/pro=50/elite=150؛ الترقية تخصم الفرق من المحفظة، **402** عند نقص الرصيد، التخفيض مجّانيّ). **6 Feature tests خضراء** (الحزمة: 21 اختبارًا).
- [x] **Survey** — كيان (6 حالات + points_pool + targeting/questions/responses، user_id مفهرس) + `GET/POST /surveys` (حدّ الباقة free=1/pro=10/elite=∞ → **403**) + `POST /surveys/{id}/responses` (يصرف نقطة من المجمّع). **5 Feature tests خضراء.**
- [x] **Marketplace** — 3 كيانات (Opportunity/MarketRequest/Application، فهارس category/type/state + unique(user,opp)) + `GET/POST /opportunities` (فلترة q/category) + `apply` (مثاليّ→ firstOrCreate) + `GET /requests` (فلترة type) + `/requests/mine`. بذور كسولة (3+3). **7 Feature tests خضراء.**
- [x] **Interviewer + Interview** — Interviewer (سوق مرتّب بالتقييم + Booking: حجز pending + `PATCH /bookings/{id}` قبول/رفض/إكمال بتقرير، تفويض owner/interviewer وإلا **403**) + Interview (`GET/POST /interviews`: مقابلاتي + بدء بمسار). بذور 3 مقيّمين. **7 Feature tests خضراء.**
- [x] **Notification** — كيان (icon/title/body/category/read/action_to، فهرس user_id×read) + `GET /notifications` (إشعار ترحيبيّ عند أول وصول) + `POST /notifications/read-all` + `push()` داخليّ (متاح للتدفّقات). **3 Feature tests خضراء.**
- [⏭️] **Ai** — `/ai/{contract}` **مؤجّل** (لم يُنفَّذ في NestJS أصلًا — لا موديول ai في `api/src`؛ الواجهة تستخدم mockAi عبر `USE_MOCK_AI`؛ ربط Claude الحقيقيّ مؤجّل بطلب المستخدم — يتطلّب مفتاح API + وسيط). يُبنى عند تفعيل الذكاء الحقيقيّ.
- [~] الروابط بين الموديولات → **Observers**: طُبّق التفاعل العابر المباشر (PublicProfile→Profile عبر حقن الخدمة للفعل الأساسيّ). دفعات الإشعارات المُطلَقة من التدفّقات (حجز/رسالة) تُوصَل عبر Observers في دفعة لاحقة عند الحاجة.
- [x] **تحقّق حيّ:** Profile + PublicProfile مُتحقَّقان curl؛ الجميع مُتحقَّق بـ **43 Feature test** مقابل MySQL.

### ✅ المرحلة 3 — الـ blobs (ع5) — مُنجزة
- [x] مخازن الموارد مُطبَّعة إلى جداولها في المرحلة 2 (marketplace/surveys/interviews/notifications/wallet/plan/profile/public-profiles)
- [x] Module **AccountState**: `GET/PUT /account-states/{store}` (blob عامّ userId×store، upsert) — يخدم كل المخازن الخاصّة الباقية (candidates/roleProfiles/resumes/expertRoles/peerRequests/roleRequests/endorser/interviewerBrand/reviews/saved/wishes/searchPrefs/gamification). **4 Feature tests خضراء.**
- **قرار (ع5):** أبقيتُها blobs كما فعل NestJS تمامًا (لم يُطبّعها هو الآخر) — لا عقد لها ولا حاجة استعلام عابر؛ التطبيع المخصّص يبقى تحسينًا اختياريًّا لاحقًا. **بهذا كل مخازن الواجهة الخاصّة مخدومة من Laravel** (عدا الرسائل اللحظيّة → المرحلة 5).
- [ ] الواجهة: توجيه المخازن لـ Laravel — مؤجّل لطور التحويل الأماميّ (المرحلة 6)

### ✅ المرحلة 4 — الصلاحيّات (حارس أدمن، **بلا teams**) — مُنجزة
> **قرار ع2 (المالك):** **بلا Spatie teams** — المنصّة persona-based (أدوار seeker/interviewer/company فورية، admin الوحيد المُعتمَد؛ فلسفة «الحساب الموحّد»). فأُلغيت teams وبُسّطت المرحلة.
- [x] `config/permission.php` **teams=false** + إعادة تأسيس المخطّط نظيفًا
- [x] حارس `admin` معرَّف في `config/auth.php` (driver sanctum، provider users) — يجعل guard `admin` معترَفًا به لأدوار Spatie على المستخدم (حلّ GuardDoesNotMatch)
- [x] `AdminMiddleware` يفرض: مصادَق (auth:sanctum) + يحمل دورًا على guard admin، وإلا **403**
- [x] `/api/admin` group = `[api, auth:sanctum, admin]`؛ كل متحكّم يفرض `$this->authorize('...')` (على guard admin عبر Base Controller)
- [x] نقطة إثبات `GET /api/admin/users` (authorize `view_users` + `dashboardResponse` مقسّم `{data, meta}`) + أمر `user:promote {email} {role}`
- [x] **تحقّق (4 Feature tests):** 401 بلا توكن · 403 لغير الأدمن · 200 للأدمن بـ view_users · **403 لدور أدمن بلا الصلاحية المحدّدة**. (الحزمة: 51 اختبارًا)

### ✅ المرحلة 5 — البثّ اللحظيّ (Reverb) — مُنجزة (باك-إند + أمامي مُتحقَّق حيًّا)
- [x] Module **Chat**: كيان `DirectMessage` (uuid طرفين، فهارس sender/recipient) + `POST/GET /direct-messages` + `POST /direct-messages/read` + `GET /direct-messages/resolve/{slug}` (يحلّ مالك الصفحة عبر PublicProfile+User)
- [x] حدث **`MessageSent`** (`ShouldBroadcast`) على `PrivateChannel('user.{uuid}')` + `broadcastAs('message.sent')`؛ الإرسال يبثّه. تفويض القناة في `routes/channels.php` (`$user->uuid === $uuid`). `BROADCAST_CONNECTION=reverb` (dev، مُصفّ عبر queue فلا يعطّل الإرسال)
- [x] **5 Feature tests خضراء** (منها تأكيد بثّ الحدث على القناة الصحيحة). الحزمة: **56 اختبارًا**
- [x] **التحويل الأماميّ مُنجز ومُتحقَّق حيًّا:** خدمتا compose `reverb`(8091 مكشوف)+`queue`(queue:work) دائمتان · مصنع Echo مشترك `src/services/echo.ts` (laravel-echo+pusher-js، `/broadcasting/auth` بتوكن Bearer) · ثلاث خدمات بثّ أماميّة على `user.{uuid}`: **الرسائل** `.message.sent` · **الإشعارات** `.notification.new` (C3) · **الدعم** — مُفعَّلة في DefaultLayout/AssistantPage/AdminSupportPage. **تحقّق حيّ e2e (متصفّح فعليّ):** `POST /broadcasting/auth 200`×2 (إشعارات+رسائل) · دفع خادميّ (tinker `push`) → queue → Reverb → **متجر الإشعارات 1→2 فورًا بلا إعادة جلب HTTP**.
- [ ] Redis Pub/Sub (`BROADCAST_CONNECTION` عبر Redis) — للتوسّع على AWS، يُضبط في النشر

### 🟡 المرحلة 6 — التحويل الأماميّ + الترقيم + التقاعد — **التحويل الأماميّ مُنجز ومُتحقَّق حيًّا**
- [x] **التحويل الأماميّ:** `VITE_BASE_API_URL`→`http://localhost:8090/api` (الواجهة تفكّ `{data}` وتتوقّع أخطاء 422 «بأسلوب Laravel» أصلًا). **مُتحقَّق حيًّا في المتصفح:** تسجيل عبر الواجهة → `POST /api/v1/auth/register` **201** من Laravel → **توكن Sanctum حقيقيّ** (`1|…`) في authUser (id/uuid من القاعدة) → أدوار مُعبّأة عبر `fromNestUser` → انتقال onboarding → إماهة المخازن من `/account-states/*` (Bearer يعمل، **0 نداء فاشل**، **0 خطأ console**) → الجلسة تدوم بعد إعادة التحميل. CORS الافتراضيّ يسمح (api/* + أصل *).
- [x] `->paginate()` + `{data,meta}` **معمّم على كل قوائم العميل** (opportunities/requests/mine · surveys · notifications · interviews · interviewers) عبر مساعِدَي `ApiResponder::paginatedResource()` + `perPage()` (افتراضي 15، محدود 100). **غير كاسر:** `data` يبقى مصفوفة الصفحة، و`unread` في الإشعارات يبقى إجماليًّا. أزرار الصفحات أماميًّا **جاهزة أصلًا** في كونسول الأدمن (ResourceScaffold + useAdminResource) — المستهلك الحقيقيّ الوحيد لقوائم العميل هو الإشعارات (تعرض أحدث صفحة، وهو المطلوب). **+9 اختبارات meta/ترقيم؛ الحزمة 214 خضراء.**
- [x] مؤجّلات المرحلة 5 الأماميّة (البثّ اللحظيّ) — **مُنجزة ومُتحقَّقة حيًّا e2e** (تفصيلها في المرحلة 5 أعلاه: رسائل+إشعارات+دعم على Reverb).
- [ ] هجرة بيانات (إن لزم — dev يبدأ نظيفًا؛ يهمّ فقط لو ثمّة بيانات NestJS إنتاجيّة)
- [ ] تقاعد `api/` (NestJS): إيقاف، إبقاء العقد `openapi.yaml` مرجعًا
- [ ] تحديث `deploy.yml`/CI: `php artisan permission:insert` بعد كل نشر + نشر Laravel (Docker/Nginx) بدل GitHub Pages المحاكاة

---

## قائمة تحقّق «أي Feature جديدة» (من معيار الفريق — تُطبَّق في كل مورد)
```
[ ] Controller رفيع — Service فقط، بلا استعلامات معقّدة
[ ] Service يحمل كل المنطق والاستعلامات
[ ] FormRequest منفصل لكل endpoint (Api/ و Admin/)
[ ] Response عبر dataResponse/dashboardResponse/updatedResponse/errorResponse فقط
[ ] أي تأثير على موديول تاني → Observer (ع1)
[ ] صلاحية جديدة → PermissionEnum + authorize() + permission:insert
[ ] Migration → index على كل FK وأي عمود يُفلتر/يُرتّب (idempotent)
[ ] Route في مكانه: api.php (عميل) أو web.php (أدمن)
[ ] Feature Test: happy path بكل المتغيّرات + كل قاعدة فاليديشن + missing fields
[ ] تحديث openapi.yaml لو تغيّر عقد endpoint
```

---

*آخر تحديث: صياغة الخطة (قبل بدء التنفيذ). المسار موازٍ لعمل لوحة التحكم في الواجهة.*
