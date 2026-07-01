<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { LEVEL_META, TYPE_META, useInterviewsStore } from '@/stores/InterviewsStore'
import type { InterviewResult } from '@/stores/InterviewsStore'
import { ai } from '@/services/ai'

const route = useRoute()
const router = useRouter()
const store = useInterviewsStore()

const interview = computed(() => store.getById(Number(route.params.id)))
const isVideo = computed(() => interview.value?.type === 'ai_video')

const questions = computed(() =>
  interview.value ? ai.interviewQuestions(interview.value.type, interview.value.level) : [],
)

const currentIndex = ref(0)
const answers = ref<Record<number, { text: string, score: number, competency: string }>>({})
const currentAnswer = ref('')
const evaluating = ref(false)
const lastFeedback = ref('')
const hint = ref('')

const current = computed(() => questions.value[currentIndex.value])
const progress = computed(() => (questions.value.length ? ((currentIndex.value + 1) / questions.value.length) * 100 : 0))
const isLast = computed(() => currentIndex.value === questions.value.length - 1)
const answered = computed(() => !!(current.value && answers.value[current.value.id]))

// — Per-question countdown timer —
const QUESTION_SECONDS = 120
const timeLeft = ref(QUESTION_SECONDS)
let timerId: ReturnType<typeof setInterval> | undefined
const timeLabel = computed(() => `${String(Math.floor(timeLeft.value / 60)).padStart(2, '0')}:${String(timeLeft.value % 60).padStart(2, '0')}`)
const timeColor = computed(() => (timeLeft.value <= 15 ? 'error' : timeLeft.value <= 40 ? 'warning' : 'primary'))

function startTimer() {
  clearInterval(timerId)
  timeLeft.value = QUESTION_SECONDS
  timerId = setInterval(() => {
    if (timeLeft.value > 0 && !answered.value)
      timeLeft.value--
    else if (timeLeft.value === 0 && !answered.value)
      submitAnswer()
  }, 1000)
}
watch(current, () => startTimer(), { immediate: true })
onBeforeUnmount(() => clearInterval(timerId))

function requestHint() {
  if (current.value)
    hint.value = ai.interviewHint(current.value.text, current.value.competency)
}

function submitAnswer() {
  if (!current.value)
    return
  evaluating.value = true
  lastFeedback.value = ''
  setTimeout(() => {
    const evalResult = ai.evaluateAnswer(current.value.text, currentAnswer.value)
    answers.value[current.value.id] = { text: currentAnswer.value, score: evalResult.score, competency: current.value.competency }
    lastFeedback.value = evalResult.feedback
    evaluating.value = false
  }, 800)
}

function nextQuestion() {
  currentAnswer.value = ''
  lastFeedback.value = ''
  hint.value = ''
  if (isLast.value)
    finish()
  else currentIndex.value++
}

function finish() {
  if (!interview.value)
    return
  const scores = Object.values(answers.value)
  const avg = scores.length ? Math.round(scores.reduce((s, a) => s + a.score, 0) / scores.length) : 0
  const competencies = scores.map(a => ({ name: a.competency, score: a.score }))

  const levelLabel = avg >= 85 ? 'خبير' : avg >= 70 ? 'متقدم' : avg >= 50 ? 'متوسط' : 'أساسي'
  const result: InterviewResult = {
    score: avg,
    level: levelLabel,
    competencies,
    strengths: avg >= 70 ? ['إجابات واضحة ومنظّمة', 'أمثلة عملية داعمة'] : ['استعداد جيد للتطوير'],
    improvements: avg >= 70 ? ['دعم الإجابات بأرقام ونتائج'] : ['إضافة أمثلة ملموسة', 'تعميق الشرح التقني'],
    recommendations: ['راجع أسئلة المستوى الأعلى للتحضير', 'أكمل اختبار مهارة مرتبط'],
    video: isVideo.value ? ai.videoAnalysis() : undefined,
  }
  store.complete(interview.value.id, result)
  router.replace({ name: 'interview-result', params: { id: interview.value.id } })
}
</script>

<template>
  <div v-if="interview" class="mx-auto" style="max-width: 780px">
    <div class="d-flex align-center justify-space-between mb-4 flex-wrap ga-2">
      <div class="d-flex align-center ga-3">
        <VAvatar color="primary" variant="tonal" rounded="lg"><VIcon :icon="TYPE_META[interview.type].icon" /></VAvatar>
        <div>
          <h1 class="text-h6 font-weight-bold mb-0">{{ TYPE_META[interview.type].label }}</h1>
          <div class="text-caption text-medium-emphasis">المستوى: {{ LEVEL_META[interview.level].label }}</div>
        </div>
      </div>
      <div class="d-flex align-center ga-2">
        <VChip :color="timeColor" label prepend-icon="mdi-timer-outline" variant="flat">{{ timeLabel }}</VChip>
        <VChip color="primary" label prepend-icon="mdi-robot-happy-outline">مقابلة ذكية</VChip>
      </div>
    </div>

    <!-- Video placeholder -->
    <VCard v-if="isVideo" class="pa-4 mb-4 text-center bg-grey-darken-4" theme="darkTheme">
      <VIcon icon="mdi-account-box-outline" size="64" color="grey" />
      <div class="d-flex align-center justify-center ga-2 mt-2">
        <VIcon icon="mdi-record-circle" color="error" class="pulse" />
        <span class="text-caption">جارٍ التسجيل — سيُحلّل الـ AI لغة جسدك ونبرتك</span>
      </div>
    </VCard>

    <div class="d-flex justify-space-between text-caption mb-1">
      <span class="text-medium-emphasis">السؤال {{ currentIndex + 1 }} من {{ questions.length }}</span>
      <span class="text-medium-emphasis">{{ current?.competency }}</span>
    </div>
    <VProgressLinear :model-value="progress" color="accent" height="8" rounded class="mb-5" />

    <VCard class="pa-5 mb-4">
      <div class="d-flex ga-3 mb-4">
        <VAvatar color="secondary" size="36"><VIcon icon="mdi-robot-happy-outline" color="white" size="20" /></VAvatar>
        <div class="pa-3 rounded-lg bg-grey-lighten-3 text-body-1 flex-grow-1">{{ current?.text }}</div>
      </div>

      <VTextarea
        v-model="currentAnswer"
        label="إجابتك"
        rows="4"
        auto-grow
        :disabled="!!answers[current?.id ?? -1]"
        placeholder="اكتب إجابتك بتفصيل وأمثلة..."
      />

      <!-- AI hint on request -->
      <VExpandTransition>
        <VAlert v-if="hint && !answered" type="info" variant="tonal" density="compact" class="mt-2" icon="mdi-lightbulb-on-outline">
          {{ hint }}
        </VAlert>
      </VExpandTransition>

      <!-- Feedback -->
      <VExpandTransition>
        <VAlert v-if="answers[current?.id ?? -1]" type="success" variant="tonal" density="compact" class="mt-2">
          <div class="d-flex justify-space-between align-center">
            <span>{{ lastFeedback }}</span>
            <VChip color="success" size="small" label>{{ answers[current!.id].score }}%</VChip>
          </div>
        </VAlert>
      </VExpandTransition>
    </VCard>

    <div class="d-flex justify-space-between align-center ga-2 flex-wrap">
      <VBtn
        v-if="!answered"
        variant="text"
        color="secondary"
        prepend-icon="mdi-help-circle-outline"
        :disabled="!!hint"
        @click="requestHint"
      >
        اطلب توضيح
      </VBtn>
      <VSpacer />
      <VBtn
        v-if="!answers[current?.id ?? -1]"
        color="primary"
        :loading="evaluating"
        :disabled="!currentAnswer.trim()"
        prepend-icon="mdi-send"
        @click="submitAnswer"
      >
        إرسال الإجابة
      </VBtn>
      <VBtn v-else color="accent" :append-icon="isLast ? 'mdi-flag-checkered' : 'mdi-arrow-left'" @click="nextQuestion">
        {{ isLast ? 'إنهاء وعرض النتيجة' : 'السؤال التالي' }}
      </VBtn>
    </div>
  </div>

  <VCard v-else class="pa-12 text-center">
    <VIcon icon="mdi-alert-circle-outline" size="64" color="error" />
    <div class="text-h6 mt-3">المقابلة غير موجودة</div>
    <VBtn color="primary" class="mt-3" :to="{ name: 'interviews' }">العودة للمقابلات</VBtn>
  </VCard>
</template>

<style scoped>
.pulse {
  animation: pulse 1.2s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
</style>
