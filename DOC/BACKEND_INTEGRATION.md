# دليل الربط الخلفي — منظومة التوظيف الذكية

الواجهة تعمل اليوم **بمحاكاة كاملة** (Pinia + localStorage). هذا الدليل هو خطة التحويل إلى باك‑إند حقيقي (Laravel) **دون تغيير أي واجهة مخزن أو صفحة**.

## المكوّنات الثلاثة

| المكوّن | المسار | الدور |
|---|---|---|
| عقد الـAPI | [`api/openapi.yaml`](../api/openapi.yaml) | مصدر الحقيقة بين الفريقين — كل مسار يقابل وظيفة مخزن |
| طبقة العميل | [`src/services/api/index.ts`](../src/services/api/index.ts) | نداءات typed خلف مفتاح `USE_REAL_API` + تطبيع أخطاء موحّد |
| نقل HTTP | [`src/plugins/axios.ts`](../src/plugins/axios.ts) | Bearer token + Accept-Language + معالجة 401 عالمية |

## التفعيل

```bash
# .env.development
VITE_BASE_API_URL=http://localhost:8000/api
VITE_USE_REAL_API=true   # الافتراضي false = محاكاة محلية كاملة
```

## نمط التحويل داخل المخزن (store-by-store)

كل مخزن يُحوَّل مستقلًّا عبر `whenReal` — الصفحات لا تتغير إطلاقًا:

```ts
import { api, whenReal } from '@/services/api'

async function toggleFollow() {
  const result = await whenReal(
    () => api.publicProfile.toggleFollow(state.value.slug),
    () => { // منطق المحاكاة الحالي كما هو
      state.value.visitorFollows = !state.value.visitorFollows
      state.value.followersCount += state.value.visitorFollows ? 1 : -1
      return { following: state.value.visitorFollows, followersCount: state.value.followersCount }
    },
  )
  state.value.visitorFollows = result.following
  state.value.followersCount = result.followersCount
}
```

## خريطة المخازن → الموارد

| المخزن | مورد العقد | ملاحظات الترحيل |
|---|---|---|
| `AuthStore` | `auth.*` | استبدال AuthService الوهمي؛ التوكن يبقى في المخزن (axios يقرؤه) |
| `ProfileStore` | `profile.*` | المهارات/الإثباتات/طلبات الإثبات — أول مرشح للتحويل (CRUD نظيف) |
| `PublicProfileStore` | `publicProfile.*` | `avatarImage` يتحول من dataURL إلى رفع ملف + رابط مستضاف |
| `OpportunitiesStore` + `PostedOpportunitiesStore` | `marketplace.opportunities` | |
| `RequestsStore` | `marketplace.requests` | |
| `InterviewersStore` | `interviewers.*` | الحجوزات والتقارير |
| `InterviewsStore` | `interviews` | جلسة المقابلة التكيفية تبقى client-side؛ النتيجة تُرفع |
| `SurveysStore` | `surveys.*` | حدود الباقة تُفرض خادميًا أيضًا (403) |
| `NotificationsStore` | `messaging.notifications` | لاحقًا: WebSocket/SSE بدل polling |
| `MessagesStore` | `messaging.conversations` | |
| `WalletStore` | `account.wallet` | كل خصم يصير معاملة خادمية ذرّية |
| `AccountPlanStore` | `account.plan` | الترقية تُدفع خادميًا (402 عند نقص الرصيد) |

## وسيط الذكاء الاصطناعي (حماية المفتاح)

استدعاء Claude من المتصفح **يكشف مفتاح API** — لذلك العقد يعرّف `POST /ai/{contract}`:

- `contract` = اسم أي عقد من `src/services/ai/types.ts` (25+ عقدًا).
- الخادم يحمل المفتاح، ينفّذ الـprompt، ويعيد JSON بنفس شكل `mockAi`.
- التبديل في `src/services/ai/index.ts`: `USE_MOCK_AI=false` → تنفيذ عبر `api.ai(contract, payload)`.

## ترتيب الترحيل المقترح

1. **Auth** — الأساس (توكن حقيقي يغذي axios).
2. **ProfileStore** — CRUD نظيف بلا تشابكات.
3. **PublicProfileStore** — يعتمد على 1+2 (الصفحة العامة تُخدم بلا مصادقة).
4. **Marketplace** (فرص + طلبات) ثم **Interviewers/Interviews**.
5. **Messaging + Notifications** (مع ترقية لاحقة لـ WebSocket).
6. **Wallet + Plan** أخيرًا (حساسية مالية — تتطلب معاملات ذرّية خادمية).

## قواعد ثابتة

- **الاختبارات الحالية تبقى على المحاكاة** — لا تعتمد اختبارات المخازن على شبكة أبدًا.
- أخطاء كل النداءات تمر عبر `normalizeApiError` → `{ status, message, fieldErrors? }`.
- أي مسار جديد يُضاف إلى `api/openapi.yaml` **قبل** إضافته إلى `API_PATHS`.

---

# Supabase — أول باك-إند حقيقي (مُفعَّل جزئيًا)

المشروع: `maqogxdksjpibsnkskiq` — <https://maqogxdksjpibsnkskiq.supabase.co> (مربوط بحساب GitHub).

| المكوّن | المسار | الدور |
|---|---|---|
| العميل | [`src/services/supabase.ts`](../src/services/supabase.ts) | عميل كسول — `null` عند غياب المفاتيح (محاكاة كاملة) |
| المخطط | [`supabase/schema.sql`](../supabase/schema.sql) | جدول `public_profiles` (slug + data jsonb) مع RLS |
| المزامنة التجريبية | `PublicProfileStore` | قراءة عند الإقلاع + upsert مؤجل (1.2s) لكل تعديل + مؤشر `syncStatus` |

## حالة التفعيل: ✅ مكتمل

- المفتاح العلني في `.env.local` محليًا ومضمّن في `deploy.yml` للنسخة الحية (publishable — علني بطبيعته).
- ⚠️ درس Vite: لا تعرّف `VITE_SUPABASE_ANON_KEY=` فارغًا في `.env.development` — يتقدّم على `.env.local` فيمحو القيمة الحقيقية.

## الترحيلات (migrations) — الإدارة المباشرة للقاعدة

| المكوّن | المسار |
|---|---|
| ملفات SQL مرقّمة | `supabase/migrations/000N_*.sql` |
| المُرحِّل | `scripts/db-migrate.mjs` → `npm run db:migrate` |
| التتبّع | جدول `public._migrations` (ما طُبّق لا يتكرر) |
| الاعتماد | `SUPABASE_ACCESS_TOKEN` (رمز شخصي `sbp_...`) في `.env.local` غير المتتبع — **بلا بادئة VITE_ عمدًا** كي لا يصل للمتصفح |

سير العمل عند أي توسعة: أضف `000N_feature.sql` → `npm run db:migrate` → انتهى. لا حاجة لـSQL Editor.

> `supabase/schema.sql` بقي كمرجع تاريخي للإعداد اليدوي الأول؛ المصدر المعتمد الآن هو مجلد `migrations/`.

## المصادقة الحقيقية (Supabase Auth) — ✅ مفعّلة

- **التسجيل والدخول حقيقيان** عند تفعيل المفاتيح: `AuthService` يوجّه login/register/logout إلى Supabase Auth (بريد + كلمة مرور، تأكيد البريد تلقائي عبر `mailer_autoconfirm`)، والاسم/الدور/الهاتف في `user_metadata`. المحاكاة تبقى تلقائيًا بلا مفاتيح (الاختبارات/التطوير دون اتصال).
- **الملكية**: الحفظ بجلسة حقيقية يدّعي صف الصفحة (`owner_id = auth.uid()`)، والقراءة عند الإقلاع تبحث عن صفّ المستخدم المملوك أولًا.
- **النموذج الهجين للسياسات** (ترحيل 0003): القراءة عامة؛ الصفوف غير المُدّعاة (`owner_id is null`) مفتوحة الكتابة (ديمو الزوار)؛ الصف المُدّعى لا يكتبه إلا صاحبه — تحقق ميدانيًا: كتابة مجهولة على صف مملوك = صفر صفوف.

## حدود المرحلة الحالية (مقصودة)

- صفّ الديمو الحي غير مُدّعى عمدًا ليبقى ملعبًا مفتوحًا للزوار؛ أول تعديل من حساب مسجّل يدّعيه لصاحبه.
- المزامنة تشمل الصفحة التعريفية فقط؛ بقية المخازن تتحول store-by-store بنفس النمط (جدول لكل مورد + سياسات ملكية).
- مفتاح `anon/publishable` علني بطبيعته — الحماية مسؤولية سياسات RLS لا سريّة المفتاح.
