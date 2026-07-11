import type { Ref, WatchSource } from 'vue'
import { nextTick, ref, watch } from 'vue'
import { USE_REAL_API, api } from '@/services/api'
import { useAuthStore } from '@/stores/AuthStore'

/**
 * ===== محرك المزامنة السحابية (Cloud Sync Engine) — NestJS =====
 *
 * كل مخزن Pinia يحفظ حالته محليًا (localStorage)؛ هذا المحرك يضيف طبقة مزامنة
 * سحابية فوقها **دون تغيير أي واجهة مخزن**. المستندات الخاصة (blob) تُحفظ في
 * NestJS عبر `GET/PUT /account-states/:store`.
 *
 * (سابقًا كان الباك-إند Supabase؛ نُزع في المرحلة 4 — التسليم اللحظي للرسائل
 * انتقل لبوّابة Socket.IO في directMessages.ts، والصفحة العامة لموردها المخصّص.)
 */

/** حالة المزامنة المعروضة للواجهات */
export type SyncStatus = 'off' | 'saving' | 'synced' | 'error'

/** العقد الذي يقدمه المخزن للمحرك — مستقل تمامًا عن شكل حالته الداخلية */
export interface CloudDocContract {
  /** لقطة الحالة الحالية للرفع */
  snapshot: () => unknown
  /** دمج نسخة سحابية واردة — استخدم نفس مطبِّع localStorage في المخزن */
  apply: (incoming: unknown) => void
  /** ما يراقبه المحرك لالتقاط التعديلات (ref أو مصفوفة refs — تُراقب بعمق) */
  source: WatchSource<unknown> | object | (WatchSource<unknown> | object)[]
  /** مهلة تجميع الكتابات بالمللي ثانية (افتراضي 1200) */
  debounceMs?: number
}

export interface PrivateDocOptions extends CloudDocContract {
  /** معرّف المخزن — مفتاح الصف في account_states (مثل: 'wallet', 'requests') */
  store: string
}

export interface PublicProfileDocOptions extends CloudDocContract {
  /** معرّف الصفحة الحالي — دالة لأن المستخدم قد يغيّره */
  slug: () => string
}

/**
 * المخازن الخاصة (blob) التي تُحفظ في NestJS account-states عند تفعيل المفتاح.
 * تتوسّع القائمة مخزنًا بمخزن؛ ما ليس فيها يبقى محليًّا (localStorage فقط).
 * المخازن ذات المورد المخصّص (profile/publicProfile) تُوصَل عبر موردها لا هنا.
 */
const NEST_PRIVATE_STORES = new Set([
  'requests', 'postedOpportunities', 'applications', // السوق
  'interviews', 'interviewerWorkspace', // المقابلات وورشة المقيّم
  'surveys', // الاستبيانات (الإشعارات نُقلت لمصدرها الخادميّ /v1/notifications + بثّ Reverb — لا تُزامَن ككتلة account-states)
  'wallet', 'accountPlan', // المحفظة وباقة الحساب (سِجِلّ العميل يبقى؛ الدفع الخادمي الذرّي مؤجّل لطور المدفوعات الحقيقية)
  // بقية المخازن الخاصة (blob) — نفس الآلية العامة:
  'messages', 'wishes', 'saved', 'reviews', 'gamification', 'candidates',
  'roleProfiles', 'resumes', 'searchPrefs', 'expertRoles', 'peerRequests',
  'roleRequests', 'endorser', 'interviewerBrand',
  'persona', // شخصيّة الحساب: seekerPersona/orgType + القطاعات المهتمّ بها (onboarding)
  'accountPrefs', // تفضيلات الإعدادات: الإشعارات + الخصوصية + حجم الخط
])

/**
 * محرّك مزامنة الكتلة الخاصة عبر NestJS: إماهة GET /account-states/:store عند
 * الدخول + حفظ مُمهَّل PUT خلف علَم ready. `apply` يبقى مطبِّع localStorage نفسه.
 */
function createNestPrivateSync(store: string, opts: CloudDocContract): { status: Ref<SyncStatus> } {
  const status = ref<SyncStatus>('off')
  if (!useAuthStore().isAuthUser)
    return { status } // بلا جلسة: الحالة محلية فقط
  let ready = false
  let timer: ReturnType<typeof setTimeout> | null = null

  async function boot() {
    status.value = 'saving'
    try {
      const data = await api.accountStates.get<unknown>(store)
      if (data != null)
        opts.apply(data)
      status.value = 'synced'
    }
    catch {
      status.value = 'error'
    }
    // ننتظر تفريغ مراقبة الإماهة (ready=false) ثم نسمح بالدفع
    await nextTick()
    ready = true
  }

  function push() {
    if (timer)
      clearTimeout(timer)
    timer = setTimeout(() => {
      const data = JSON.parse(JSON.stringify(opts.snapshot()))
      api.accountStates.put(store, data).then(() => { status.value = 'synced' }).catch(() => { status.value = 'error' })
    }, opts.debounceMs ?? 1200)
  }

  watch(opts.source as WatchSource<unknown>, () => {
    if (!ready)
      return
    status.value = 'saving'
    push()
  }, { deep: true })

  boot()
  return { status }
}

/**
 * مزامنة مستند خاص — يُوجَّه إلى NestJS (account-states) عند تفعيل المفتاح والمخزن
 * مُدرَج؛ وإلا محلي فقط (localStorage في المخزن — الحالة off).
 */
export function syncPrivateDoc(opts: PrivateDocOptions): { status: Ref<SyncStatus> } {
  if (USE_REAL_API && NEST_PRIVATE_STORES.has(opts.store))
    return createNestPrivateSync(opts.store, opts)
  return { status: ref<SyncStatus>('off') }
}

/**
 * مزامنة الصفحة التعريفية العامة — تُوصَل الآن عبر موردها المخصّص في المخزن
 * (`GET/PATCH /public-profiles/me` + نقاط الزوّار). لا مزامنة عامة هنا.
 */
export function syncPublicProfileDoc(_opts: PublicProfileDocOptions): { status: Ref<SyncStatus> } {
  return { status: ref<SyncStatus>('off') }
}
