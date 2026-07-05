<script setup lang="ts">
import { computed } from 'vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'

// تقييم نجمي أساس يحاكي VRating — صفّ نجوم قابلة للنقر (1..max)، لون دلالي من الثيم.
// في وضع العرض (readonly) يدعم أنصاف النجوم (half-increments) لعرض المتوسّطات.
const props = withDefaults(defineProps<{
  modelValue?: number
  max?: number
  size?: number
  color?: string // رمز ثيم Vuetify
  readonly?: boolean
}>(), { modelValue: 0, max: 5, size: 26, color: 'accent', readonly: false })
const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

const stars = computed(() => Array.from({ length: props.max }, (_, i) => i + 1))

// أيقونة كل نجمة: ممتلئة/نصف/فارغة (النصف في وضع العرض فقط)
function iconFor(n: number) {
  if (n <= props.modelValue)
    return 'mdi-star'
  if (props.readonly && n - props.modelValue <= 0.5)
    return 'mdi-star-half-full'
  return 'mdi-star-outline'
}
function isFilled(n: number) {
  return n <= props.modelValue || (props.readonly && n - props.modelValue <= 0.5)
}

function set(v: number) {
  if (!props.readonly)
    emit('update:modelValue', v)
}
</script>

<template>
  <div class="inline-flex items-center gap-0.5">
    <button
      v-for="n in stars"
      :key="n"
      type="button"
      :disabled="readonly"
      class="leading-none transition"
      :class="readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'"
      :aria-label="`${n}`"
      @click="set(n)"
    >
      <BaseIcon
        :name="iconFor(n)"
        :size="size"
        :style="{ color: isFilled(n) ? `rgb(var(--v-theme-${color}))` : 'rgba(var(--v-theme-on-surface), 0.3)' }"
      />
    </button>
  </div>
</template>
