<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { LEVEL_META, TYPE_META, useInterviewsStore } from '@/stores/InterviewsStore'
import type { InterviewResult } from '@/stores/InterviewsStore'
import { ai } from '@/services/ai'
import type { AdaptiveQuestion, InteractiveEvaluation, InterviewTrack } from '@/services/ai'
import { PATTERN_META, TRACK_META, interviewEngine } from '@/services/ai'
import CodeChallenge from '../components/CodeChallenge.vue'
import DecisionMatrix from '../components/DecisionMatrix.vue'
import CustomerChat from '../components/CustomerChat.vue'
import DataCleaning from '../components/DataCleaning.vue'
import TaskOrdering from '../components/TaskOrdering.vue'
import PressureRoom from '../components/PressureRoom.vue'
import ProjectDive from '../components/ProjectDive.vue'
import FreeAnswer from '../components/FreeAnswer.vue'

const route = useRoute()
const router = useRouter()
const store = useInterviewsStore()

const interview = computed(() => store.getById(Number(route.params.id)))
const isVideo = computed(() => interview.value?.type === 'ai_video')
const track = computed<InterviewTrack>(() => interview.value?.track ?? 'tech')
const total = computed(() => interviewEngine.sequenceLength(track.value))

const currentIndex = ref(0)
const currentQuestion = shallowRef<AdaptiveQuestion | null>(null)
const currentAnswer = ref('')
const answers = ref<Record<number, { score: number, competency: string }>>({})
const lastEval = ref<InteractiveEvaluation | null>(null)
const evaluating = ref(false)
let prevScore: number | null = null

const answered = computed(() => !!(currentQuestion.value && answers.value[currentQuestion.value.id]))
const isLast = computed(() => currentIndex.value === total.value - 1)
const progress = computed(() => (total.value ? ((currentIndex.value + 1) / total.value) * 100 : 0))

function widgetFor(pattern: string) {
  switch (pattern) {
    case 'live_case':
    case 'fill_code':
      return CodeChallenge
    case 'strategic':
      return DecisionMatrix
    case 'angry_customer':
      return CustomerChat
    case 'dirty_data':
      return DataCleaning
    case 'reverse_plan':
      return TaskOrdering
    case 'pressure':
      return PressureRoom
    case 'project_dive':
      return ProjectDive
    default:
      return FreeAnswer
  }
}

// ── per-question timer ──
const timeLeft = ref(0)
let timerId: ReturnType<typeof setInterval> | undefined
const timeLabel = computed(() => `${String(Math.floor(timeLeft.value / 60)).padStart(2, '0')}:${String(timeLeft.value % 60).padStart(2, '0')}`)
const timeColor = computed(() => (timeLeft.value <= 20 ? 'error' : timeLeft.value <= 60 ? 'warning' : 'primary'))
function startTimer(seconds: number) {
  clearInterval(timerId)
  timeLeft.value = seconds
  timerId = setInterval(() => {
    if (timeLeft.value > 0 && !answered.value)
      timeLeft.value--
    else if (timeLeft.value === 0 && !answered.value && currentQuestion.value)
      submit()
  }, 1000)
}

// ── anti-cheat: flag tab/window switches ──
const tabSwitches = ref(0)
const cheatWarning = ref(false)
function onVisibility() {
  if (document.hidden && !answered.value) {
    tabSwitches.value++
    cheatWarning.value = true
  }
}

function loadQuestion(index: number) {
  const q = interviewEngine.nextQuestion(track.value, index, prevScore)
  currentQuestion.value = q
  currentAnswer.value = ''
  lastEval.value = null
  if (q)
    startTimer(q.seconds)
}

function submit() {
  const q = currentQuestion.value
  if (!q || evaluating.value || answered.value)
    return
  evaluating.value = true
  setTimeout(() => {
    const ev = interviewEngine.evaluate(q, currentAnswer.value)
    answers.value[q.id] = { score: ev.score, competency: q.competency }
    lastEval.value = ev
    prevScore = ev.score
    evaluating.value = false
  }, 700)
}

function next() {
  if (isLast.value) {
    finish()
    return
  }
  currentIndex.value++
  loadQuestion(currentIndex.value)
}

function finish() {
  if (!interview.value)
    return
  clearInterval(timerId)
  const entries = Object.values(answers.value)
  const avg = entries.length ? Math.round(entries.reduce((s, a) => s + a.score, 0) / entries.length) : 0
  const competencies = entries.map(a => ({ name: a.competency, score: a.score }))
  const levelLabel = avg >= 85 ? 'خبير' : avg >= 70 ? 'متقدم' : avg >= 50 ? 'متوسط' : 'أساسي'

  const integrityClean = tabSwitches.value === 0
  const result: InterviewResult = {
    score: avg,
    level: levelLabel,
    competencies,
    strengths: [
      ...(avg >= 70 ? ['إجابات تفاعلية عملية', 'تعامل جيد مع الأسئلة التكيّفية'] : ['استعداد جيد للتطوير']),
      ...(integrityClean ? ['نزاهة كاملة: بلا مغادرة للنافذة'] : []),
    ],
    improvements: [
      ...(avg >= 70 ? ['دعم الحلول بحالات حدّية أكثر'] : ['تعميق الحلول العملية', 'إدارة الوقت تحت الضغط']),
      ...(integrityClean ? [] : [`رُصدت ${tabSwitches.value} مغادرة للنافذة أثناء الأسئلة — قد تؤثر على مصداقية النتيجة`]),
    ],
    recommendations: ['راجع الأنماط الأصعب في مسارك', 'كرّر المقابلة بعد أسبوعين لقياس التطور'],
    video: isVideo.value ? ai.videoAnalysis() : undefined,
  }
  store.complete(interview.value.id, result)
  router.replace({ name: 'interview-result', params: { id: interview.value.id } })
}

onMounted(() => {
  document.addEventListener('visibilitychange', onVisibility)
  loadQuestion(0)
})
onBeforeUnmount(() => {
  clearInterval(timerId)
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<template>
  <div v-if="interview && currentQuestion" class="mx-auto" style="max-width: 860px">
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-3 flex-wrap ga-2">
      <div class="d-flex align-center ga-3">
        <VAvatar color="primary" variant="tonal" rounded="lg"><VIcon :icon="TRACK_META[track].icon" /></VAvatar>
        <div>
          <h1 class="text-h6 font-weight-bold mb-0">مقابلة {{ TRACK_META[track].label }}</h1>
          <div class="text-caption text-medium-emphasis">مسار تكيّفي مضاد للغش · {{ LEVEL_META[interview.level].label }}</div>
        </div>
      </div>
      <div class="d-flex align-center ga-2">
        <VChip v-if="tabSwitches" color="error" size="small" label prepend-icon="mdi-shield-alert-outline">مغادرة ×{{ tabSwitches }}</VChip>
        <VChip v-else color="success" size="small" label prepend-icon="mdi-shield-check-outline">نزاهة</VChip>
        <VChip :color="timeColor" label prepend-icon="mdi-timer-outline" variant="flat">{{ timeLabel }}</VChip>
      </div>
    </div>

    <VProgressLinear :model-value="progress" color="accent" height="8" rounded class="mb-4" />

    <!-- Video recording indicator -->
    <VCard v-if="isVideo" class="pa-3 mb-4 text-center bg-grey-darken-4" theme="darkTheme">
      <div class="d-flex align-center justify-center ga-2">
        <VIcon icon="mdi-record-circle" color="error" class="pulse" />
        <span class="text-caption">جارٍ التسجيل — يحلّل الـ AI نبرتك ولغة جسدك</span>
      </div>
    </VCard>

    <VCard class="pa-5 mb-4">
      <!-- Question meta -->
      <div class="d-flex align-center justify-space-between mb-3 flex-wrap ga-2">
        <div class="d-flex align-center ga-2">
          <VChip color="secondary" size="small" label :prepend-icon="PATTERN_META[currentQuestion.pattern].icon">
            {{ PATTERN_META[currentQuestion.pattern].label }}
          </VChip>
          <VChip size="x-small" label variant="tonal">{{ currentQuestion.competency }}</VChip>
        </div>
        <span class="text-caption text-medium-emphasis">سؤال {{ currentIndex + 1 }} من {{ total }}</span>
      </div>

      <!-- Prompt -->
      <div class="d-flex ga-3 mb-4">
        <VAvatar color="secondary" size="34"><VIcon icon="mdi-robot-happy-outline" color="white" size="18" /></VAvatar>
        <div class="pa-3 rounded-lg bg-grey-lighten-3 text-body-1 flex-grow-1">
          {{ currentQuestion.prompt }}
          <div v-if="currentQuestion.scenario && currentQuestion.pattern !== 'pressure'" class="mt-2 pa-2 rounded bg-white text-body-2 font-weight-bold">
            <VIcon icon="mdi-alert-decagram-outline" size="16" color="warning" /> {{ currentQuestion.scenario }}
          </div>
        </div>
      </div>

      <!-- Interactive widget per pattern -->
      <div :class="{ 'answered-lock': answered }">
        <component :is="widgetFor(currentQuestion.pattern)" :key="currentQuestion.id" :question="currentQuestion" v-model:answer="currentAnswer" />
      </div>

      <!-- Live AI analysis -->
      <VExpandTransition>
        <VAlert v-if="lastEval" :type="lastEval.score >= 70 ? 'success' : 'warning'" variant="tonal" density="compact" class="mt-3">
          <div class="d-flex justify-space-between align-center mb-1">
            <span class="font-weight-bold">تحليل الـ AI اللحظي</span>
            <VChip :color="lastEval.score >= 70 ? 'success' : 'warning'" size="small" label>{{ lastEval.score }}%</VChip>
          </div>
          <div class="text-body-2 mb-1">{{ lastEval.feedback }}</div>
          <ul class="ps-4 text-caption">
            <li v-for="s in lastEval.signals" :key="s">{{ s }}</li>
          </ul>
          <div v-if="lastEval.followUp" class="mt-2 pa-2 rounded bg-white text-body-2 d-flex align-center ga-2">
            <VIcon icon="mdi-arrow-decision-outline" color="accent" size="18" />
            <span>{{ lastEval.followUp }}</span>
          </div>
        </VAlert>
      </VExpandTransition>
    </VCard>

    <div class="d-flex justify-end ga-2">
      <VBtn
        v-if="!answered"
        color="primary"
        :loading="evaluating"
        :disabled="!currentAnswer.trim()"
        prepend-icon="mdi-send"
        @click="submit"
      >
        إرسال الإجابة
      </VBtn>
      <VBtn v-else color="accent" :append-icon="isLast ? 'mdi-flag-checkered' : 'mdi-arrow-left'" @click="next">
        {{ isLast ? 'إنهاء وعرض النتيجة' : 'السؤال التالي' }}
      </VBtn>
    </div>

    <!-- Anti-cheat snackbar -->
    <VSnackbar v-model="cheatWarning" color="error" location="top" timeout="3500">
      <VIcon icon="mdi-shield-alert-outline" /> رُصدت مغادرة للنافذة — النزاهة جزء من تقييمك.
    </VSnackbar>
  </div>

  <VCard v-else class="pa-12 text-center">
    <VIcon icon="mdi-alert-circle-outline" size="64" color="error" />
    <div class="text-h6 mt-3">المقابلة غير موجودة</div>
    <VBtn color="primary" class="mt-3" :to="{ name: 'interviews' }">العودة للمقابلات</VBtn>
  </VCard>
</template>

<style scoped>
.pulse { animation: pulse 1.2s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
.answered-lock { opacity: 0.75; pointer-events: none; }
</style>
