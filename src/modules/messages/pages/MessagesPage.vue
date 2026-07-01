<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'

interface Message { from: 'me' | 'them', text: string, time: string }
interface Conversation {
  id: number
  name: string
  role: string
  lastMessage: string
  time: string
  unread: number
  messages: Message[]
}

const conversations = ref<Conversation[]>([
  {
    id: 1,
    name: 'شركة تقنية المستقبل',
    role: 'جهة توظيف',
    lastMessage: 'نودّ دعوتك لمقابلة يوم الأحد',
    time: '10:30',
    unread: 2,
    messages: [
      { from: 'them', text: 'مرحباً أحمد، شكراً لتقديمك على فرصة مطوّر واجهات.', time: '10:15' },
      { from: 'them', text: 'ملفك مميز ونسبة تطابقك عالية.', time: '10:16' },
      { from: 'me', text: 'شكراً جزيلاً! سعيد باهتمامكم.', time: '10:20' },
      { from: 'them', text: 'نودّ دعوتك لمقابلة يوم الأحد', time: '10:30' },
    ],
  },
  {
    id: 2,
    name: 'مجموعة الابتكار',
    role: 'جهة توظيف',
    lastMessage: 'هل يمكنك مشاركة نماذج من أعمالك؟',
    time: 'أمس',
    unread: 0,
    messages: [
      { from: 'them', text: 'هل يمكنك مشاركة نماذج من أعمالك؟', time: 'أمس' },
    ],
  },
])

const activeId = ref(conversations.value[0].id)
const draft = ref('')
const threadRef = ref<HTMLElement | null>(null)

const active = computed(() => conversations.value.find(c => c.id === activeId.value)!)

async function scrollBottom() {
  await nextTick()
  if (threadRef.value)
    threadRef.value.scrollTop = threadRef.value.scrollHeight
}

function selectConversation(id: number) {
  activeId.value = id
  const conv = conversations.value.find(c => c.id === id)
  if (conv)
    conv.unread = 0
  scrollBottom()
}

async function sendMessage() {
  const text = draft.value.trim()
  if (!text)
    return
  active.value.messages.push({ from: 'me', text, time: 'الآن' })
  active.value.lastMessage = text
  draft.value = ''
  await scrollBottom()
}
</script>

<template>
  <div>
    <h1 class="text-h5 font-weight-bold mb-4">الرسائل</h1>
    <VCard class="d-flex overflow-hidden" style="height: calc(100vh - 180px)">
      <!-- Conversation list -->
      <div class="border-e" style="width: 300px; min-width: 300px" :class="{ 'd-none d-md-block': true }">
        <VList class="py-0">
          <template v-for="(conv, i) in conversations" :key="conv.id">
            <VListItem :active="conv.id === activeId" color="primary" @click="selectConversation(conv.id)">
              <template #prepend>
                <VAvatar color="secondary"><span class="text-white">{{ conv.name.charAt(0) }}</span></VAvatar>
              </template>
              <VListItemTitle class="font-weight-bold">{{ conv.name }}</VListItemTitle>
              <VListItemSubtitle>{{ conv.lastMessage }}</VListItemSubtitle>
              <template #append>
                <div class="text-caption text-medium-emphasis">{{ conv.time }}</div>
                <VBadge v-if="conv.unread" :content="conv.unread" color="accent" inline />
              </template>
            </VListItem>
            <VDivider v-if="i < conversations.length - 1" />
          </template>
        </VList>
      </div>

      <!-- Thread -->
      <div class="flex-grow-1 d-flex flex-column">
        <div class="d-flex align-center ga-3 pa-4 border-b">
          <VAvatar color="secondary"><span class="text-white">{{ active.name.charAt(0) }}</span></VAvatar>
          <div>
            <div class="text-subtitle-1 font-weight-bold">{{ active.name }}</div>
            <div class="text-caption text-medium-emphasis">{{ active.role }}</div>
          </div>
        </div>

        <div ref="threadRef" class="flex-grow-1 overflow-y-auto pa-4 bg-background">
          <div v-for="(m, i) in active.messages" :key="i" class="d-flex mb-2" :class="m.from === 'me' ? 'justify-end' : 'justify-start'">
            <div
              class="pa-3 rounded-lg text-body-2"
              :class="m.from === 'me' ? 'bg-primary text-white' : 'bg-surface'"
              style="max-width: 70%"
            >
              {{ m.text }}
              <div class="text-caption opacity-70 mt-1">{{ m.time }}</div>
            </div>
          </div>
        </div>

        <div class="pa-3 border-t">
          <VTextField
            v-model="draft"
            placeholder="اكتب رسالة..."
            hide-details
            density="comfortable"
            append-inner-icon="mdi-send"
            @click:append-inner="sendMessage"
            @keyup.enter="sendMessage"
          />
        </div>
      </div>
    </VCard>
  </div>
</template>
