import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { syncPrivateDoc } from '@/services/cloudSync'
import { type NotificationRow, USE_REAL_API, api } from '@/services/api'
import { subscribeNotifications } from '@/services/notificationsRealtime'
import { useAuthStore } from '@/stores/AuthStore'

export type NotificationCategory = 'opportunity' | 'wish' | 'endorsement' | 'message' | 'system' | 'interview'

/** لون البطاقة من الفئة (توافقًا مع البذور المحاكاة). */
const CATEGORY_COLOR: Record<string, string> = {
  opportunity: 'primary', wish: 'accent', endorsement: 'secondary', message: 'info', system: 'success', interview: 'success',
}
function mapRow(r: NotificationRow): AppNotification {
  return {
    id: r.id,
    icon: r.icon,
    color: CATEGORY_COLOR[r.category] ?? 'primary',
    title: r.title,
    body: r.body,
    time: r.at ? new Date(r.at).toLocaleString() : 'الآن',
    read: r.read,
    category: (r.category as NotificationCategory),
    actionTo: r.actionTo ?? undefined,
  }
}

export interface AppNotification {
  id: number
  icon: string
  color: string
  title: string
  body: string
  time: string
  read: boolean
  category: NotificationCategory
  /** مسار يُنفّذ الإجراء مباشرة من الإشعار (مثل فتح الفرصة للتقديم) */
  actionTo?: string
  actionLabel?: string
}

const STORAGE_KEY = 'notifications'

const seed: AppNotification[] = [
  { id: 1, icon: 'mdi-briefcase-search-outline', color: 'primary', title: 'فرصة جديدة تناسبك', body: 'فرصة "مطوّر واجهات أمامية" بنسبة تطابق 94%', time: 'قبل 10 دقائق', read: false, category: 'opportunity', actionTo: '/opportunities/1', actionLabel: 'عرض الفرصة والتقديم' },
  { id: 2, icon: 'mdi-hand-heart-outline', color: 'accent', title: 'رغبة واردة', body: 'أبدت "شركة الحلول الذكية" رغبتها في خدماتك', time: 'قبل ساعة', read: false, category: 'wish', actionTo: '/wishes', actionLabel: 'الرد على الرغبة' },
  { id: 3, icon: 'mdi-account-star-outline', color: 'secondary', title: 'توصية جديدة', body: 'أضاف أحمد المنصور توصية لملفك', time: 'قبل 3 ساعات', read: false, category: 'endorsement', actionTo: '/profile', actionLabel: 'عرض ملفي' },
  { id: 4, icon: 'mdi-message-text-outline', color: 'info', title: 'رسالة جديدة', body: 'راسلتك "شركة تقنية المستقبل" بخصوص طلبك', time: 'أمس', read: true, category: 'message', actionTo: '/messages', actionLabel: 'فتح المحادثة' },
  { id: 5, icon: 'mdi-robot-happy-outline', color: 'success', title: 'تحديث من المساعد', body: 'أكملت 80% من ملفك — أضف توصية لرفع فرصك', time: 'قبل يومين', read: true, category: 'system' },
  { id: 6, icon: 'mdi-calendar-check-outline', color: 'success', title: 'دعوة مقابلة', body: 'دعتك "شركة تقنية المستقبل" لمقابلة يوم الأحد 10 صباحاً', time: 'قبل يومين', read: false, category: 'message', actionTo: '/interviews', actionLabel: 'تأكيد الموعد' },
  { id: 7, icon: 'mdi-clipboard-check-outline', color: 'warning', title: 'اختبار مقترح', body: 'أكمل اختبار "Vue.js المتقدم" لرفع نسبة تطابقك', time: 'قبل 3 أيام', read: true, category: 'system', actionTo: '/assessments', actionLabel: 'بدء الاختبار' },
]

function load(): AppNotification[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw)
    return seed.map(n => ({ ...n }))
  try {
    const stored = JSON.parse(raw) as AppNotification[]
    // ترحيل الجلسات القديمة: إشعارات ما قبل ميزة «الإجراء المباشر» تكتسبها من الـ seed المطابق
    return stored.map((n) => {
      const s = seed.find(x => x.id === n.id)
      return s && !n.actionTo ? { ...n, actionTo: s.actionTo, actionLabel: s.actionLabel } : n
    })
  }
  catch {
    return seed.map(n => ({ ...n }))
  }
}

export const useNotificationsStore = defineStore('notifications', () => {
  const notifications = ref<AppNotification[]>(load())

  watch(notifications, val => localStorage.setItem(STORAGE_KEY, JSON.stringify(val)), { deep: true })

  // مزامنة سحابية خاصة — بجلسة حقيقية فقط (DOC/CLOUD_SYNC.md)
  const { status: syncStatus } = syncPrivateDoc({
    store: 'notifications',
    snapshot: () => notifications.value,
    apply: (incoming) => {
      if (Array.isArray(incoming))
        notifications.value = incoming as AppNotification[]
    },
    source: notifications,
  })

  const unreadCount = computed(() => notifications.value.filter(n => !n.read).length)

  let nextId = 1000
  function push(n: Omit<AppNotification, 'id' | 'read' | 'time'> & { time?: string }) {
    notifications.value.unshift({
      id: nextId++,
      read: false,
      time: n.time ?? 'الآن',
      icon: n.icon,
      color: n.color,
      title: n.title,
      body: n.body,
      category: n.category,
      actionTo: n.actionTo,
      actionLabel: n.actionLabel,
    })
  }

  function markAllRead() {
    notifications.value.forEach(n => (n.read = true))
    if (USE_REAL_API)
      api.messaging.readAll().catch(() => {})
  }
  function toggleRead(id: number) {
    const n = notifications.value.find(x => x.id === id)
    if (n)
      n.read = !n.read
  }
  function markRead(id: number) {
    const n = notifications.value.find(x => x.id === id)
    if (n && !n.read) {
      n.read = true
      if (USE_REAL_API)
        api.messaging.readNotification(id).catch(() => {})
    }
  }

  // ——— الوضع الحقيقيّ: تحميل من الخادم + بثّ لحظيّ عبر Reverb ———
  async function hydrate() {
    if (!USE_REAL_API)
      return
    try { notifications.value = (await api.messaging.notifications()).map(mapRow) }
    catch { /* يبقى المحليّ */ }
  }
  let detachRealtime: (() => void) | null = null
  function startRealtime() {
    if (!USE_REAL_API || detachRealtime)
      return
    const uuid = useAuthStore().authUser?.uuid
    if (!uuid)
      return
    detachRealtime = subscribeNotifications(uuid, (row) => {
      if (!notifications.value.some(n => n.id === row.id))
        notifications.value.unshift(mapRow(row))
    })
  }
  function stopRealtime() {
    detachRealtime?.()
    detachRealtime = null
  }

  return { notifications, syncStatus, unreadCount, push, markAllRead, toggleRead, markRead, hydrate, startRealtime, stopRealtime }
})
