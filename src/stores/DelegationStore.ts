import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { User, UserRole } from '@/interfaces/Auth'
import { ROLE_PERMISSIONS, defaultRoleEntries } from '@/services/roles'
import { useAuthStore } from '@/stores/AuthStore'
import { useNotificationsStore } from '@/stores/NotificationsStore'

// ===== إدارة الحسابات المفوَّضة =====
// الفصل المعتمد: القائمة الجانبية = قدرات هويتي الحالية كاملة،
// والشريط العلوي = «بأي حساب أعمل الآن» (شخصي أو مفوَّض).
// الحسابات المفوَّضة محاكاة في العرض؛ الحقول تطابق مخطط delegations الخلفي.

export interface DelegatedAccount {
  id: number
  name: string
  kind: 'company' | 'user'
  initial: string
  /** الدور الرئيس الذي يعمل به الحساب المفوَّض */
  role: UserRole
  /** صفة التفويض كما ستظهر في جدول delegations */
  note: string
  email: string
}

const ACCOUNTS_SEED: DelegatedAccount[] = [
  { id: 1, name: 'شركة تقنية المستقبل', kind: 'company', initial: 'ت', role: 'company', note: 'مدير توظيف مفوَّض', email: 'hr@future-tech.sa' },
  { id: 2, name: 'مكتب موازين للاستشارات', kind: 'company', initial: 'م', role: 'consultant', note: 'مشرف حساب', email: 'admin@mawazin.sa' },
]

const ORIGINAL_KEY = 'delegationOriginalUser'
const ACTIVE_KEY = 'delegationActiveId'

function loadOriginal(): User | null {
  try {
    const raw = localStorage.getItem(ORIGINAL_KEY)
    return raw ? JSON.parse(raw) : null
  }
  catch {
    return null
  }
}

export const useDelegationStore = defineStore('delegation', () => {
  const accounts = ref<DelegatedAccount[]>(ACCOUNTS_SEED.map(a => ({ ...a })))
  /** هوية المستخدم الأصلية المحفوظة أثناء التفويض */
  const originalUser = ref<User | null>(loadOriginal())
  const activeId = ref<number | null>(JSON.parse(localStorage.getItem(ACTIVE_KEY) ?? 'null'))

  // flush سنكروني: تبديل الهوية يجب أن يثبت في localStorage قبل أي إعادة تحميل فورية
  watch(originalUser, v => v ? localStorage.setItem(ORIGINAL_KEY, JSON.stringify(v)) : localStorage.removeItem(ORIGINAL_KEY), { flush: 'sync' })
  watch(activeId, v => v == null ? localStorage.removeItem(ACTIVE_KEY) : localStorage.setItem(ACTIVE_KEY, JSON.stringify(v)), { flush: 'sync' })

  const isDelegating = computed(() => activeId.value != null && !!originalUser.value)
  const activeAccount = computed(() => accounts.value.find(a => a.id === activeId.value) ?? null)

  /** الدخول لإدارة حساب مفوَّض — تُحفظ هويتك وتُستعاد بالخروج */
  function enterAccount(id: number): boolean {
    const auth = useAuthStore()
    const target = accounts.value.find(a => a.id === id)
    if (!target || !auth.authUser || isDelegating.value)
      return false
    originalUser.value = JSON.parse(JSON.stringify(auth.authUser))
    auth.setAuthUser({
      id: 9000 + target.id,
      uuid: `delegated-${target.id}`,
      name: target.name,
      email: target.email,
      role: target.role,
      roles: defaultRoleEntries(target.role),
      token: `delegated-token-${target.id}`,
      permissions: ROLE_PERMISSIONS[target.role],
      created_at: new Date().toISOString(),
    })
    activeId.value = id
    useNotificationsStore().push({
      icon: 'mdi-account-switch-outline',
      color: 'info',
      title: `دخلت حساب «${target.name}»`,
      body: `${target.note} — كل ما تفعله الآن باسم هذا الحساب. اخرج من الشريط العلوي.`,
      category: 'system',
    })
    return true
  }

  /** العودة إلى حسابي الشخصي */
  function exitDelegation(): boolean {
    const auth = useAuthStore()
    if (!isDelegating.value || !originalUser.value)
      return false
    const name = activeAccount.value?.name
    auth.setAuthUser(originalUser.value)
    originalUser.value = null
    activeId.value = null
    useNotificationsStore().push({
      icon: 'mdi-account-arrow-right-outline',
      color: 'success',
      title: 'عدت إلى حسابك الشخصي',
      body: name ? `أنهيت إدارة حساب «${name}».` : 'انتهى وضع التفويض.',
      category: 'system',
    })
    return true
  }

  return { accounts, originalUser, activeId, isDelegating, activeAccount, enterAccount, exitDelegation }
})
