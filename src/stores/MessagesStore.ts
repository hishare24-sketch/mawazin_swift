import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { DirectMessageRow } from '@/services/directMessages'
import { fetchMyMessages, markThreadRead, sendDirectMessage, subscribeInbound } from '@/services/directMessages'
import { USE_REAL_API } from '@/services/api'
import { syncPrivateDoc } from '@/services/cloudSync'
import { useAuthStore } from '@/stores/AuthStore'
import { useNotificationsStore } from '@/stores/NotificationsStore'

export interface ChatLine {
  from: 'me' | 'them'
  text: string
  time: string
  /** معرّف صفّ الرسالة المباشرة (لمنع التكرار عند وصولها من قناتين) */
  mid?: string
}

export interface Conversation {
  id: number
  name: string
  initial: string
  role: string
  unread: number
  messages: ChatLine[]
  /** معرّف الطرف الآخر (Supabase uid) للمحادثات الحقيقية بين المستخدمين */
  peerId?: string
}

const STORAGE_KEY = 'conversations'

const seed: Conversation[] = [
  {
    id: 1,
    name: 'شركة تقنية المستقبل',
    initial: 'ت',
    role: 'جهة توظيف',
    unread: 2,
    messages: [
      { from: 'them', text: 'مرحباً أحمد، شكراً لتقديمك على فرصة مطوّر واجهات.', time: '10:15' },
      { from: 'them', text: 'ملفك مميز ونسبة تطابقك عالية.', time: '10:16' },
      { from: 'me', text: 'شكراً جزيلاً! سعيد باهتمامكم.', time: '10:20' },
      { from: 'them', text: 'نودّ دعوتك لمقابلة يوم الأحد الساعة 10 صباحاً، هل يناسبك؟', time: '10:30' },
    ],
  },
  {
    id: 2,
    name: 'مجموعة الابتكار الرقمي',
    initial: 'ا',
    role: 'جهة توظيف',
    unread: 1,
    messages: [
      { from: 'them', text: 'هل يمكنك مشاركة نماذج من أعمالك السابقة؟', time: 'أمس' },
    ],
  },
  {
    id: 3,
    name: 'وكالة الإبداع',
    initial: 'و',
    role: 'جهة توظيف',
    unread: 0,
    messages: [
      { from: 'me', text: 'مرحباً، أنا مهتم بالمهمة المعروضة.', time: 'قبل يومين' },
      { from: 'them', text: 'رائع! سنراجع ملفك ونعود إليك.', time: 'قبل يومين' },
    ],
  },
]

function load(): Conversation[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw)
    return seed.map(c => ({ ...c, messages: [...c.messages] }))
  try {
    return JSON.parse(raw) as Conversation[]
  }
  catch {
    return seed.map(c => ({ ...c, messages: [...c.messages] }))
  }
}

export const useMessagesStore = defineStore('messages', () => {
  const conversations = ref<Conversation[]>(load())

  watch(conversations, val => localStorage.setItem(STORAGE_KEY, JSON.stringify(val)), { deep: true })

  // مزامنة سحابية خاصة — بجلسة حقيقية فقط (DOC/CLOUD_SYNC.md)
  const { status: syncStatus } = syncPrivateDoc({
    store: 'messages',
    snapshot: () => conversations.value,
    apply: (incoming) => {
      if (Array.isArray(incoming))
        conversations.value = incoming as Conversation[]
    },
    source: conversations,
  })

  const totalUnread = computed(() => conversations.value.reduce((sum, c) => sum + c.unread, 0))

  function markRead(id: number) {
    const c = conversations.value.find(x => x.id === id)
    if (!c)
      return
    c.unread = 0
    // محادثة حقيقية: علّم الوارد مقروءًا خادميًا أيضًا
    const uid = currentUid()
    if (c.peerId && uid)
      markThreadRead(uid, c.peerId)
  }

  function send(id: number, text: string) {
    const c = conversations.value.find(x => x.id === id)
    if (!c || !text.trim())
      return
    // محادثة حقيقية بين مستخدمين → تسليم فعلي؛ وإلا سلوك المحاكاة المحلي
    if (c.peerId) {
      sendToPeer(c.peerId, c.name, text)
      return
    }
    c.messages.push({ from: 'me', text: text.trim(), time: 'الآن' })
  }

  // ===== الرسائل المباشرة الحقيقية (بين المستخدمين) =====
  let nextPeerConvId = 10_000
  function currentUid(): string | null {
    return useAuthStore().authUser?.uuid ?? null
  }

  /** يُدمج صفّ رسالة مباشرة في المحادثات (مفتاحها الطرف الآخر)، بلا تكرار */
  function ingest(row: DirectMessageRow, uid: string) {
    const outbound = row.sender_id === uid
    const peerId = outbound ? row.recipient_id : row.sender_id
    const peerName = outbound ? row.recipient_name : row.sender_name
    const mid = String(row.id)
    let conv = conversations.value.find(c => c.peerId === peerId)
    if (!conv) {
      conv = {
        id: nextPeerConvId++,
        name: peerName,
        initial: peerName.trim().charAt(0),
        role: 'مستخدم',
        unread: 0,
        messages: [],
        peerId,
      }
      conversations.value.unshift(conv)
    }
    if (conv.messages.some(m => m.mid === mid))
      return // وصلت من قناة أخرى — تجاهل
    conv.messages.push({
      from: outbound ? 'me' : 'them',
      text: row.body,
      time: row.created_at.slice(11, 16),
      mid,
    })
    if (!outbound)
      conv.unread++
  }

  /** يرسل رسالة حقيقية لمستخدم آخر ويعرضها فورًا لدى المرسِل */
  async function sendToPeer(recipientId: string, recipientName: string, body: string) {
    const auth = useAuthStore()
    const uid = auth.authUser?.uuid
    if (!uid || !body.trim())
      return
    const row = await sendDirectMessage({
      senderId: uid,
      senderName: auth.authUser?.name ?? 'مستخدم',
      recipientId,
      recipientName,
      body: body.trim(),
    })
    if (row)
      ingest(row, uid) // اعرضها للمرسِل فورًا
  }

  // —— التوصيل: جلب المحادثات الحقيقية عند الجلسة + اشتراك الوارد لحظيًا (NestJS) ——
  let detachInbound: (() => void) | null = null
  async function wireInbound() {
    if (!USE_REAL_API)
      return
    detachInbound?.()
    detachInbound = null
    const uid = currentUid()
    if (!uid)
      return
    for (const row of await fetchMyMessages())
      ingest(row, uid)
    detachInbound = subscribeInbound(uid, (row) => {
      ingest(row, uid)
      useNotificationsStore().push({
        icon: 'mdi-message-text-outline',
        color: 'info',
        title: `رسالة جديدة من ${row.sender_name}`,
        body: row.body.slice(0, 60) + (row.body.length > 60 ? '…' : ''),
        category: 'message',
        actionTo: '/messages',
        actionLabel: 'فتح المحادثة',
      })
    })
  }
  if (USE_REAL_API) {
    // إعادة التوصيل عند تغيّر الجلسة (دخول/خروج)
    watch(() => useAuthStore().authUser?.uuid, (uid) => {
      if (uid)
        wireInbound()
      else {
        detachInbound?.()
        detachInbound = null
      }
    }, { immediate: true })
  }

  /** محادثة جديدة واردة من طرف خارجي (مثل زائر الصفحة التعريفية) */
  function startConversation(name: string, role: string, firstMessage: string): Conversation {
    const c: Conversation = {
      id: Math.max(0, ...conversations.value.map(x => x.id)) + 1,
      name,
      initial: name.trim().charAt(0),
      role,
      unread: 1,
      messages: [{ from: 'them', text: firstMessage.trim(), time: 'الآن' }],
    }
    conversations.value.unshift(c)
    return c
  }

  return { conversations, syncStatus, totalUnread, markRead, send, startConversation, sendToPeer }
})
