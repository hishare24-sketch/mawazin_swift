<script setup lang="ts">
import { computed, onMounted } from 'vue'
import type { AssessmentQuestion } from '../services/mockAssessments'

const props = defineProps<{ question: AssessmentQuestion }>()
// answer shape varies by type: number | string | number[] | Record<number,number>
const answer = defineModel<any>()

// — reorder helpers (sequencing / rank) —
function ensureOrder() {
  if ((props.question.type === 'sequencing' || props.question.type === 'rank') && !Array.isArray(answer.value)) {
    const n = props.question.items?.length ?? 0
    // start reversed so the user has to actually reorder
    answer.value = Array.from({ length: n }, (_, i) => n - 1 - i)
  }
  if (props.question.type === 'matching' && (typeof answer.value !== 'object' || answer.value == null))
    answer.value = {}
}
onMounted(ensureOrder)

function moveUp(pos: number) {
  if (pos <= 0)
    return
  const arr = [...(answer.value as number[])]
  ;[arr[pos - 1], arr[pos]] = [arr[pos], arr[pos - 1]]
  answer.value = arr
}
function moveDown(pos: number) {
  const arr = [...(answer.value as number[])]
  if (pos >= arr.length - 1)
    return
  ;[arr[pos + 1], arr[pos]] = [arr[pos], arr[pos + 1]]
  answer.value = arr
}

// — matching: shuffled right options carrying their original pair index —
const rightOptions = computed(() =>
  (props.question.pairs ?? [])
    .map((p, i) => ({ title: p.right, value: i }))
    .slice()
    .reverse(),
)
function setMatch(leftIndex: number, val: number) {
  answer.value = { ...(answer.value as Record<number, number>), [leftIndex]: val }
}

// — file / recording UI state via the answer string —
function onFile(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f)
    answer.value = `[ملف: ${f.name}] ${typeof answer.value === 'string' ? answer.value : ''}`
}
</script>

<template>
  <div>
    <!-- MCQ / True-False -->
    <div v-if="question.type === 'mcq' || question.type === 'truefalse'" class="d-flex flex-column ga-3">
      <VCard
        v-for="(opt, i) in question.options"
        :key="i"
        :variant="answer === i ? 'flat' : 'outlined'"
        :color="answer === i ? 'primary' : undefined"
        class="pa-3 cursor-pointer d-flex align-center ga-3"
        @click="answer = i"
      >
        <VIcon :icon="answer === i ? 'mdi-radiobox-marked' : 'mdi-radiobox-blank'" :color="answer === i ? 'white' : 'medium-emphasis'" />
        <span :class="answer === i ? 'text-white' : ''">{{ opt }}</span>
      </VCard>
      <VTextarea
        v-if="question.type === 'truefalse'"
        :model-value="typeof answer === 'object' ? '' : undefined"
        placeholder="برّر إجابتك باختصار (اختياري)"
        rows="2"
        auto-grow
        variant="outlined"
        class="mt-1"
      />
    </div>

    <!-- Open analytical / mind-map / recording / file upload / image analysis all end with a textarea -->
    <div v-else-if="['open', 'mindmap', 'recording', 'fileupload', 'imageanalysis'].includes(question.type)">
      <!-- Image analysis: mock chart -->
      <VCard v-if="question.type === 'imageanalysis'" variant="tonal" color="info" class="pa-4 mb-3 text-center">
        <div class="text-caption text-medium-emphasis mb-2">{{ question.imageLabel }}</div>
        <svg viewBox="0 0 300 90" width="100%" height="90">
          <polyline points="10,20 60,30 110,25 160,45 210,60 260,75" fill="none" stroke="rgb(var(--v-theme-info))" stroke-width="3" />
          <circle v-for="(p, i) in [[10,20],[60,30],[110,25],[160,45],[210,60],[260,75]]" :key="i" :cx="p[0]" :cy="p[1]" r="3" fill="rgb(var(--v-theme-info))" />
        </svg>
      </VCard>

      <!-- File upload -->
      <VBtn v-if="question.type === 'fileupload'" color="secondary" variant="tonal" prepend-icon="mdi-upload" class="mb-3">
        رفع ملف للتحليل
        <input type="file" class="file-overlay" @change="onFile">
      </VBtn>

      <!-- Recording (simulated) -->
      <VAlert v-if="question.type === 'recording'" type="info" variant="tonal" density="compact" class="mb-3 text-caption">
        <VIcon icon="mdi-microphone-outline" size="16" /> يُحاكى التسجيل الصوتي — دوّن ما ستقوله في المربّع.
      </VAlert>

      <VTextarea
        v-model="answer"
        :placeholder="question.placeholder ?? 'اكتب إجابتك...'"
        rows="5"
        auto-grow
        variant="outlined"
      />
      <div v-if="question.type === 'mindmap'" class="text-caption text-medium-emphasis mt-1">
        <VIcon icon="mdi-sitemap-outline" size="14" /> اكتب كل عقدة في سطر لتشكيل خريطتك الذهنية.
      </div>
    </div>

    <!-- Sequencing / Rank -->
    <div v-else-if="question.type === 'sequencing' || question.type === 'rank'" class="d-flex flex-column ga-2">
      <VCard
        v-for="(itemIndex, pos) in (answer as number[]) ?? []"
        :key="itemIndex"
        variant="outlined"
        class="pa-2 d-flex align-center ga-2"
      >
        <VChip size="small" :color="question.type === 'rank' ? 'accent' : 'primary'" label>{{ pos + 1 }}</VChip>
        <span class="flex-grow-1">{{ question.items?.[itemIndex] }}</span>
        <VBtn icon="mdi-chevron-up" variant="text" size="x-small" :disabled="pos === 0" @click="moveUp(pos)" />
        <VBtn icon="mdi-chevron-down" variant="text" size="x-small" :disabled="pos === ((answer as number[])?.length ?? 0) - 1" @click="moveDown(pos)" />
      </VCard>
    </div>

    <!-- Matching -->
    <div v-else-if="question.type === 'matching'" class="d-flex flex-column ga-2">
      <div v-for="(pair, i) in question.pairs" :key="i" class="d-flex align-center ga-3">
        <VChip color="primary" variant="tonal" label class="flex-grow-0" style="min-width: 110px; justify-content: center">{{ pair.left }}</VChip>
        <VIcon icon="mdi-arrow-left-thin" color="medium-emphasis" />
        <VSelect
          :model-value="(answer as Record<number, number>)?.[i]"
          :items="rightOptions"
          placeholder="اختر المطابق"
          density="compact"
          hide-details
          class="flex-grow-1"
          @update:model-value="setMatch(i, $event)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.file-overlay {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}
</style>
