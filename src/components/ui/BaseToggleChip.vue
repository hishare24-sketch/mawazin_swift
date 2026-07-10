<script setup lang="ts">
import { computed } from 'vue'

// رقاقة-زرّ قابلة للتبديل — نغمة صلبة (نشط) أو حدّ خافت (غير نشط) بلون ثيم Vuetify.
// توحّد النمط المتكرّر (الحالة المهنية / نقاط القوة / المهارات / الثيم المخصّص).
const props = withDefaults(defineProps<{
  active?: boolean
  /** اسم لون ثيم Vuetify: primary / accent / success / warning ... */
  color?: string
  disabled?: boolean
}>(), { active: false, color: 'primary', disabled: false })

defineEmits<{ toggle: [] }>()

const chipStyle = computed(() => props.active
  ? {
      background: `rgb(var(--v-theme-${props.color}))`,
      color: `rgb(var(--v-theme-on-${props.color}))`,
      borderColor: 'transparent',
    }
  : {
      background: 'transparent',
      color: 'rgba(var(--v-theme-on-surface), 0.75)',
      borderColor: 'rgba(var(--v-theme-on-surface), 0.2)',
    })
</script>

<template>
  <button
    type="button"
    class="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
    :style="chipStyle"
    :aria-pressed="active"
    :disabled="disabled"
    @click="$emit('toggle')"
  >
    <slot />
  </button>
</template>
