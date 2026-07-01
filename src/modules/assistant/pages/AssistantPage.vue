<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { ai } from '@/services/ai'
import { useTrustStore } from '@/stores/TrustStore'
import { useProfileStore } from '@/stores/ProfileStore'
import { useInterviewsStore } from '@/stores/InterviewsStore'

interface ChatMessage { from: 'user' | 'ai', text: string, card?: import('@/services/ai').UploadAnalysis }
interface Conversation { id: number, title: string, messages: ChatMessage[] }

const trustStore = useTrustStore()
const profileStore = useProfileStore()
const interviewsStore = useInterviewsStore()

const conversations = ref<Conversation[]>([
  {
    id: 1,
    title: 'تحليل فرصي الحالية',
    messages: [
      { from: 'ai', text: 'مرحباً! أنا مساعدك المهني الذكي. كيف يمكنني مساعدتك اليوم؟ يمكنني تحليل فرصك، تحسين ملفك، أو إنشاء سيرة ذاتية.' },
    ],
  },
  {
    id: 2,
    title: 'نصائح تحضير المقابلة',
    messages: [
      { from: 'user', text: 'كيف أستعد للمقابلة؟' },
      { from: 'ai', text: 'راجع المتطلبات الأساسية للفرصة، جهّز أمثلة STAR لإنجازاتك، وتدرّب على الأسئلة الشائعة في مجالك.' },
    ],
  },
])

const activeId = ref(1)
const active = computed(() => conversations.value.find(c => c.id === activeId.value)!)

// Context-aware quick suggestions driven by real profile state
const suggestions = computed(() => ai.assistantSuggestions({
  unverifiedSkills: profileStore.unverifiedSkills,
  pendingProofs: profileStore.pendingProofRequests.length,
}))

// Proactive AI alerts grounded in the user's live data
const proactiveDismissed = ref(false)
const proactiveNudges = computed(() => ai.proactiveNudges({
  trust: trustStore.score,
  trustDelta: 5,
  pendingProofs: profileStore.pendingProofRequests.length,
  unverifiedSkills: profileStore.unverifiedSkills,
}))

const historySearch = ref('')
const filteredHistory = computed(() =>
  conversations.value.filter(c => !historySearch.value || c.title.includes(historySearch.value)),
)

const input = ref('')
const isTyping = ref(false)
const listRef = ref<HTMLElement | null>(null)
let nextConvId = 100

async function scrollToBottom() {
  await nextTick()
  if (listRef.value)
    listRef.value.scrollTop = listRef.value.scrollHeight
}

function aiReply(question: string): string {
  return ai.assistantReply(question, {
    trust: trustStore.score,
    unverifiedSkills: profileStore.unverifiedSkills,
    lastInterviewScore: interviewsStore.completed[0]?.result?.score ?? null,
  })
}

function newConversation() {
  const conv: Conversation = { id: nextConvId++, title: 'محادثة جديدة', messages: [{ from: 'ai', text: 'أهلاً! كيف أساعدك؟' }] }
  conversations.value.unshift(conv)
  activeId.value = conv.id
}

async function send(text?: string) {
  const content = (text ?? input.value).trim()
  if (!content)
    return
  active.value.messages.push({ from: 'user', text: content })
  if (active.value.title === 'محادثة جديدة')
    active.value.title = content.slice(0, 30)
  input.value = ''
  await scrollToBottom()
  isTyping.value = true
  setTimeout(async () => {
    active.value.messages.push({ from: 'ai', text: aiReply(content) })
    isTyping.value = false
    await scrollToBottom()
  }, 900)
}

// Real file upload → AI analysis
const fileInput = ref<HTMLInputElement | null>(null)
function triggerFilePick() {
  fileInput.value?.click()
}
async function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file)
    return
  active.value.messages.push({ from: 'user', text: `📎 تم رفع ملف: ${file.name}` })
  await scrollToBottom()
  isTyping.value = true
  const analysis = ai.analyzeUpload(file.name)
  setTimeout(async () => {
    active.value.messages.push({ from: 'ai', text: analysis.summary, card: analysis })
    isTyping.value = false
    await scrollToBottom()
  }, 1000)
  ;(e.target as HTMLInputElement).value = ''
}
</script>

<template>
  <div class="d-flex ga-4" style="height: calc(100vh - 116px)">
    <!-- History sidebar -->
    <VCard class="pa-3 d-none d-md-flex flex-column" style="width: 260px; min-width: 260px">
      <VBtn color="accent" prepend-icon="mdi-plus" class="mb-3" @click="newConversation">محادثة جديدة</VBtn>
      <VTextField v-model="historySearch" placeholder="بحث في السجل..." prepend-inner-icon="mdi-magnify" density="compact" hide-details class="mb-2" />
      <div class="text-caption text-medium-emphasis mb-1">سجل المحادثات</div>
      <VList class="flex-grow-1 overflow-y-auto py-0" density="compact">
        <VListItem
          v-for="conv in filteredHistory"
          :key="conv.id"
          :active="conv.id === activeId"
          color="primary"
          rounded="lg"
          prepend-icon="mdi-message-outline"
          :title="conv.title"
          class="mb-1"
          @click="activeId = conv.id"
        />
      </VList>
    </VCard>

    <!-- Chat -->
    <div class="flex-grow-1 d-flex flex-column overflow-hidden">
      <div class="d-flex align-center ga-3 mb-3">
        <VAvatar color="secondary" rounded="lg"><VIcon icon="mdi-robot-happy-outline" color="white" /></VAvatar>
        <div>
          <h1 class="text-h6 font-weight-bold mb-0">المساعد الذكي</h1>
          <div class="text-caption text-success"><VIcon icon="mdi-circle" size="8" /> متصل</div>
        </div>
      </div>

      <!-- Proactive AI alerts (context-aware) -->
      <div v-if="!proactiveDismissed && proactiveNudges.length" class="mb-3">
        <VAlert
          :type="proactiveNudges[0].tone"
          variant="tonal"
          density="compact"
          border="start"
          closable
          @click:close="proactiveDismissed = true"
        >
          <div class="d-flex align-center justify-space-between flex-wrap ga-2">
            <div class="d-flex align-center ga-2">
              <VIcon :icon="proactiveNudges[0].icon" size="20" />
              <span class="text-body-2">{{ proactiveNudges[0].text }}</span>
            </div>
            <VBtn v-if="proactiveNudges[0].action" size="x-small" variant="flat" color="accent" :to="{ name: proactiveNudges[0].action }">
              {{ proactiveNudges[0].actionLabel }}
            </VBtn>
          </div>
        </VAlert>
      </div>

      <VCard class="flex-grow-1 d-flex flex-column overflow-hidden">
        <div ref="listRef" class="flex-grow-1 overflow-y-auto pa-4">
          <div v-for="(msg, i) in active.messages" :key="i" class="d-flex mb-3" :class="msg.from === 'user' ? 'justify-end' : 'justify-start'">
            <div class="d-flex ga-2" :class="msg.from === 'user' ? 'flex-row-reverse' : ''" style="max-width: 80%">
              <VAvatar :color="msg.from === 'user' ? 'primary' : 'secondary'" size="34">
                <VIcon :icon="msg.from === 'user' ? 'mdi-account' : 'mdi-robot-happy-outline'" color="white" size="18" />
              </VAvatar>
              <div class="pa-3 rounded-lg text-body-2" :class="msg.from === 'user' ? 'bg-primary text-white' : 'bg-grey-lighten-3'">
                {{ msg.text }}

                <!-- Structured file-analysis card -->
                <div v-if="msg.card" class="mt-3">
                  <div class="d-flex align-center ga-1 mb-1">
                    <VIcon icon="mdi-thumb-up-outline" color="success" size="16" />
                    <span class="text-caption font-weight-bold">نقاط القوة</span>
                  </div>
                  <ul class="text-caption mb-2 ps-4">
                    <li v-for="s in msg.card.strengths" :key="s">{{ s }}</li>
                  </ul>
                  <div class="d-flex align-center ga-1 mb-1">
                    <VIcon icon="mdi-arrow-up-circle-outline" color="warning" size="16" />
                    <span class="text-caption font-weight-bold">اقتراحات التحسين</span>
                  </div>
                  <ul class="text-caption mb-2 ps-4">
                    <li v-for="s in msg.card.improvements" :key="s">{{ s }}</li>
                  </ul>
                  <div class="d-flex align-center ga-1 mb-1">
                    <VIcon icon="mdi-tag-multiple-outline" color="secondary" size="16" />
                    <span class="text-caption font-weight-bold">كلمات مفتاحية ATS مقترحة</span>
                  </div>
                  <div class="d-flex flex-wrap ga-1">
                    <VChip v-for="k in msg.card.atsKeywords" :key="k" size="x-small" color="secondary" variant="tonal" label>{{ k }}</VChip>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-if="isTyping" class="d-flex ga-2 mb-3">
            <VAvatar color="secondary" size="34"><VIcon icon="mdi-robot-happy-outline" color="white" size="18" /></VAvatar>
            <div class="pa-3 rounded-lg bg-grey-lighten-3"><VProgressCircular indeterminate size="18" width="2" color="secondary" /></div>
          </div>
        </div>

        <VDivider />
        <div class="d-flex flex-wrap ga-2 px-4 pt-3">
          <VChip v-for="s in suggestions" :key="s" color="primary" variant="tonal" size="small" class="cursor-pointer" @click="send(s)">
            {{ s }}
          </VChip>
        </div>

        <div class="pa-4 d-flex align-center ga-2">
          <input ref="fileInput" type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" hidden @change="onFileChange">
          <VBtn icon="mdi-paperclip" variant="text" @click="triggerFilePick" />
          <VTextField
            v-model="input"
            placeholder="اكتب رسالتك..."
            hide-details
            append-inner-icon="mdi-send"
            @click:append-inner="send()"
            @keyup.enter="send()"
          />
        </div>
      </VCard>
    </div>
  </div>
</template>
