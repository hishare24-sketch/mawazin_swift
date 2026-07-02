import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useGamificationStore } from '@/stores/GamificationStore'
import { useNotificationsStore } from '@/stores/NotificationsStore'

// ===== المحفظة المالية — رصيد قابل للسحب + معلق + وسائل دفع + سجل عمليات =====
// الحقول تحاكي مخطط wallet_transactions / payment_methods الخلفي المرتقب.

export type TxnType = 'deposit' | 'withdrawal' | 'earning' | 'points_conversion' | 'fee' | 'refund'
export type TxnStatus = 'completed' | 'pending' | 'failed'

export interface WalletTxn {
  id: number
  type: TxnType
  /** موجب = دخل، سالب = خصم */
  amount: number
  status: TxnStatus
  title: string
  at: string // ISO date
  methodLabel?: string
}

export type MethodKind = 'bank' | 'card'

export interface PaymentMethod {
  id: number
  kind: MethodKind
  label: string // اسم البنك / نوع البطاقة
  masked: string // IBAN مقنّع أو آخر 4 أرقام
  holder: string
  isDefault: boolean
}

export const TXN_META: Record<TxnType, { label: string, icon: string, color: string }> = {
  deposit: { label: 'شحن رصيد', icon: 'mdi-arrow-down-bold-circle-outline', color: 'success' },
  withdrawal: { label: 'سحب', icon: 'mdi-arrow-up-bold-circle-outline', color: 'error' },
  earning: { label: 'أرباح', icon: 'mdi-cash-plus', color: 'primary' },
  points_conversion: { label: 'تحويل نقاط', icon: 'mdi-swap-horizontal-circle-outline', color: 'accent' },
  fee: { label: 'رسوم/عمولة', icon: 'mdi-percent-outline', color: 'warning' },
  refund: { label: 'استرداد', icon: 'mdi-cash-refund', color: 'info' },
}

export const STATUS_META: Record<TxnStatus, { label: string, color: string }> = {
  completed: { label: 'مكتملة', color: 'success' },
  pending: { label: 'معلّقة', color: 'warning' },
  failed: { label: 'فاشلة', color: 'error' },
}

/** سعر تحويل النقاط: كل 10 نقاط = 1 ر.س */
export const POINTS_PER_RIYAL = 10
/** رسوم السحب الثابتة (شفافية أمام المستخدم) */
export const WITHDRAW_FEE_PCT = 2

const TXNS_KEY = 'walletTxns'
const METHODS_KEY = 'walletMethods'

const txnSeed: WalletTxn[] = [
  { id: 1, type: 'deposit', amount: 500, status: 'completed', title: 'شحن رصيد المحفظة', at: '2026-06-02', methodLabel: 'مدى •• 4832' },
  { id: 2, type: 'fee', amount: -45, status: 'completed', title: 'رسوم حجز مقابلة تقييم مهارات', at: '2026-06-05' },
  { id: 3, type: 'earning', amount: 180, status: 'completed', title: 'أرباح جلسة تقييم — سارة الزهراني', at: '2026-06-08' },
  { id: 4, type: 'withdrawal', amount: -300, status: 'completed', title: 'سحب إلى الحساب البنكي', at: '2026-06-10', methodLabel: 'الراجحي •• 6614' },
  { id: 5, type: 'earning', amount: 220, status: 'completed', title: 'أرباح جلسة تقييم — محمد القرني', at: '2026-06-14' },
  { id: 6, type: 'points_conversion', amount: 15, status: 'completed', title: 'تحويل 150 نقطة إلى رصيد', at: '2026-06-16' },
  { id: 7, type: 'deposit', amount: 250, status: 'completed', title: 'شحن رصيد المحفظة', at: '2026-06-19', methodLabel: 'فيزا •• 1290' },
  { id: 8, type: 'refund', amount: 45, status: 'completed', title: 'استرداد رسوم مقابلة ملغاة', at: '2026-06-22' },
  { id: 9, type: 'fee', amount: -80, status: 'completed', title: 'عمولة منصة — جلسة تقييم', at: '2026-06-24' },
  { id: 10, type: 'earning', amount: 280, status: 'pending', title: 'أرباح جلسة تقييم شامل — قيد التسوية', at: '2026-06-28' },
  { id: 11, type: 'withdrawal', amount: -150, status: 'pending', title: 'طلب سحب قيد المعالجة', at: '2026-06-30', methodLabel: 'الراجحي •• 6614' },
]

const methodSeed: PaymentMethod[] = [
  { id: 1, kind: 'bank', label: 'مصرف الراجحي', masked: 'SA •••• •••• •••• 6614', holder: 'المستخدم الحالي', isDefault: true },
  { id: 2, kind: 'card', label: 'بطاقة مدى', masked: '•••• 4832', holder: 'المستخدم الحالي', isDefault: false },
]

function loadList<T>(key: string, seed: T[]): T[] {
  const raw = localStorage.getItem(key)
  if (!raw)
    return seed.map(x => ({ ...x }))
  try {
    return JSON.parse(raw) as T[]
  }
  catch {
    return seed.map(x => ({ ...x }))
  }
}

let nextTxnId = 1000
let nextMethodId = 100

export const useWalletStore = defineStore('wallet', () => {
  const txns = ref<WalletTxn[]>(loadList(TXNS_KEY, txnSeed))
  const methods = ref<PaymentMethod[]>(loadList(METHODS_KEY, methodSeed))

  watch(txns, v => localStorage.setItem(TXNS_KEY, JSON.stringify(v)), { deep: true })
  watch(methods, v => localStorage.setItem(METHODS_KEY, JSON.stringify(v)), { deep: true })

  // ===== الأرصدة =====
  /** الرصيد القابل للسحب = صافي العمليات المكتملة */
  const available = computed(() =>
    txns.value.filter(t => t.status === 'completed').reduce((s, t) => s + t.amount, 0),
  )
  /** الرصيد المعلق = أرباح قيد التسوية (موجبة فقط؛ السحوبات المعلقة محجوزة أصلًا) */
  const pending = computed(() =>
    txns.value.filter(t => t.status === 'pending' && t.amount > 0).reduce((s, t) => s + t.amount, 0),
  )
  /** سحوبات قيد المعالجة (قيمة مطلقة) */
  const processingWithdrawals = computed(() =>
    Math.abs(txns.value.filter(t => t.status === 'pending' && t.amount < 0).reduce((s, t) => s + t.amount, 0)),
  )

  const totalIn = computed(() => txns.value.filter(t => t.status === 'completed' && t.amount > 0).reduce((s, t) => s + t.amount, 0))
  const totalOut = computed(() => Math.abs(txns.value.filter(t => t.status === 'completed' && t.amount < 0).reduce((s, t) => s + t.amount, 0)))

  const defaultMethod = computed(() => methods.value.find(m => m.isDefault) ?? methods.value[0])

  // ===== تقارير إحصائية =====
  /** صافي التدفق الشهري (آخر 4 أشهر تقويمية موجودة في السجل) */
  const monthlyFlow = computed(() => {
    const byMonth = new Map<string, { inflow: number, outflow: number }>()
    for (const t of txns.value.filter(x => x.status === 'completed')) {
      const m = t.at.slice(0, 7)
      const row = byMonth.get(m) ?? { inflow: 0, outflow: 0 }
      if (t.amount > 0)
        row.inflow += t.amount
      else row.outflow += Math.abs(t.amount)
      byMonth.set(m, row)
    }
    return [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-4)
      .map(([month, v]) => ({ month, ...v }))
  })

  /** توزيع الدخل/المصروف حسب النوع (للرسم الدائري) */
  const byType = computed(() => {
    const map = new Map<TxnType, number>()
    for (const t of txns.value.filter(x => x.status === 'completed'))
      map.set(t.type, (map.get(t.type) ?? 0) + Math.abs(t.amount))
    const total = Math.max(1, [...map.values()].reduce((s, n) => s + n, 0))
    return [...map.entries()].map(([type, amount]) => ({ type, amount, pct: Math.round((amount / total) * 100) }))
      .sort((a, b) => b.amount - a.amount)
  })

  /** مسار الرصيد التراكمي عبر العمليات المكتملة (للرسم الخطي) */
  const balanceSeries = computed(() => {
    let running = 0
    return txns.value
      .filter(t => t.status === 'completed')
      .slice()
      .sort((a, b) => a.at.localeCompare(b.at))
      .map((t) => {
        running += t.amount
        return { at: t.at.slice(5), balance: running }
      })
  })

  // ===== العمليات =====
  function pushTxn(t: Omit<WalletTxn, 'id' | 'at'> & { at?: string }): WalletTxn {
    const txn: WalletTxn = { ...t, id: nextTxnId++, at: t.at ?? new Date().toISOString().slice(0, 10) }
    txns.value.unshift(txn)
    return txn
  }

  /** شحن فوري (محاكاة بوابة دفع) */
  function deposit(amount: number, methodId?: number): boolean {
    if (amount <= 0)
      return false
    const m = methods.value.find(x => x.id === methodId) ?? defaultMethod.value
    pushTxn({ type: 'deposit', amount, status: 'completed', title: 'شحن رصيد المحفظة', methodLabel: m ? `${m.label} ${m.masked.slice(-7)}` : undefined })
    useNotificationsStore().push({
      icon: 'mdi-wallet-plus-outline', color: 'success', title: 'تم شحن محفظتك',
      body: `+${amount} ر.س — الرصيد الآن ${available.value} ر.س`, category: 'system',
    })
    return true
  }

  /** سحب: يُحجز فورًا كعملية معلقة، ثم تُحاكى تسوية البنك */
  function withdraw(amount: number, methodId?: number): boolean {
    if (amount <= 0 || amount > available.value)
      return false
    const m = methods.value.find(x => x.id === methodId) ?? defaultMethod.value
    if (!m)
      return false
    const fee = Math.ceil((amount * WITHDRAW_FEE_PCT) / 100)
    const txn = pushTxn({ type: 'withdrawal', amount: -amount, status: 'pending', title: 'طلب سحب قيد المعالجة', methodLabel: `${m.label} ${m.masked.slice(-7)}` })
    if (fee > 0)
      pushTxn({ type: 'fee', amount: -fee, status: 'completed', title: `رسوم سحب (${WITHDRAW_FEE_PCT}%)` })
    // محاكاة تسوية البنك
    setTimeout(() => {
      const t = txns.value.find(x => x.id === txn.id)
      if (t && t.status === 'pending') {
        t.status = 'completed'
        t.title = 'سحب إلى ' + (m.kind === 'bank' ? 'الحساب البنكي' : 'البطاقة')
        useNotificationsStore().push({
          icon: 'mdi-bank-transfer-out', color: 'info', title: 'اكتمل تحويل السحب',
          body: `${amount} ر.س وصلت إلى ${m.label} ${m.masked.slice(-7)}`, category: 'system',
        })
      }
    }, 7000)
    return true
  }

  /** إيداع أرباح (من جلسات التقييم وغيرها) — تبدأ معلقة حتى التسوية */
  function credit(amount: number, title: string, opts: { pending?: boolean } = {}): WalletTxn {
    const txn = pushTxn({ type: 'earning', amount, status: opts.pending ? 'pending' : 'completed', title })
    if (opts.pending) {
      setTimeout(() => {
        const t = txns.value.find(x => x.id === txn.id)
        if (t && t.status === 'pending') {
          t.status = 'completed'
          useNotificationsStore().push({
            icon: 'mdi-cash-check', color: 'success', title: 'تمت تسوية أرباحك',
            body: `${amount} ر.س أصبحت قابلة للسحب — ${title}`, category: 'system',
          })
        }
      }, 9000)
    }
    return txn
  }

  /** دفع رسوم من الرصيد المتاح (اشتراكات وخدمات المنصة) */
  function pay(amount: number, title: string): boolean {
    if (amount <= 0 || amount > available.value)
      return false
    pushTxn({ type: 'fee', amount: -amount, status: 'completed', title })
    useNotificationsStore().push({
      icon: 'mdi-credit-card-check-outline', color: 'info', title: 'تم الدفع من محفظتك',
      body: `${amount} ر.س — ${title}`, category: 'system', actionTo: '/wallet', actionLabel: 'عرض المحفظة',
    })
    return true
  }

  /** تحويل النقاط المكتسبة إلى رصيد (10 نقاط = 1 ر.س) */
  function convertPoints(points: number): boolean {
    if (points < POINTS_PER_RIYAL)
      return false
    const g = useGamificationStore()
    const usable = Math.floor(points / POINTS_PER_RIYAL) * POINTS_PER_RIYAL
    if (!g.spend(usable))
      return false
    const amount = usable / POINTS_PER_RIYAL
    pushTxn({ type: 'points_conversion', amount, status: 'completed', title: `تحويل ${usable} نقطة إلى رصيد` })
    useNotificationsStore().push({
      icon: 'mdi-swap-horizontal-circle-outline', color: 'success', title: 'حُوّلت نقاطك إلى رصيد',
      body: `${usable} نقطة → ${amount} ر.س`, category: 'system',
    })
    return true
  }

  // ===== وسائل الدفع =====
  function addBank(label: string, iban: string, holder: string) {
    const masked = `SA •••• •••• •••• ${iban.replace(/\s/g, '').slice(-4)}`
    methods.value.push({ id: nextMethodId++, kind: 'bank', label, masked, holder, isDefault: methods.value.length === 0 })
  }
  function addCard(label: string, number: string, holder: string) {
    const masked = `•••• ${number.replace(/\s/g, '').slice(-4)}`
    methods.value.push({ id: nextMethodId++, kind: 'card', label, masked, holder, isDefault: methods.value.length === 0 })
  }
  function removeMethod(id: number) {
    const wasDefault = methods.value.find(m => m.id === id)?.isDefault
    methods.value = methods.value.filter(m => m.id !== id)
    if (wasDefault && methods.value.length)
      methods.value[0].isDefault = true
  }
  function setDefault(id: number) {
    for (const m of methods.value)
      m.isDefault = m.id === id
  }

  return {
    txns, methods,
    available, pending, processingWithdrawals, totalIn, totalOut, defaultMethod,
    monthlyFlow, byType, balanceSeries,
    deposit, withdraw, credit, pay, convertPoints,
    addBank, addCard, removeMethod, setDefault,
  }
})
