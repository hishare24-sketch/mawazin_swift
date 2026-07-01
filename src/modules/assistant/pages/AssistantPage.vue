<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'

interface ChatMessage { from: 'user' | 'ai', text: string }
interface Conversation { id: number, title: string, messages: ChatMessage[] }

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

const suggestions = ['حلّل نسبة الثقة في ملفي', 'اقترح لي مقابلة مناسبة', 'كيف أثبت مهاراتي؟', 'حلّل مقابلاتي السابقة', 'حلّل فرصي الحالية', 'أنشئ لي سيرة ذاتية']
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

function mockReply(question: string): string {
  if (question.includes('نسبة الثقة') || question.includes('حلّل نسبتي'))
    return 'نسبة ثقتك الحالية 75/100 (موثوق). أقوى عواملك: اكتمال البيانات والتوصيات. لرفعها: أكمل اختبار مهارة (+5%) وأجرِ مقابلة AI متقدمة (+5%). افتح ملفك ثم "عرض التفاصيل" لخطة كاملة.'
  if (question.includes('اقترح') && question.includes('مقابلة'))
    return 'أقترح مقابلة AI بمستوى «متقدم» لتثبيت مهاراتك القيادية ورفع نسبة ثقتك. هي أسئلة تحليل حالات وتفكير استراتيجي. توجّه إلى "المقابلات" لبدئها الآن.'
  if (question.includes('أثبت') || question.includes('إثبات'))
    return 'لإثبات مهاراتك: اربط كل مهارة بإثبات — اجتز اختبارها في مركز التقييم، أضف مشروعاً منفّذاً، أو اطلب توصية موثّقة من مدير سابق. كل إثبات يرفع نسبة الثقة في المهارة ومستواها.'
  if (question.includes('حلّل مقابلاتي') || question.includes('مقابلاتي السابقة'))
    return 'في مقابلتك الأخيرة (متوسط) حصلت على 82%. نقاط قوتك: وضوح الحلول والأمثلة العملية. للتحسّن: ادعم إجاباتك بأرقام قابلة للقياس. أنصح بمقابلة متقدمة لإثبات القيادة.'
  if (question.includes('سيرة'))
    return 'بالتأكيد! توجّه إلى "منشئ السيرة الذاتية" واختر القالب المناسب، وسأتولّى الباقي مع إعادة الصياغة الذكية.'
  if (question.includes('فرص'))
    return 'بناءً على ملفك، لديك 3 فرص بنسبة تطابق أعلى من 85%. أبرزها "مطوّر واجهات أمامية" بنسبة 94%.'
  return 'سؤال ممتاز! أنصحك بالتركيز على تطوير مهاراتك التقنية وإضافة توصيات موثّقة. هل تريد تفصيلاً أكثر؟'
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
    active.value.messages.push({ from: 'ai', text: mockReply(content) })
    isTyping.value = false
    await scrollToBottom()
  }, 900)
}

function onFilePick() {
  active.value.messages.push({ from: 'user', text: '📎 تم رفع ملف: my-cv.pdf' })
  isTyping.value = true
  setTimeout(() => {
    active.value.messages.push({ from: 'ai', text: 'حلّلت سيرتك: نقاط القوة واضحة في الخبرات التقنية. أقترح إضافة أرقام ونتائج ملموسة للإنجازات، وكلمات مفتاحية لأنظمة ATS.' })
    isTyping.value = false
    scrollToBottom()
  }, 1000)
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

      <VCard class="flex-grow-1 d-flex flex-column overflow-hidden">
        <div ref="listRef" class="flex-grow-1 overflow-y-auto pa-4">
          <div v-for="(msg, i) in active.messages" :key="i" class="d-flex mb-3" :class="msg.from === 'user' ? 'justify-end' : 'justify-start'">
            <div class="d-flex ga-2" :class="msg.from === 'user' ? 'flex-row-reverse' : ''" style="max-width: 80%">
              <VAvatar :color="msg.from === 'user' ? 'primary' : 'secondary'" size="34">
                <VIcon :icon="msg.from === 'user' ? 'mdi-account' : 'mdi-robot-happy-outline'" color="white" size="18" />
              </VAvatar>
              <div class="pa-3 rounded-lg text-body-2" :class="msg.from === 'user' ? 'bg-primary text-white' : 'bg-grey-lighten-3'">
                {{ msg.text }}
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
          <VBtn icon="mdi-paperclip" variant="text" @click="onFilePick" />
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
