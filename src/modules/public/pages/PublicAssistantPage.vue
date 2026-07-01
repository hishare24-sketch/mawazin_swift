<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { useRouter } from 'vue-router'
import PublicTopBar from '@/components/shared/PublicTopBar.vue'

interface ChatMessage { from: 'user' | 'ai', text: string }

const router = useRouter()
const messages = ref<ChatMessage[]>([
  { from: 'ai', text: 'أهلاً بك! أنا المساعد المهني الذكي. اسألني عن التوظيف، المهارات المطلوبة، أو كيفية بناء سيرتك — نسخة الزائر مجانية.' },
])
const suggestions = ['ما المهارات المطلوبة في 2026؟', 'كيف أكتب سيرة ذاتية جيدة؟', 'نصائح للمقابلات الوظيفية']
const input = ref('')
const isTyping = ref(false)
const listRef = ref<HTMLElement | null>(null)
let count = 0

async function scrollToBottom() {
  await nextTick()
  if (listRef.value)
    listRef.value.scrollTop = listRef.value.scrollHeight
}

async function send(text?: string) {
  const content = (text ?? input.value).trim()
  if (!content)
    return
  messages.value.push({ from: 'user', text: content })
  input.value = ''
  count++
  await scrollToBottom()
  isTyping.value = true
  setTimeout(async () => {
    if (count >= 3) {
      messages.value.push({ from: 'ai', text: 'للحصول على استشارات مخصّصة وتحليل ملفك وإنشاء سيرة ذاتية، أنشئ حساباً مجانياً للاستفادة الكاملة من المساعد.' })
    }
    else {
      messages.value.push({ from: 'ai', text: 'سؤال رائع! بشكل عام، ركّز على المهارات التقنية المطلوبة في مجالك، وابنِ ملفاً قوياً بتوصيات موثّقة. سجّل للحصول على توصيات دقيقة مبنية على بياناتك.' })
    }
    isTyping.value = false
    await scrollToBottom()
  }, 800)
}
</script>

<template>
  <div class="bg-background" style="min-height: 100vh">
    <PublicTopBar />
    <VContainer class="py-6" style="max-width: 820px">
      <div class="d-flex align-center ga-3 mb-3">
        <VAvatar color="secondary" rounded="lg"><VIcon icon="mdi-robot-happy-outline" color="white" /></VAvatar>
        <div>
          <h1 class="text-h6 font-weight-bold mb-0">المساعد الذكي — نسخة الزائر</h1>
          <div class="text-caption text-medium-emphasis">استشارات عامة مجانية</div>
        </div>
      </div>

      <VCard class="d-flex flex-column overflow-hidden" style="height: 60vh">
        <div ref="listRef" class="flex-grow-1 overflow-y-auto pa-4">
          <div v-for="(msg, i) in messages" :key="i" class="d-flex mb-3" :class="msg.from === 'user' ? 'justify-end' : 'justify-start'">
            <div class="d-flex ga-2" :class="msg.from === 'user' ? 'flex-row-reverse' : ''" style="max-width: 80%">
              <VAvatar :color="msg.from === 'user' ? 'primary' : 'secondary'" size="34">
                <VIcon :icon="msg.from === 'user' ? 'mdi-account' : 'mdi-robot-happy-outline'" color="white" size="18" />
              </VAvatar>
              <div class="pa-3 rounded-lg text-body-2" :class="msg.from === 'user' ? 'bg-primary text-white' : 'bg-grey-lighten-3'">
                {{ msg.text }}
              </div>
            </div>
          </div>
          <div v-if="isTyping" class="d-flex ga-2">
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
        <div class="pa-4">
          <VTextField
            v-model="input"
            placeholder="اكتب سؤالك..."
            hide-details
            append-inner-icon="mdi-send"
            @click:append-inner="send()"
            @keyup.enter="send()"
          />
        </div>
      </VCard>

      <div class="text-center mt-4">
        <VBtn color="accent" prepend-icon="mdi-account-plus-outline" @click="router.push({ name: 'register' })">
          أنشئ حساباً للاستفادة الكاملة
        </VBtn>
      </div>
    </VContainer>
  </div>
</template>
