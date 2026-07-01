<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import QuestionRenderer from '../components/QuestionRenderer.vue'
import { QUESTION_TYPE_META, buildQuestions, getAssessmentById, scoreAnswer } from '../services/mockAssessments'

const route = useRoute()
const router = useRouter()

const assessment = computed(() => getAssessmentById(Number(route.params.id)))
const size = computed(() => Number(route.query.size) || 10)

// Build a unique question set for this attempt
const questions = computed(() => (assessment.value ? buildQuestions(assessment.value.pool, size.value) : []))

const currentIndex = ref(0)
const answers = ref<Record<number, any>>({})
const revealedHints = ref<Set<number>>(new Set())
const secondsLeft = ref(0)
let timer: ReturnType<typeof setInterval> | undefined

const currentQuestion = computed(() => questions.value[currentIndex.value])
const totalQuestions = computed(() => questions.value.length)
const progress = computed(() => (totalQuestions.value ? ((currentIndex.value + 1) / totalQuestions.value) * 100 : 0))
const isLast = computed(() => currentIndex.value === totalQuestions.value - 1)
const answeredCount = computed(() => Object.values(answers.value).filter(v => v !== undefined && v !== '' && !(Array.isArray(v) && !v.length)).length)

const timeLabel = computed(() => {
  const m = Math.floor(secondsLeft.value / 60)
  const s = secondsLeft.value % 60
  return `${m}:${String(s).padStart(2, '0')}`
})

function revealHint() {
  if (currentQuestion.value)
    revealedHints.value = new Set(revealedHints.value).add(currentQuestion.value.id)
}
const hintShown = computed(() => !!currentQuestion.value && revealedHints.value.has(currentQuestion.value.id))

function next() {
  if (!isLast.value)
    currentIndex.value++
}
function prev() {
  if (currentIndex.value > 0)
    currentIndex.value--
}
function skip() {
  next()
}

function finish() {
  const qs = questions.value
  const correct = qs.filter(q => scoreAnswer(q, answers.value[q.id])).length
  const score = totalQuestions.value ? Math.round((correct / totalQuestions.value) * 100) : 0
  router.replace({
    name: 'assessment-result',
    params: { id: route.params.id },
    query: { score, correct, total: totalQuestions.value },
  })
}

onMounted(() => {
  if (assessment.value) {
    secondsLeft.value = Math.max(assessment.value.durationMinutes, size.value) * 60
    timer = setInterval(() => {
      if (secondsLeft.value > 0)
        secondsLeft.value--
      else finish()
    }, 1000)
  }
})
onBeforeUnmount(() => {
  if (timer)
    clearInterval(timer)
})
</script>

<template>
  <div v-if="assessment" class="mx-auto" style="max-width: 760px">
    <!-- Top bar: title + timer -->
    <div class="d-flex align-center justify-space-between mb-4 flex-wrap ga-2">
      <div class="d-flex align-center ga-3">
        <VAvatar :color="assessment.color" variant="tonal" rounded="lg">
          <VIcon :icon="assessment.icon" />
        </VAvatar>
        <h1 class="text-h6 font-weight-bold mb-0">{{ assessment.name }}</h1>
      </div>
      <VChip :color="secondsLeft < 60 ? 'error' : 'primary'" size="large" prepend-icon="mdi-clock-outline">
        {{ timeLabel }}
      </VChip>
    </div>

    <!-- Progress -->
    <div class="d-flex justify-space-between text-caption mb-1">
      <span class="text-medium-emphasis">السؤال {{ currentIndex + 1 }} من {{ totalQuestions }}</span>
      <span class="text-medium-emphasis">تمت الإجابة على {{ answeredCount }}</span>
    </div>
    <VProgressLinear :model-value="progress" color="accent" height="8" rounded class="mb-5" />

    <!-- Question -->
    <VCard v-if="currentQuestion" class="pa-6 mb-4" min-height="280">
      <div class="d-flex align-center ga-2 mb-3 flex-wrap">
        <VChip size="x-small" color="secondary" variant="tonal" label :prepend-icon="QUESTION_TYPE_META[currentQuestion.type].icon">
          {{ QUESTION_TYPE_META[currentQuestion.type].label }}
        </VChip>
      </div>
      <div class="text-h6 font-weight-bold mb-5">{{ currentQuestion.text }}</div>

      <QuestionRenderer :key="currentQuestion.id" v-model="answers[currentQuestion.id]" :question="currentQuestion" />

      <!-- AI hint -->
      <div class="mt-4">
        <VExpandTransition>
          <VAlert v-if="hintShown && currentQuestion.hint" color="secondary" variant="tonal" density="compact" border="start">
            <template #prepend><VIcon icon="mdi-robot-happy-outline" size="20" /></template>
            <span class="text-caption">{{ currentQuestion.hint }}</span>
          </VAlert>
        </VExpandTransition>
        <VBtn v-if="!hintShown && currentQuestion.hint" size="x-small" variant="text" color="secondary" prepend-icon="mdi-lightbulb-on-outline" @click="revealHint">
          تلميح من الـ AI
        </VBtn>
      </div>
    </VCard>

    <!-- Navigation -->
    <div class="d-flex justify-space-between align-center flex-wrap ga-2">
      <VBtn variant="outlined" :disabled="currentIndex === 0" prepend-icon="mdi-arrow-right" @click="prev">السابق</VBtn>
      <VBtn variant="text" size="small" @click="skip">تخطّي السؤال</VBtn>
      <VBtn v-if="!isLast" color="accent" append-icon="mdi-arrow-left" @click="next">التالي</VBtn>
      <VBtn v-else color="success" prepend-icon="mdi-flag-checkered" @click="finish">إنهاء الاختبار</VBtn>
    </div>
  </div>

  <VCard v-else class="pa-12 text-center">
    <VIcon icon="mdi-alert-circle-outline" size="64" color="error" />
    <div class="text-h6 mt-3">الاختبار غير موجود</div>
    <VBtn color="primary" class="mt-3" :to="{ name: 'assessments' }">العودة لمركز التقييم</VBtn>
  </VCard>
</template>
