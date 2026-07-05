<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'

// اختيار متعدّد قابل للبحث يحاكي VAutocomplete (multiple + chips). الرقائق المختارة
// أعلى الحقل قابلة للإزالة، والقائمة المفلترة تُبدّل الاختيار بنقرة. الإغلاق عبر طبقة
// backdrop (كنمط BaseDropdown/بحث الإعدادات) لتفادي هشاشة مُصغيات pointerdown.
const props = withDefaults(defineProps<{
  modelValue: string[]
  options: string[]
  placeholder?: string
}>(), { placeholder: 'ابحث…' })
const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>()

const query = ref('')
const open = ref(false)

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return props.options
    .filter(o => !q || o.toLowerCase().includes(q))
    .slice(0, 50)
})

function toggle(opt: string) {
  const set = new Set(props.modelValue)
  set.has(opt) ? set.delete(opt) : set.add(opt)
  emit('update:modelValue', [...set])
}
function remove(opt: string) {
  emit('update:modelValue', props.modelValue.filter(o => o !== opt))
}
function clearAll() {
  emit('update:modelValue', [])
  query.value = ''
}
</script>

<template>
  <div class="relative">
    <!-- selected chips + search field -->
    <div class="input-wrap rounded-ui flex flex-wrap items-center gap-1 bg-surface px-2 py-1.5">
      <span
        v-for="opt in modelValue"
        :key="opt"
        class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
        style="background: rgba(var(--v-theme-secondary), 0.16); color: rgb(var(--v-theme-secondary))"
      >
        {{ opt }}
        <button type="button" class="leading-none" aria-label="إزالة" @click.stop="remove(opt)">
          <BaseIcon name="mdi-close" :size="13" />
        </button>
      </span>
      <input
        v-model="query"
        :placeholder="modelValue.length ? '' : placeholder"
        class="h-7 min-w-[6rem] flex-1 bg-transparent text-sm text-content outline-none placeholder:text-muted"
        @focus="open = true"
      >
      <button v-if="modelValue.length" type="button" class="text-muted" aria-label="مسح الكل" @click.stop="clearAll">
        <BaseIcon name="mdi-close-circle" :size="16" />
      </button>
    </div>

    <!-- options panel -->
    <template v-if="open">
      <div class="fixed inset-0 z-40" @click="open = false" />
      <div class="dd-panel absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-ui border-ui bg-surface py-1 shadow-lg">
        <button
          v-for="opt in filtered"
          :key="opt"
          type="button"
          class="menu-row justify-between"
          @click="toggle(opt)"
        >
          <span class="truncate">{{ opt }}</span>
          <BaseIcon v-if="modelValue.includes(opt)" name="mdi-check" :size="16" class="shrink-0 text-brand" />
        </button>
        <div v-if="!filtered.length" class="px-4 py-2 text-sm text-muted">لا نتائج</div>
      </div>
    </template>
  </div>
</template>
