import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

export interface ChatLine {
  from: 'me' | 'them'
  text: string
  time: string
}

export interface Conversation {
  id: number
  name: string
  initial: string
  role: string
  unread: number
  messages: ChatLine[]
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

  const totalUnread = computed(() => conversations.value.reduce((sum, c) => sum + c.unread, 0))

  function markRead(id: number) {
    const c = conversations.value.find(x => x.id === id)
    if (c)
      c.unread = 0
  }

  function send(id: number, text: string) {
    const c = conversations.value.find(x => x.id === id)
    if (c && text.trim())
      c.messages.push({ from: 'me', text: text.trim(), time: 'الآن' })
  }

  return { conversations, totalUnread, markRead, send }
})
