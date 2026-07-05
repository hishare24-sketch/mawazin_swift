<script setup lang="ts">
import { computed } from 'vue'
import type { AnswerValue, SurveyQuestion } from '@/stores/SurveysStore'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseCheckbox from '@/components/ui/BaseCheckbox.vue'
import BaseRating from '@/components/ui/BaseRating.vue'
import BaseChip from '@/components/ui/BaseChip.vue'

const props = defineProps<{
  question: SurveyQuestion
  modelValue: AnswerValue | undefined
}>()
const emit = defineEmits<{ (e: 'update:modelValue', v: AnswerValue): void }>()

const val = computed({
  get: () => props.modelValue,
  set: (v: AnswerValue) => emit('update:modelValue', v),
})

const dropdownItems = computed(() => (props.question.options ?? []).map(o => ({ value: o, title: o })))

// matrix: value is Record<row, 1..5>
function matrixValue(row: string): number {
  return (props.modelValue as Record<string, number> | undefined)?.[row] ?? 0
}
function setMatrix(row: string, v: number) {
  emit('update:modelValue', { ...(props.modelValue as Record<string, number> ?? {}), [row]: v })
}

// ranking: value is string[] (current order)
const rankingOrder = computed<string[]>(() =>
  (props.modelValue as string[] | undefined) ?? [...(props.question.options ?? [])],
)
function move(idx: number, dir: -1 | 1) {
  const arr = [...rankingOrder.value]
  const target = idx + dir
  if (target < 0 || target >= arr.length)
    return
  ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
  emit('update:modelValue', arr)
}

const NPS = Array.from({ length: 11 }, (_, i) => i)
const SCALE = Array.from({ length: 10 }, (_, i) => i + 1)
function npsColor(n: number): string {
  return n <= 6 ? 'error' : n <= 8 ? 'warning' : 'success'
}
// نغمة زرّ الرقم المختار (NPS/scale) — صلب بلون دلالي
function numStyle(active: boolean, color: string) {
  if (active)
    return { background: `rgb(var(--v-theme-${color}))`, color: `rgb(var(--v-theme-on-${color}))`, borderColor: 'transparent' }
  return { borderColor: 'rgba(var(--v-theme-on-surface), 0.2)', color: 'rgb(var(--v-theme-on-surface))' }
}
</script>

<template>
  <div>
    <!-- single -->
    <div v-if="question.type === 'single'" class="flex flex-col gap-2">
      <button
        v-for="opt in question.options"
        :key="opt"
        type="button"
        class="flex w-full items-center gap-3 rounded-ui border p-2.5 text-start transition"
        :class="val === opt ? 'border-transparent bg-brand text-on-brand' : 'border-ui'"
        @click="val = opt"
      >
        <BaseIcon :name="val === opt ? 'mdi-radiobox-marked' : 'mdi-radiobox-blank'" :size="20" />
        <span>{{ opt }}</span>
      </button>
    </div>

    <!-- multiple -->
    <div v-else-if="question.type === 'multiple'" class="flex flex-col">
      <BaseCheckbox
        v-for="opt in question.options"
        :key="opt"
        :model-value="(val as string[] | undefined) ?? []"
        :value="opt"
        :label="opt"
        @update:model-value="v => (val = v as string[])"
      />
    </div>

    <!-- dropdown -->
    <BaseSelect v-else-if="question.type === 'dropdown'" :model-value="val as string" :items="dropdownItems" placeholder="اختر" @update:model-value="v => v != null && (val = v)" />

    <!-- text -->
    <BaseInput v-else-if="question.type === 'text'" :model-value="val as string" placeholder="اكتب إجابتك…" @update:model-value="v => (val = String(v))" />

    <!-- longtext -->
    <BaseTextarea v-else-if="question.type === 'longtext'" :model-value="val as string" placeholder="اكتب إجابتك بالتفصيل…" :rows="3" @update:model-value="v => (val = v)" />

    <!-- rating -->
    <div v-else-if="question.type === 'rating'" class="py-2 text-center">
      <BaseRating :model-value="Number(val) || 0" color="warning" :size="42" @update:model-value="v => (val = Number(v))" />
    </div>

    <!-- nps -->
    <div v-else-if="question.type === 'nps'">
      <div class="flex flex-wrap justify-center gap-1 py-2">
        <button
          v-for="n in NPS"
          :key="n"
          type="button"
          class="h-10 w-10 rounded-ui border text-sm font-medium transition"
          :style="numStyle(Number(val) === n, npsColor(n))"
          @click="val = n"
        >{{ n }}</button>
      </div>
      <div class="flex justify-between px-1 text-xs text-muted">
        <span>غير محتمل إطلاقًا</span>
        <span>محتمل جدًا</span>
      </div>
    </div>

    <!-- scale -->
    <div v-else-if="question.type === 'scale'">
      <div class="flex flex-wrap justify-center gap-1 py-2">
        <button
          v-for="n in SCALE"
          :key="n"
          type="button"
          class="h-9 w-9 rounded-ui border text-sm font-medium transition"
          :style="numStyle(Number(val) === n, 'primary')"
          @click="val = n"
        >{{ n }}</button>
      </div>
      <div class="flex justify-between px-1 text-xs text-muted">
        <span>{{ question.scaleMin || 'ضعيف' }}</span>
        <span>{{ question.scaleMax || 'ممتاز' }}</span>
      </div>
    </div>

    <!-- matrix -->
    <div v-else-if="question.type === 'matrix'">
      <div v-for="row in question.rows" :key="row" class="flex flex-wrap items-center justify-between gap-2 py-2">
        <span class="text-sm text-content">{{ row }}</span>
        <BaseRating :model-value="matrixValue(row)" color="warning" :size="26" @update:model-value="v => setMatrix(row, Number(v))" />
      </div>
    </div>

    <!-- ranking -->
    <div v-else-if="question.type === 'ranking'">
      <p class="mb-2 text-xs text-muted">رتّب من الأهم (أعلى) إلى الأقل أهمية</p>
      <div v-for="(opt, i) in rankingOrder" :key="opt" class="ranking-row mb-1 flex items-center gap-2 rounded-ui p-2">
        <BaseChip color="brand">{{ i + 1 }}</BaseChip>
        <span class="flex-1 text-sm text-content">{{ opt }}</span>
        <button class="icon-btn h-8 w-8 disabled:opacity-40" :disabled="i === 0" aria-label="لأعلى" @click="move(i, -1)"><BaseIcon name="mdi-chevron-up" :size="18" /></button>
        <button class="icon-btn h-8 w-8 disabled:opacity-40" :disabled="i === rankingOrder.length - 1" aria-label="لأسفل" @click="move(i, 1)"><BaseIcon name="mdi-chevron-down" :size="18" /></button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ranking-row {
  background: rgba(var(--v-theme-primary), 0.06);
}
</style>
