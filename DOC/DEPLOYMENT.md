# نشر منظومة التوظيف — مكدّس موازين (Render + Supabase + Resend + Firebase)

> الهدف: جعل الباك-إند (`backend/` Laravel) والواجهة حيّين على دومين حقيقيّ، بنفس مكدّس منصّة موازين.
> **مبدأ أمنيّ:** كلّ الأسرار تُلصَق في لوحات الخدمات (Render/Supabase) — لا في المستودع ولا في أيّ محادثة.

## المكوّنات
| الخدمة | الدور | الملفّ الجاهز |
|--------|------|--------------|
| **Render** | استضافة + نشر تلقائيّ من GitHub + **Postgres + Redis** | `render.yaml` (مخطّط: db + web + queue + reverb + redis، القاعدة تُربَط تلقائيًّا) |
| **Resend** | بريد المعاملات | `MAIL_MAILER=resend` (يتطلّب تثبيت الحزمة — §الخطوة 5) |
| **Firebase** | إشعارات Push (FCM) | `FIREBASE_CREDENTIALS` (يتطلّب قناة FCM — §الخطوة 5) |

## الرَنبوك (6 خطوات — نقر فقط)

### 1) القاعدة — Render Postgres (تلقائيّة)
لا خطوات يدويّة: `render.yaml` يُعرّف `recruitment-db` (Postgres 16)، وRender يُنشئها ويحقن
`DB_HOST/PORT/DATABASE/USERNAME/PASSWORD` في الخدمات تلقائيًّا عند تطبيق الـBlueprint.

### 2) Render — المخطّط
1. Render → **New → Blueprint** → اختر مستودع `smart-recruitment-system` (يقرأ `render.yaml`).
2. يُنشئ 4 خدمات: `recruitment-api` · `recruitment-queue` · `recruitment-reverb` · `recruitment-redis`.

### 3) الأسرار — في مجموعة البيئة `recruitment-shared`
املأ المفاتيح المعلّمة `sync: false` (لن يطلبها أحد غيرك):
- `APP_KEY` = ناتج `php artisan key:generate --show` (شغّله محليًّا مرّة).
- `APP_URL` = دومين الـAPI (مثال `https://api.example.com`).
- `DB_HOST/DB_USERNAME/DB_PASSWORD` = من Supabase (الخطوة 1).
- `REVERB_APP_ID/KEY/SECRET` = ولّد قيمًا عشوائيّة (أو `php artisan reverb:...`).
- `REVERB_HOST` = دومين خدمة reverb (الخطوة 6).
- `RESEND_API_KEY` + `MAIL_FROM_ADDRESS` (الخطوة 5).
- `FIREBASE_CREDENTIALS` + `ANTHROPIC_API_KEY` (اختياريّ).

### 4) أوّل نشر
- Render يبني الصورة، ثمّ `preDeployCommand` يشغّل **`migrate --force` + `permission:insert`** تلقائيًّا.
- تحقّق الصحّة: `GET https://<api>/up` → 200.

### 5) Resend + Firebase (مربوطان في الباك-إند ✅)
- **Resend (البريد):** الحزمة `resend/resend-laravel` مُثبَّتة، ومحرّك البريد `resend` مُعدّ. يُرسَل **بريد ترحيبيّ مُصفَّر** عند التسجيل. **يكفي ضبط `RESEND_API_KEY` + `MAIL_FROM_ADDRESS` في Render** ليعمل الإرسال الحقيقيّ.
- **Firebase FCM (Push):** الحزمة `kreait/laravel-firebase` مُثبَّتة + `FcmService` محكوم يُرسِل Push لأجهزة المستخدم مع كلّ إشعار (يُكمّل بثّ Reverb)، وينظّف التوكنات غير الصالحة. جدول `device_tokens` + نقطتا العميل `POST/DELETE /api/v1/device-tokens`. **يكفي ضبط `FIREBASE_CREDENTIALS` في Render** ليعمل الإرسال.
  - **متبقٍّ أماميّ (اختياريّ):** ويب-Push الفعليّ يحتاج Service Worker + Firebase JS SDK + إذن المتصفّح، ثمّ استدعاء `POST /api/v1/device-tokens`. الباك-إند جاهز لاستقباله.

### 6) الدومين + Reverb + الواجهة
1. اربط دومينك بخدمة `recruitment-api` (Render → Settings → Custom Domain، SSL تلقائيّ).
2. اربط `ws.example.com` بخدمة `recruitment-reverb`، وحدّث `REVERB_HOST`.
3. الواجهة: اضبط `VITE_BASE_API_URL=https://api.example.com/api` + `VITE_USE_REAL_API=true` + `VITE_REVERB_*`، وانشرها (Render Static Site أو GitHub Pages بالبناء الحقيقيّ).

## ملاحظات توافق Postgres (Supabase)
- الهجرات محمولة (Schema Builder) وتعمل على Postgres مباشرة.
- **بحث `LIKE` حسّاس لحالة الأحرف في Postgres** (بعكس MySQL). المحتوى العربيّ غير متأثّر؛ للبحث اللاتينيّ (بريد/عناوين إنجليزيّة) يُنصَح بتحويل عمليّات البحث إلى `ILIKE` عبر ماكرو `whereLike` — **متابعة اختياريّة** موثّقة، لا تحجب النشر.

## تقاعد NestJS (`api/`)
`api/` (NestJS) **مُهمَل** — الواجهة تعمل على Laravel. يبقى `api/openapi.yaml` **مرجع العقد** فقط. لا يُبنى ولا يُنشَر.
