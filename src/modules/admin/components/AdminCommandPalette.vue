<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import { useAuthStore } from '@/stores/AuthStore'
import { ADMIN_NAV } from '@/layouts/adminNavigation'

// لوحة أوامر (⌘K / Ctrl+K) — قفز سريع لوجهات الكونسول المصرّح بها.
const router = useRouter()
const { t } = useI18n()
const auth = useAuthStore()

const open = ref(false)
const q = ref('')
const active = ref(0)
const inputEl = ref<HTMLInputElement>()

const commands = computed(() =>
  ADMIN_NAV.flatMap(g => g.items)
    .filter(it => !it.permission || auth.hasPermission(it.permission))
    .map(it => ({ label: t(it.title), icon: it.icon, to: it.to })),
)
const filtered = computed(() => {
  const s = q.value.trim().toLowerCase()
  return s ? commands.value.filter(c => c.label.toLowerCase().includes(s)) : commands.value
})

function openPalette() {
  open.value = true
  q.value = ''
  active.value = 0
  nextTick(() => inputEl.value?.focus())
}
function close() {
  open.value = false
}
function run(to: string) {
  close()
  router.push({ name: to })
}

function onKey(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    open.value ? close() : openPalette()
    return
  }
  if (!open.value)
    return
  if (e.key === 'Escape')
    close()
  else if (e.key === 'ArrowDown') {
    e.preventDefault()
    active.value = filtered.value.length ? (active.value + 1) % filtered.value.length : 0
  }
  else if (e.key === 'ArrowUp') {
    e.preventDefault()
    active.value = filtered.value.length ? (active.value - 1 + filtered.value.length) % filtered.value.length : 0
  }
  else if (e.key === 'Enter') {
    const c = filtered.value[active.value]
    if (c)
      run(c.to)
  }
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
defineExpose({ open: openPalette })
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="cmd-overlay" @click.self="close">
      <div class="cmd-panel" role="dialog" aria-modal="true">
        <div class="flex items-center gap-2 border-b border-ui px-4 py-3">
          <BaseIcon name="mdi-magnify" :size="20" class="text-muted" />
          <input
            ref="inputEl"
            v-model="q"
            class="w-full bg-transparent text-content outline-none placeholder:text-muted"
            :placeholder="t('admin.commandPlaceholder')"
            @input="active = 0"
          >
          <kbd class="cmd-kbd">ESC</kbd>
        </div>
        <ul class="max-h-80 overflow-y-auto py-1">
          <li
            v-for="(c, i) in filtered"
            :key="c.to"
            class="cmd-item"
            :class="{ 'cmd-active': i === active }"
            @mouseenter="active = i"
            @click="run(c.to)"
          >
            <BaseIcon :name="c.icon" :size="18" class="text-muted" />
            <span class="flex-1 text-content">{{ c.label }}</span>
            <BaseIcon v-if="i === active" name="mdi-keyboard-return" :size="15" class="text-muted" />
          </li>
          <li v-if="!filtered.length" class="px-4 py-6 text-center text-sm text-muted">
            {{ t('admin.noResults') }}
          </li>
        </ul>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.cmd-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 12vh;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(2px);
}
.cmd-panel {
  width: min(92vw, 560px);
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 14px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  animation: cmd-in 0.14s ease;
}
@keyframes cmd-in {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}
.cmd-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 16px;
  cursor: pointer;
  font-size: 0.9rem;
}
.cmd-active {
  background: rgba(var(--v-theme-primary), 0.1);
}
.cmd-kbd {
  font-size: 0.65rem;
  padding: 2px 6px;
  border-radius: 5px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.2);
}
@media (prefers-reduced-motion: reduce) {
  .cmd-panel { animation: none; }
}
</style>
