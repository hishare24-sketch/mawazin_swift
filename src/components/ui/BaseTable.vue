<script setup lang="ts" generic="T extends Record<string, any>">
import { computed } from 'vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'

// ===== جدول أدمن احترافيّ — مُتحكَّم به (الفرز/الاختيار خارجيّان ليتكامل مع الترقيم الخادميّ) =====
export interface TableColumn {
  key: string
  label: string
  sortable?: boolean
  align?: 'start' | 'center' | 'end'
  width?: string
}

const props = withDefaults(defineProps<{
  columns: TableColumn[]
  rows: T[]
  rowKey?: (row: T) => string | number
  /** مفتاح الفرز الحاليّ بنمط "-field" (تنازليّ) أو "field" (تصاعديّ) */
  sortKey?: string
  selectable?: boolean
  /** مفاتيح الصفوف المختارة (v-model:selected) */
  selected?: (string | number)[]
  loading?: boolean
  emptyText?: string
  actionsLabel?: string
  density?: 'comfortable' | 'compact'
}>(), {
  rowKey: undefined,
  sortKey: '',
  selectable: false,
  selected: () => [],
  loading: false,
  density: 'comfortable',
})

const emit = defineEmits<{
  'update:sortKey': [value: string]
  'update:selected': [value: (string | number)[]]
  'rowClick': [row: T]
}>()

function keyOf(row: T, i: number): string | number {
  return props.rowKey ? props.rowKey(row) : (row.id ?? i)
}

const allKeys = computed(() => props.rows.map((r, i) => keyOf(r, i)))
const allSelected = computed(() => allKeys.value.length > 0 && allKeys.value.every(k => props.selected.includes(k)))
const someSelected = computed(() => props.selected.length > 0 && !allSelected.value)

function toggleAll() {
  emit('update:selected', allSelected.value ? [] : [...allKeys.value])
}
function toggleRow(k: string | number) {
  emit('update:selected', props.selected.includes(k) ? props.selected.filter(x => x !== k) : [...props.selected, k])
}

// الفرز: النقر على عمود قابل للفرز يقلب asc/desc/asc على نفس المفتاح
function sortDir(key: string): 'asc' | 'desc' | null {
  if (props.sortKey === key)
    return 'asc'
  if (props.sortKey === `-${key}`)
    return 'desc'
  return null
}
function onSort(col: TableColumn) {
  if (!col.sortable)
    return
  const dir = sortDir(col.key)
  emit('update:sortKey', dir === 'asc' ? `-${col.key}` : col.key)
}

const rowPad = computed(() => (props.density === 'compact' ? 'px-3 py-2' : 'px-3.5 py-3'))
function alignClass(a?: string) {
  return a === 'end' ? 'text-end' : a === 'center' ? 'text-center' : 'text-start'
}
</script>

<template>
  <div class="overflow-x-auto rounded-ui-lg border-ui bg-surface">
    <table class="w-full min-w-[640px] border-collapse text-sm">
      <thead>
        <tr class="border-b border-ui bg-surfalt">
          <th v-if="selectable" class="w-10 px-3.5 py-2.5">
            <input
              type="checkbox"
              class="tbl-check"
              :checked="allSelected"
              :indeterminate="someSelected"
              aria-label="تحديد الكل"
              @change="toggleAll"
            >
          </th>
          <th
            v-for="col in columns"
            :key="col.key"
            :style="col.width ? { width: col.width } : undefined"
            class="px-3.5 py-2.5 text-xs font-bold uppercase tracking-wide text-muted"
            :class="[alignClass(col.align), col.sortable ? 'cursor-pointer select-none hover:text-content' : '']"
            :aria-sort="sortDir(col.key) === 'asc' ? 'ascending' : sortDir(col.key) === 'desc' ? 'descending' : 'none'"
            @click="onSort(col)"
          >
            <span class="inline-flex items-center gap-1">
              {{ col.label }}
              <BaseIcon
                v-if="col.sortable"
                :name="sortDir(col.key) === 'asc' ? 'mdi-arrow-up' : sortDir(col.key) === 'desc' ? 'mdi-arrow-down' : 'mdi-unfold-more-horizontal'"
                :size="14"
                :class="sortDir(col.key) ? 'text-brand' : 'opacity-50'"
              />
            </span>
          </th>
          <th v-if="$slots.actions" class="w-px px-3.5 py-2.5 text-end text-xs font-bold uppercase tracking-wide text-muted">
            {{ actionsLabel }}
          </th>
        </tr>
      </thead>

      <tbody class="relative">
        <!-- تحميل (هيكل عظميّ) -->
        <template v-if="loading && !rows.length">
          <tr v-for="n in 6" :key="`sk-${n}`" class="border-b border-ui/60">
            <td v-if="selectable" :class="rowPad"><span class="skel h-4 w-4" /></td>
            <td v-for="col in columns" :key="col.key" :class="rowPad"><span class="skel h-4 w-24" /></td>
            <td v-if="$slots.actions" :class="rowPad"><span class="skel h-4 w-12" /></td>
          </tr>
        </template>

        <!-- صفوف -->
        <tr
          v-for="(row, i) in rows"
          :key="keyOf(row, i)"
          class="border-b border-ui/60 transition-colors last:border-0 hover:bg-surfalt/60"
          :class="{ 'bg-brand/[0.06]': selected.includes(keyOf(row, i)) }"
          @click="emit('rowClick', row)"
        >
          <td v-if="selectable" :class="rowPad" @click.stop>
            <input
              type="checkbox"
              class="tbl-check"
              :checked="selected.includes(keyOf(row, i))"
              :aria-label="`تحديد الصف ${i + 1}`"
              @change="toggleRow(keyOf(row, i))"
            >
          </td>
          <td
            v-for="col in columns"
            :key="col.key"
            :class="[rowPad, alignClass(col.align), 'text-content']"
          >
            <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]">
              {{ row[col.key] }}
            </slot>
          </td>
          <td v-if="$slots.actions" :class="[rowPad, 'text-end']" @click.stop>
            <slot name="actions" :row="row" />
          </td>
        </tr>

        <!-- فارغ -->
        <tr v-if="!loading && !rows.length">
          <td :colspan="columns.length + (selectable ? 1 : 0) + ($slots.actions ? 1 : 0)" class="px-4 py-12 text-center">
            <slot name="empty">
              <div class="flex flex-col items-center gap-2 text-muted">
                <BaseIcon name="mdi-table-off" :size="34" class="opacity-50" />
                <span class="text-sm">{{ emptyText ?? 'لا نتائج' }}</span>
              </div>
            </slot>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- طبقة تحميل فوق بيانات قائمة (إعادة جلب) -->
    <div v-if="loading && rows.length" class="pointer-events-none flex justify-center py-2">
      <BaseIcon name="mdi-loading" :size="20" class="animate-spin text-brand" />
    </div>
  </div>
</template>

<style scoped>
.tbl-check {
  width: 16px;
  height: 16px;
  accent-color: rgb(var(--v-theme-primary));
  cursor: pointer;
}
.skel {
  display: inline-block;
  border-radius: 4px;
  background: rgba(var(--v-theme-on-surface), 0.1);
  animation: pulse 1.2s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .skel { animation: none; }
}
</style>
