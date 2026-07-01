<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getAssessmentById } from '../services/mockAssessments'

const route = useRoute()
const router = useRouter()

const assessment = computed(() => getAssessmentById(Number(route.params.id)))

const currentIndex = ref(0)
const answers = ref<Record<number, number>>({})
const secondsLeft = ref(0)
let timer: ReturnType<typeof setInterval> | undefined

const currentQuestion = computed(() => assessment.value?.questions[currentIndex.value])
const totalQuestions = computed(() => assessment.value?.questions.length ?? 0)
const progress = computed(() => (totalQuestions.value ? ((currentIndex.value + 1) / totalQuestions.value) * 100 : 0))
const isLast = computed(() => currentIndex.value === totalQuestions.value - 1)
const answeredCount = computed(() => Object.keys(answers.value).length)

const timeLabel = computed(() => {
  const m = Math.floor(secondsLeft.value / 60)
  const s = secondsLeft.value % 60
  return `${m}:${String(s).padStart(2, '0')}`
})

function selectOption(optionIndex: number) {
  if (currentQuestion.value)
    answers.value[currentQuestion.value.id] = optionIndex
}

function next() {
  if (!isLast.value)
    currentIndex.value++
}
function prev() {
  if (currentIndex.value > 0)
    currentIndex.value--
}

function finish() {
  // Compute a mock score based on answered ratio (demo)
  const score = Math.round((answeredCount.value / totalQuestions.value) * 100)
  router.replace({ name: 'assessment-result', params: { id: route.params.id }, query: { score } })
}

onMounted(() => {
  if (assessment.value) {
    secondsLeft.value = assessment.value.durationMinutes * 60
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
    <VCard class="pa-6 mb-4" min-height="280">
      <div class="text-h6 font-weight-bold mb-5">{{ currentQuestion?.text }}</div>
      <div class="d-flex flex-column ga-3">
        <VCard
          v-for="(opt, i) in currentQuestion?.options"
          :key="i"
          :variant="answers[currentQuestion!.id] === i ? 'flat' : 'outlined'"
          :color="answers[currentQuestion!.id] === i ? 'primary' : undefined"
          class="pa-3 cursor-pointer d-flex align-center ga-3"
          @click="selectOption(i)"
        >
          <VIcon
            :icon="answers[currentQuestion!.id] === i ? 'mdi-radiobox-marked' : 'mdi-radiobox-blank'"
            :color="answers[currentQuestion!.id] === i ? 'white' : 'medium-emphasis'"
          />
          <span :class="answers[currentQuestion!.id] === i ? 'text-white' : ''">{{ opt }}</span>
        </VCard>
      </div>
    </VCard>

    <!-- Navigation -->
    <div class="d-flex justify-space-between">
      <VBtn variant="outlined" :disabled="currentIndex === 0" prepend-icon="mdi-arrow-right" @click="prev">
        السابق
      </VBtn>
      <VBtn v-if="!isLast" color="accent" append-icon="mdi-arrow-left" @click="next">
        التالي
      </VBtn>
      <VBtn v-else color="success" prepend-icon="mdi-check" @click="finish">
        إنهاء الاختبار
      </VBtn>
    </div>
  </div>

  <VCard v-else class="pa-12 text-center">
    <VIcon icon="mdi-alert-circle-outline" size="64" color="error" />
    <div class="text-h6 mt-3">الاختبار غير موجود</div>
    <VBtn color="primary" class="mt-3" :to="{ name: 'assessments' }">العودة لمركز التقييم</VBtn>
  </VCard>
</template>
