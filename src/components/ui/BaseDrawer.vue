<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'

// درج أساس مُنقول لـ <body>، يُغلق بالخلفية أو Escape. اتجاهان:
// - end: درج جانبيّ (يمين في LTR / يسار في RTL) بعرض width.
// - bottom: شيت سفليّ عريض (نمط الموبايل المتعارف عليه) بحدّ أقصى للارتفاع.
const props = withDefaults(defineProps<{
  modelValue: boolean
  width?: number
  side?: 'end' | 'bottom'
}>(), { width: 330, side: 'end' })
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

function close() {
  emit('update:modelValue', false)
}
function onKey(e: KeyboardEvent) {
  if (props.modelValue && e.key === 'Escape')
    close()
}
onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <!-- backdrop: حاضر دائمًا مع خفوت (opacity) — تنعيم بلا v-if يتعلّق -->
    <div
      class="fixed inset-0 z-[90] bg-black/50 transition-opacity duration-200"
      :class="modelValue ? 'opacity-100' : 'pointer-events-none opacity-0'"
      @click="close"
    />
    <!-- panel: سفليّ (شيت) أو جانبيّ (درج) -->
    <div
      v-if="side === 'bottom'"
      class="fixed inset-x-0 bottom-0 z-[95] flex max-h-[88vh] flex-col overflow-y-auto rounded-t-2xl border-t border-ui bg-surface text-content shadow-2xl shadow-black/40 transition-transform duration-200"
      :class="modelValue ? 'translate-y-0' : 'translate-y-full'"
    >
      <slot />
    </div>
    <div
      v-else
      class="fixed inset-y-0 end-0 z-[95] flex flex-col overflow-y-auto border-ui bg-surface text-content shadow-2xl shadow-black/40 transition-transform duration-200"
      :class="modelValue ? 'translate-x-0' : 'rtl:-translate-x-full ltr:translate-x-full'"
      :style="{ width: `${width}px` }"
    >
      <slot />
    </div>
  </Teleport>
</template>
