<script setup lang="ts" generic="T extends Record<string, any>">
import { computed } from 'vue'
import BaseTable from '@/components/ui/BaseTable.vue'
import type { TableColumn } from '@/components/ui/BaseTable.vue'
import BasePagination from '@/components/ui/BasePagination.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import type { PageMeta } from '@/services/api'

export interface FilterDef {
  key: string
  label: string
  options: { value: string, label: string }[]
}

const props = withDefaults(defineProps<{
  columns: TableColumn[]
  items: T[]
  loading?: boolean
  meta?: PageMeta | null
  sortKey?: string
  selected?: (string | number)[]
  search?: string
  filters?: FilterDef[]
  activeFilters?: Record<string, string>
  selectable?: boolean
  rowKey?: (row: T) => string | number
  noun?: string
  searchPlaceholder?: string
}>(), {
  loading: false,
  meta: null,
  sortKey: '',
  selected: () => [],
  search: '',
  filters: () => [],
  activeFilters: () => ({}),
  selectable: false,
})

const emit = defineEmits<{
  'update:sortKey': [v: string]
  'update:selected': [v: (string | number)[]]
  'update:search': [v: string]
  'filter': [key: string, value: string | undefined]
  'update:page': [n: number]
  'update:perPage': [n: number]
}>()

const hasSelection = computed(() => props.selectable && props.selected.length > 0)

function filterItems(f: FilterDef) {
  return [{ value: '', title: 'الكل' }, ...f.options.map(o => ({ value: o.value, title: o.label }))]
}
</script>

<template>
  <div class="space-y-3">
    <!-- شريط الأدوات: بحث + فلاتر + إضافات -->
    <div class="flex flex-wrap items-center gap-2">
      <div class="min-w-[220px] flex-1">
        <BaseInput
          :model-value="search"
          :placeholder="searchPlaceholder ?? 'بحث...'"
          prefix-icon="mdi-magnify"
          @update:model-value="v => emit('update:search', String(v ?? ''))"
        />
      </div>
      <BaseSelect
        v-for="f in filters"
        :key="f.key"
        :model-value="activeFilters[f.key] ?? ''"
        :items="filterItems(f)"
        :placeholder="f.label"
        class="min-w-[150px]"
        @update:model-value="v => emit('filter', f.key, (v as string) || undefined)"
      />
      <slot name="toolbar" />
    </div>

    <!-- شريط الإجراءات الجماعيّة -->
    <div
      v-if="hasSelection"
      class="flex flex-wrap items-center gap-2 rounded-ui border-ui bg-brand/[0.06] px-3 py-2"
    >
      <BaseIcon name="mdi-checkbox-multiple-marked-outline" :size="18" class="text-brand" />
      <span class="text-sm font-bold text-content">{{ selected.length }} مُختار</span>
      <span class="flex-1" />
      <slot name="bulk" :selected="selected" :clear="() => emit('update:selected', [])" />
      <BaseButton size="sm" variant="ghost" @click="emit('update:selected', [])">
        <BaseIcon name="mdi-close" :size="16" />إلغاء التحديد
      </BaseButton>
    </div>

    <!-- الجدول (يمرّر كل السلوتّات: cell-* / actions / empty) -->
    <BaseTable
      :columns="columns"
      :rows="items"
      :loading="loading"
      :selectable="selectable"
      :row-key="rowKey"
      :sort-key="sortKey"
      :selected="selected"
      @update:sort-key="v => emit('update:sortKey', v)"
      @update:selected="v => emit('update:selected', v)"
    >
      <template v-for="(_, name) in $slots" :key="name" #[name]="slotProps">
        <slot :name="name" v-bind="slotProps ?? {}" />
      </template>
    </BaseTable>

    <!-- الترقيم -->
    <BasePagination
      v-if="meta && meta.last_page > 1"
      :page="meta.current_page"
      :last-page="meta.last_page"
      :total="meta.total"
      :per-page="meta.itemPerPage"
      @update:page="n => emit('update:page', n)"
      @update:per-page="n => emit('update:perPage', n)"
    />
  </div>
</template>
