<script setup lang="ts">
import { computed } from 'vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'

// ترقيم مُتحكَّم به — يقابل meta الخادميّ ({current_page, last_page, total}).
const props = withDefaults(defineProps<{
  page: number
  lastPage: number
  total?: number
  perPage?: number
  perPageOptions?: number[]
}>(), {
  total: 0,
  perPage: 15,
  perPageOptions: () => [15, 25, 50, 100],
})

const emit = defineEmits<{ 'update:page': [n: number], 'update:perPage': [n: number] }>()

// أرقام صفحات مضغوطة مع «…» حول الحاليّة
const pages = computed<(number | '…')[]>(() => {
  const { page, lastPage } = props
  if (lastPage <= 7)
    return Array.from({ length: lastPage }, (_, i) => i + 1)
  const out: (number | '…')[] = [1]
  const from = Math.max(2, page - 1)
  const to = Math.min(lastPage - 1, page + 1)
  if (from > 2)
    out.push('…')
  for (let i = from; i <= to; i++) out.push(i)
  if (to < lastPage - 1)
    out.push('…')
  out.push(lastPage)
  return out
})

function go(n: number) {
  if (n >= 1 && n <= props.lastPage && n !== props.page)
    emit('update:page', n)
}

const rangeStart = computed(() => (props.total ? (props.page - 1) * props.perPage + 1 : 0))
const rangeEnd = computed(() => Math.min(props.page * props.perPage, props.total))
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-3 py-1 text-sm">
    <div class="flex items-center gap-2 text-muted">
      <span v-if="total">{{ rangeStart }}–{{ rangeEnd }} من {{ total }}</span>
      <select
        class="rounded-ui border-ui bg-surface px-2 py-1 text-xs text-content"
        :value="perPage"
        aria-label="عدد الصفوف"
        @change="emit('update:perPage', Number(($event.target as HTMLSelectElement).value))"
      >
        <option v-for="o in perPageOptions" :key="o" :value="o">{{ o }} / صفحة</option>
      </select>
    </div>

    <nav class="flex items-center gap-1" aria-label="ترقيم الصفحات">
      <button class="pg-btn" :disabled="page <= 1" aria-label="السابق" @click="go(page - 1)">
        <BaseIcon name="mdi-chevron-right" :size="18" class="rtl:hidden" />
        <BaseIcon name="mdi-chevron-left" :size="18" class="ltr:hidden" />
      </button>
      <template v-for="(p, i) in pages" :key="i">
        <span v-if="p === '…'" class="px-1 text-muted">…</span>
        <button
          v-else
          class="pg-btn"
          :class="{ 'pg-active': p === page }"
          :aria-current="p === page ? 'page' : undefined"
          @click="go(p)"
        >{{ p }}</button>
      </template>
      <button class="pg-btn" :disabled="page >= lastPage" aria-label="التالي" @click="go(page + 1)">
        <BaseIcon name="mdi-chevron-left" :size="18" class="rtl:hidden" />
        <BaseIcon name="mdi-chevron-right" :size="18" class="ltr:hidden" />
      </button>
    </nav>
  </div>
</template>

<style scoped>
.pg-btn {
  min-width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 8px;
  border-radius: 8px;
  font-size: 0.8125rem;
  color: rgb(var(--v-theme-on-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  background: rgb(var(--v-theme-surface));
  transition: background-color 0.15s ease, border-color 0.15s ease;
}
.pg-btn:hover:not(:disabled) {
  background: rgba(var(--v-theme-primary), 0.08);
}
.pg-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.pg-active {
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  border-color: transparent;
  font-weight: 700;
}
</style>
