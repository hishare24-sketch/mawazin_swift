import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import type { Ref, WatchSource } from 'vue'
import { nextTick, ref, watch } from 'vue'
import { debounce, getSupabase } from '@/services/supabase'
import { USE_REAL_API, api } from '@/services/api'
import { useAuthStore } from '@/stores/AuthStore'

/**
 * ===== محرك المزامنة السحابية (Cloud Sync Engine) =====
 *
 * الفكرة: كل مخزن Pinia في المنصة يحفظ حالته محليًا (localStorage) — هذا المحرك
 * يضيف طبقة مزامنة سحابية (Supabase) فوقها **دون تغيير أي واجهة مخزن**.
 *
 * النمط المعماري: «مزامنة مستند» (Document Sync) — حالة المخزن كاملة تُحفظ
 * كمستند jsonb واحد لكل (مستخدم × مخزن). قرارٌ واعٍ لهذه المرحلة:
 *   + يوصّل أي مخزن بثلاثة أسطر دون مخطط علائقي لكل مورد.
 *   + المخازن أصلًا «حالة-وثيقة» (تُقرأ وتُكتب كاملة من localStorage).
 *   - لا استعلامات جزئية ولا تعارض كتّاب متعددين — يُقبل الآن، ومسار الخروج
 *     موثّق في DOC/CLOUD_SYNC.md (التحويل التدريجي لجداول علائقية عند الحاجة).
 *
 * الوضعان:
 *   syncPrivateDoc        — بيانات خاصة (محفظة، باقة، رسائل...): جدول account_states،
 *                           لا تُزامَن إطلاقًا دون جلسة حقيقية (خصوصية أولًا)،
 *                           وسياسات RLS تقصر كل صف على صاحبه.
 *   syncPublicProfileDoc  — الصفحة التعريفية العامة: جدول public_profiles بمفتاح slug،
 *                           القراءة عامة، والحفظ بجلسة حقيقية «يدّعي» الصف (owner_id).
 *
 * دورة الحياة المشتركة:
 *   الإقلاع: جلب النسخة السحابية → apply() (بنفس مطبِّع localStorage في المخزن).
 *   التعديل: watch(source) → upsert مؤجل (debounce) يجمع التعديلات المتلاحقة.
 *   الارتداد: علم داخلي يمنع إعادة رفع ما وصل من السحابة للتو.
 *   البثّ اللحظي: اشتراك postgres_changes — تغيير من جهاز آخر يصل ويُطبَّق فورًا
 *                (حارس الصدى يتجاهل بثّ كتابتنا نحن عبر مطابقة اللقطة نصّيًا).
 *   تغيّر الجلسة: دخول → إعادة جلب + إعادة اشتراك؛ خروج → إيقاف مزامنة الخاص.
 *
 * الاختبارات: `client` قابل للحقن — انظر cloudSync.test.ts (عميل زائف بلا شبكة).
 */

/** حالة المزامنة المعروضة للواجهات */
export type SyncStatus = 'off' | 'saving' | 'synced' | 'error'

/** العقد الذي يقدمه المخزن للمحرك — مستقل تمامًا عن شكل حالته الداخلية */
export interface CloudDocContract {
  /** لقطة الحالة الحالية للرفع (يُنسخ تسلسليًا داخل المحرك — أعد المرجع مباشرة) */
  snapshot: () => unknown
  /** دمج نسخة سحابية واردة — استخدم نفس مطبِّع localStorage في المخزن */
  apply: (incoming: unknown) => void
  /** ما يراقبه المحرك لالتقاط التعديلات (ref أو مصفوفة refs — تُراقب بعمق) */
  source: WatchSource<unknown> | object | (WatchSource<unknown> | object)[]
  /** مهلة تجميع الكتابات بالمللي ثانية (افتراضي 1200) */
  debounceMs?: number
  /** حقن عميل بديل للاختبار — undefined = عميل البيئة، null = تعطيل صريح */
  client?: SupabaseClient | null
}

export interface PrivateDocOptions extends CloudDocContract {
  /** معرّف المخزن — مفتاح الصف في account_states (مثل: 'wallet', 'accountPlan') */
  store: string
}

export interface PublicProfileDocOptions extends CloudDocContract {
  /** معرّف الصفحة الحالي — دالة لأن المستخدم قد يغيّره */
  slug: () => string
}

/** إعداد داخلي يوحّد الوضعين — الاختلاف محصور في الجلب وبناء الحمولة */
interface EngineConfig extends CloudDocContract {
  table: string
  /** يجلب صف المستند (null = لا صف بعد، 'error' = فشل) */
  fetchRow: (client: SupabaseClient, uid: string | null) => Promise<{ data: unknown } | null | 'error'>
  /** يبني حمولة upsert (null = تخطَّ هذا الرفع — مثل الخاص بلا جلسة) */
  buildPayload: (uid: string | null, data: unknown) => Record<string, unknown> | null
  /** أعمدة تعارض upsert إن خالفت المفتاح الأساسي الافتراضي */
  conflictKeys?: string
  /** true = المستند لا يُزامَن إطلاقًا دون جلسة (البيانات الخاصة) */
  requiresSession?: boolean
  /** اشتراك Realtime — غيابه (أو فلتر null) يعطّل البثّ اللحظي لهذا المستند */
  realtime?: {
    /** معرّف فريد للقناة لكل مستند — إذ تتشارك المخازن الخاصة الجدول والفلتر نفسيهما */
    channelId: () => string
    /** فلتر postgres_changes على عمود واحد (null = لا اشتراك) */
    filter: (uid: string | null) => string | null
    /** مطابقة إضافية للصف الوارد (مثل: store الصحيح، إذ الفلتر على owner_id فقط) */
    match?: (row: Record<string, unknown>, uid: string | null) => boolean
  }
}

/** معرّف الجلسة الحقيقية إن وُجدت */
async function sessionUid(client: SupabaseClient): Promise<string | null> {
  const { data } = await client.auth.getSession()
  return data.session?.user?.id ?? null
}

function createDocSync(config: EngineConfig): { status: Ref<SyncStatus> } {
  const status = ref<SyncStatus>('off')
  // مكدّس الفريق (NestJS) هو الباك-إند عند تفعيل المفتاح — تُعطَّل مزامنة Supabase
  // كليًّا (تُنزع في المرحلة 4). الحقن الصريح للاختبار يتجاوز البوابة.
  if (USE_REAL_API && config.client === undefined)
    return { status }
  const client = config.client !== undefined ? config.client : getSupabase()
  if (!client)
    return { status }

  /** يمنع ارتداد النسخة السحابية المطبَّقة للتو كرفع جديد */
  let applyingRemote = false
  /** قناة البثّ اللحظي الحالية (تُعاد بناؤها عند تغيّر الجلسة) */
  let channel: RealtimeChannel | null = null

  /** لقطة الحالة نصّيًا — أداة حارس الصدى في البثّ */
  const snapshotJson = () => JSON.stringify(config.snapshot())

  async function boot() {
    status.value = 'saving'
    const uid = await sessionUid(client!)
    if (config.requiresSession && !uid) {
      status.value = 'off' // خاص بلا جلسة: الحالة محلية فقط — بوضوح
      return
    }
    const row = await config.fetchRow(client!, uid)
    if (row === 'error') {
      status.value = 'error'
      return
    }
    if (row?.data) {
      applyingRemote = true
      config.apply(row.data)
    }
    status.value = 'synced'
    subscribeRealtime(uid)
  }

  /** يشترك في بثّ تغييرات صفّ هذا المستند — تغيير جهاز آخر يُطبَّق فورًا */
  function subscribeRealtime(uid: string | null) {
    if (!config.realtime)
      return
    if (channel) {
      client!.removeChannel(channel)
      channel = null
    }
    const filter = config.realtime.filter(uid)
    if (!filter)
      return
    // اسم فريد لكل مستند: المخازن الخاصة تشترك في الجدول والفلتر، والاسم المكرّر
    // يجعل supabase-js يعيد القناة نفسها فيرفض إضافة معالج بعد subscribe().
    channel = client!
      .channel(`sync:${config.table}:${config.realtime.channelId()}`)
      .on(
        'postgres_changes' as 'system',
        { event: '*', schema: 'public', table: config.table, filter } as never,
        (payload: { new?: Record<string, unknown> }) => {
          const row = payload.new
          if (!row || (config.realtime!.match && !config.realtime!.match(row, uid)))
            return
          const incoming = row.data
          // حارس الصدى: تجاهل ما يطابق حالتنا (بثّ كتابتنا نحن أو تغيير بلا أثر)
          if (JSON.stringify(incoming) === snapshotJson())
            return
          applyingRemote = true
          config.apply(incoming)
          status.value = 'synced'
        },
      )
      .subscribe()
  }

  const push = debounce(async () => {
    const uid = await sessionUid(client!)
    // نسخ تسلسلي: يفك بروكسيات Vue ويضمن jsonb نظيفًا
    const data = JSON.parse(JSON.stringify(config.snapshot()))
    const payload = config.buildPayload(uid, data)
    if (!payload) {
      // لا رفع (خاص بلا جلسة) — الحالة محفوظة محليًا فقط
      status.value = 'off'
      return
    }
    const { error } = await client!
      .from(config.table)
      .upsert(payload, config.conflictKeys ? { onConflict: config.conflictKeys } : undefined)
    status.value = error ? 'error' : 'synced'
  }, config.debounceMs ?? 1200)

  watch(config.source as WatchSource<unknown>, () => {
    if (applyingRemote) {
      applyingRemote = false
      return
    }
    status.value = 'saving'
    push()
  }, { deep: true })

  // تفاعل الجلسة: الدخول يعيد الجلب والاشتراك، والخروج يوقف مزامنة الخاص وبثّه
  client.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN') {
      boot()
    }
    else if (event === 'SIGNED_OUT') {
      if (channel) {
        client!.removeChannel(channel)
        channel = null
      }
      status.value = 'off'
    }
  })

  boot()
  return { status }
}

/**
 * المخازن الخاصة (blob) التي تُحفظ في NestJS account-states عند تفعيل المفتاح.
 * تتوسّع القائمة مخزنًا بمخزن؛ ما ليس فيها يبقى محليًّا (وSupabase مُعطَّل في الوضع الحقيقي).
 * المخازن ذات المورد المخصّص (profile/wallet/…) تُوصَل عبر نداءات موردها لا هنا.
 */
const NEST_PRIVATE_STORES = new Set([
  'requests', 'postedOpportunities', 'applications', // السوق
  'interviews', 'interviewerWorkspace', // المقابلات وورشة المقيّم
])

/**
 * محرّك مزامنة الكتلة الخاصة عبر NestJS (بديل Supabase عند USE_REAL_API):
 * إماهة GET /account-states/:store عند الدخول + حفظ مُمهَّل PUT خلف علَم ready.
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
 * مزامنة مستند خاص — جدول account_states بمفتاح (owner_id, store).
 * الخصوصية أولًا: بلا جلسة حقيقية لا قراءة ولا كتابة (تبقى الحالة محلية والحالة off).
 * عند تفعيل المفتاح والمخزن مُدرَج: يُوجَّه إلى NestJS بدل Supabase.
 */
export function syncPrivateDoc(opts: PrivateDocOptions): { status: Ref<SyncStatus> } {
  if (USE_REAL_API && opts.client === undefined && NEST_PRIVATE_STORES.has(opts.store))
    return createNestPrivateSync(opts.store, opts)
  return createDocSync({
    ...opts,
    table: 'account_states',
    async fetchRow(client, uid) {
      if (!uid)
        return null // بلا جلسة: لا شيء يُجلب — تبقى الحالة المحلية
      const { data, error } = await client
        .from('account_states')
        .select('data')
        .eq('owner_id', uid)
        .eq('store', opts.store)
        .maybeSingle()
      return error ? 'error' : data
    },
    buildPayload(uid, data) {
      if (!uid)
        return null // بيانات خاصة لا تُرفع بهوية مجهولة أبدًا
      return { owner_id: uid, store: opts.store, data, updated_at: new Date().toISOString() }
    },
    conflictKeys: 'owner_id,store',
    requiresSession: true,
    realtime: {
      // البثّ الخاص لا يعمل إلا بجلسة؛ الفلتر على owner_id، والمطابقة تحصر store
      channelId: () => opts.store, // فريد لكل مخزن خاص
      filter: uid => (uid ? `owner_id=eq.${uid}` : null),
      match: row => row.store === opts.store,
    },
  })
}

/**
 * مزامنة الصفحة التعريفية العامة — جدول public_profiles بمفتاح slug.
 * الجلب يفضّل صف المستخدم المملوك، والحفظ بجلسة حقيقية يدّعي الصف لصاحبه.
 */
export function syncPublicProfileDoc(opts: PublicProfileDocOptions): { status: Ref<SyncStatus> } {
  return createDocSync({
    ...opts,
    table: 'public_profiles',
    async fetchRow(client, uid) {
      if (uid) {
        const { data } = await client
          .from('public_profiles')
          .select('data')
          .eq('owner_id', uid)
          .maybeSingle()
        if (data)
          return data
      }
      const { data, error } = await client
        .from('public_profiles')
        .select('data')
        .eq('slug', opts.slug())
        .maybeSingle()
      return error ? 'error' : data
    },
    buildPayload(uid, data) {
      const payload: Record<string, unknown> = { slug: opts.slug(), data, updated_at: new Date().toISOString() }
      if (uid)
        payload.owner_id = uid // الادّعاء: الصف يصبح ملك صاحب الجلسة
      return payload
    },
    realtime: {
      // الصفحة عامة — البثّ بالـslug يعمل حتى للزوار (القراءة عامة)
      channelId: () => `profile:${opts.slug()}`,
      filter: () => `slug=eq.${opts.slug()}`,
    },
  })
}
