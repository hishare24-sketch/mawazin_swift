<script setup lang="ts" generic="T extends string | number">
import BaseIcon from '@/components/ui/BaseIcon.vue'

// تبويبات أساس بوصول صحيح (role=tablist/tab + aria-selected).
defineProps<{
  modelValue: T
  tabs: { value: T, label: string, icon?: string, badge?: string | number }[]
}>()
const emit = defineEmits<{ 'update:modelValue': [value: T] }>()
</script>

<template>
  <div class="flex flex-wrap gap-1 border-b border-ui" role="tablist">
    <button
      v-for="t in tabs"
      :key="t.value"
      type="button"
      role="tab"
      :aria-selected="modelValue === t.value"
      class="tab-btn"
      :class="{ 'tab-active': modelValue === t.value }"
      @click="emit('update:modelValue', t.value)"
    >
      <BaseIcon v-if="t.icon" :name="t.icon" :size="17" />
      {{ t.label }}
      <span
        v-if="t.badge !== undefined && t.badge !== ''"
        class="ms-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold"
        style="background: rgba(var(--v-theme-primary), 0.16); color: rgb(var(--v-theme-primary))"
      >{{ t.badge }}</span>
    </button>
  </div>
</template>

<style scoped>
.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.7);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color 0.15s ease, border-color 0.15s ease;
}
.tab-btn:hover {
  color: rgb(var(--v-theme-on-surface));
}
.tab-active {
  color: rgb(var(--v-theme-primary));
  border-bottom-color: rgb(var(--v-theme-primary));
}
</style>
