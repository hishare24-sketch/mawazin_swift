import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useNotificationsStore } from '@/stores/NotificationsStore'
import { useWalletStore } from '@/stores/WalletStore'

// ===== باقة الحساب الموحّدة =====
// فلسفة المنصة: لا فرق بين أنواع الحسابات ولا الأدوار — الجميع يملك كل شيء،
// والباقة وحدها تحدد التمكين والمزايا عبر كل الوحدات (الصفحة التعريفية،
// الاستبيانات، التفويض، ...). تبتلع باقتَي surveyPlan وpublicProfile.tier القديمتين.

export type AccountTier = 'free' | 'pro' | 'elite'

export const TIER_RANK: Record<AccountTier, number> = { free: 0, pro: 1, elite: 2 }

export interface TierFeature {
  label: string
  icon: string
  /** الحد الأدنى من الباقة */
  tier: AccountTier
}

export const ACCOUNT_TIER_META: Record<AccountTier, { label: string, price: number, color: string, icon: string, pitch: string }> = {
  free: { label: 'الأساسية', price: 0, color: 'surface-variant', icon: 'mdi-account-outline', pitch: 'كل الأدوار وكل الأساسيات — مجانًا للأبد' },
  pro: { label: 'الاحترافية', price: 49, color: 'primary', icon: 'mdi-briefcase-outline', pitch: 'صفحة تعريفية كاملة، 10 استبيانات نشطة، وإدارة الحسابات المفوَّضة' },
  elite: { label: 'النخبة', price: 99, color: 'accent', icon: 'mdi-crown-outline', pitch: 'كل شيء بلا حدود + التفاعل الاجتماعي الكامل على صفحتك' },
}

/** خريطة المزايا عبر الوحدات — تُعرض في صفحة الباقة وتُستهلك كبوابات */
export const TIER_FEATURES: TierFeature[] = [
  { label: 'كل الأدوار المهنية فورًا (باحث/جهة/مقيّم/مرشد/مدرب/مستشار/مُزكٍّ)', icon: 'mdi-account-convert-outline', tier: 'free' },
  { label: 'المركز الموحّد والمحفظة والتحليلات الموحّدة', icon: 'mdi-view-dashboard-variant-outline', tier: 'free' },
  { label: 'الصفحة التعريفية: القصة والمهارات والمصداقية', icon: 'mdi-card-account-details-outline', tier: 'free' },
  { label: '3 استبيانات نشطة', icon: 'mdi-poll', tier: 'free' },
  { label: 'الصفحة التعريفية: إنجازات وخبرات ومعرض أعمال وتوصيات وشارات أدوار', icon: 'mdi-rocket-launch-outline', tier: 'pro' },
  { label: 'ثيم مخصص بلونك الخاص لصفحتك التعريفية', icon: 'mdi-palette-outline', tier: 'pro' },
  { label: '10 استبيانات نشطة + الإدارة الاحترافية الكاملة', icon: 'mdi-cog-transfer-outline', tier: 'pro' },
  { label: 'إدارة الحسابات المفوَّضة (شركات وفرق)', icon: 'mdi-account-switch-outline', tier: 'pro' },
  { label: 'التفاعل الاجتماعي الكامل: متابعون وتقييم وتعليقات على صفحتك', icon: 'mdi-account-heart-outline', tier: 'elite' },
  { label: 'استبيانات بلا حدود', icon: 'mdi-infinity', tier: 'elite' },
]

/** حد الاستبيانات النشطة لكل باقة — null = بلا حد */
export const SURVEY_LIMITS: Record<AccountTier, number | null> = { free: 3, pro: 10, elite: null }

const STORAGE_KEY = 'accountPlan'

/**
 * ترحيل: يرث أعلى باقة من النظامين القديمين
 * (surveyPlan: free/pro + publicProfile.tier: free/pro/elite)
 */
function migrateInitialTier(): AccountTier {
  const stored = localStorage.getItem(STORAGE_KEY) as AccountTier | null
  if (stored && stored in TIER_RANK)
    return stored
  let best: AccountTier | null = null
  if (localStorage.getItem('surveyPlan') === 'pro')
    best = 'pro'
  try {
    const profileTier = JSON.parse(localStorage.getItem('publicProfile') ?? '{}').tier as AccountTier | undefined
    if (profileTier && TIER_RANK[profileTier] > TIER_RANK[best ?? 'free'])
      best = profileTier
  }
  catch { /* تجاهل تخزينًا تالفًا */ }
  // حساب العرض التجريبي يبدأ على «النخبة» ليختبر كل شيء (الإنتاج يبدأ free)
  return best ?? 'elite'
}

export const useAccountPlanStore = defineStore('accountPlan', () => {
  const tier = ref<AccountTier>(migrateInitialTier())
  watch(tier, v => localStorage.setItem(STORAGE_KEY, v), { flush: 'sync' })
  // ثبّت نتيجة الترحيل فورًا كي لا يُعاد اشتقاقها
  localStorage.setItem(STORAGE_KEY, tier.value)

  /** هل باقتي تبلغ هذا المستوى؟ */
  function atLeast(required: AccountTier): boolean {
    return TIER_RANK[tier.value] >= TIER_RANK[required]
  }

  const surveyLimit = computed(() => SURVEY_LIMITS[tier.value])
  const canDelegate = computed(() => atLeast('pro'))

  /** ترقية مدفوعة من المحفظة / تخفيض مجاني — نفس نمط اشتراكات المنصة */
  function setTier(next: AccountTier): boolean {
    if (next === tier.value)
      return true
    const upgrade = TIER_RANK[next] > TIER_RANK[tier.value]
    if (upgrade) {
      const paid = useWalletStore().pay(ACCOUNT_TIER_META[next].price, `اشتراك باقة الحساب «${ACCOUNT_TIER_META[next].label}»`)
      if (!paid)
        return false
    }
    tier.value = next
    useNotificationsStore().push({
      icon: ACCOUNT_TIER_META[next].icon,
      color: upgrade ? 'success' : 'info',
      title: upgrade ? `ترقّى حسابك إلى «${ACCOUNT_TIER_META[next].label}»` : `انتقل حسابك إلى «${ACCOUNT_TIER_META[next].label}»`,
      body: ACCOUNT_TIER_META[next].pitch,
      category: 'system',
      actionTo: '/plan',
      actionLabel: 'تفاصيل الباقة',
    })
    return true
  }

  return { tier, atLeast, surveyLimit, canDelegate, setTier }
})
