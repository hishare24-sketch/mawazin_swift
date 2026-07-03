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
