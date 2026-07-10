<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGlobalSearch } from '@/services/globalSearch'
import { useSectorContext } from '@/composables/useSectorContext'
import { ai } from '@/services/ai'
import type { SearchScope } from '@/services/ai/types'
import EmptyState from '@/components/shared/EmptyState.vue'
import PageHeader from '@/components/shared/PageHeader.vue'
import { useSearchPrefsStore } from '@/stores/SearchPrefsStore'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseAvatar from '@/components/ui/BaseAvatar.vue'

const route = useRoute()
const router = useRouter()
const { search } = useGlobalSearch()
const prefs = useSearchPrefsStore()
const sector = useSectorContext()

// «ضمن قطاعاتي» — تقييد اختياريّ (لا افتراضيّ: البحث عريض بطبعه). الترتيب الواعي
// بالقطاع يعمل دائمًا (يرفع نتائج قطاعاتي)، والشريحة تقيّد عند الطلب.
const onlyMine = ref(false)

type BaseColor = 'brand' | 'emerald' | 'accent' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
function mapColor(c?: string): BaseColor {
  return (({ primary: 'brand', secondary: 'emerald', 'medium-emphasis': 'neutral', 'surface-variant': 'neutral', grey: 'neutral', orange: 'warning', amber: 'warning' } as Record<string, BaseColor>)[c ?? ''] ?? c ?? 'brand') as BaseColor
}
function toggleStyle(active: boolean, color = 'primary') {
  if (active)
    return { background: `rgb(var(--v-theme-${color}))`, color: `rgb(var(--v-theme-on-${color}))`, borderColor: 'transparent' }
  return { background: 'transparent', color: 'rgba(var(--v-theme-on-surface), 0.75)', borderColor: 'rgba(var(--v-theme-on-surface), 0.2)' }
}

const query = ref((route.query.q as string) ?? '')
const activeScope = ref<SearchScope>((route.query.scope as SearchScope) || 'all')
const category = ref<string | undefined>((route.query.category as string) || undefined)

// Record every executed search so history adapts (even via direct navigation)
if (query.value)
  prefs.recordSearch(query.value)

watch(() => route.query, (q) => {
  query.value = (q.q as string) ?? ''
  activeScope.value = (q.scope as SearchScope) || 'all'
  category.value = (q.category as string) || undefined
  if (query.value)
    prefs.recordSearch(query.value)
})

const savedNow = computed(() => prefs.isSaved(query.value, activeScope.value))
function toggleSave() {
  if (savedNow.value) {
    const found = prefs.saved.find(s => s.q === query.value.trim() && s.scope === activeScope.value)
    if (found)
      prefs.removeSaved(found.id)
  }
  else {
    prefs.saveSearch(query.value, activeScope.value, category.value)
  }
}
function runSaved(s: { q: string, scope: SearchScope }) {
  router.push({ name: 'search', query: { q: s.q, scope: s.scope } })
}

const categories = computed(() => search(query.value, 'all', category.value, { onlyMine: onlyMine.value }))
const totalCount = computed(() => categories.value.reduce((s, c) => s + c.items.length, 0))
const intent = computed(() => ai.searchIntent(query.value))
const alternatives = computed(() => ai.keywordAlternatives(query.value))

// Tabs: "all" + each category that has items
const scopeTabs = computed(() => [
  { key: 'all' as SearchScope, label: 'الكل', icon: 'mdi-view-grid-outline', count: totalCount.value },
  ...categories.value.filter(c => c.items.length).map(c => ({ key: c.key, label: c.label, icon: c.icon, count: c.items.length })),
])

const shownCategories = computed(() =>
  activeScope.value === 'all'
    ? categories.value.filter(c => c.items.length)
    : categories.value.filter(c => c.key === activeScope.value),
)

function openItem(target: { name: string, params?: Record<string, string | number> } | null) {
  if (target)
    router.push(target)
}
function searchAlt(alt: string) {
  router.push({ name: 'search', query: { q: alt } })
}
</script>

<template>
  <div>
    <PageHeader
      title="اكتشف"
      subtitle="ابحث واستكشف عبر كل الأسواق معًا — فرص، طلبات، أشخاص، خبراء، ومقيّمون."
      icon="mdi-telescope"
    >
      <template #actions>
        <BaseButton
          v-if="query"
          size="sm"
          :variant="savedNow ? 'tonal-accent' : 'outline'"
          @click="toggleSave"
        >
          <BaseIcon :name="savedNow ? 'mdi-bookmark' : 'mdi-bookmark-outline'" :size="16" />{{ savedNow ? 'محفوظ' : 'حفظ البحث' }}
        </BaseButton>
      </template>
    </PageHeader>

    <!-- ① البحث البطل (عابر للأسواق) -->
    <div class="mb-4">
      <BaseInput v-model="query" prefix-icon="mdi-magnify" placeholder="ابحث في كل المنصّة: مسمّى، شخص، شركة، مهارة…">
        <template #suffix>
          <button v-if="query" type="button" class="text-muted" aria-label="مسح" @click="query = ''"><BaseIcon name="mdi-close" :size="18" /></button>
        </template>
      </BaseInput>
    </div>
    <p v-if="query" class="mb-3 text-sm text-muted">
      عن «{{ query }}» — {{ totalCount }} نتيجة
    </p>

    <!-- Saved searches (quick re-run) -->
    <div v-if="prefs.saved.length" class="mb-3 flex flex-wrap items-center gap-1">
      <span class="flex items-center gap-1 text-xs text-muted"><BaseIcon name="mdi-bookmark-multiple-outline" :size="14" /> محفوظة:</span>
      <span
        v-for="s in prefs.saved"
        :key="s.id"
        class="inline-flex items-center gap-1 rounded-full border border-ui px-2.5 py-1 text-sm font-medium text-content"
      >
        <button type="button" @click="runSaved(s)">{{ s.q }}</button>
        <button type="button" class="leading-none" aria-label="حذف" @click="prefs.removeSaved(s.id)"><BaseIcon name="mdi-close" :size="13" /></button>
      </span>
    </div>

    <!-- AI intent + alternatives -->
    <div v-if="query" class="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-ui border-s-4 p-3" style="background: rgba(var(--v-theme-secondary), 0.12); border-color: rgb(var(--v-theme-secondary))">
      <span class="flex items-center gap-2 text-sm text-content">
        <BaseIcon name="mdi-robot-happy-outline" :size="20" :style="{ color: 'rgb(var(--v-theme-secondary))' }" />{{ intent.note }}
      </span>
      <div v-if="alternatives.length" class="flex flex-wrap items-center gap-1">
        <span class="text-xs text-muted">هل تقصد:</span>
        <button v-for="alt in alternatives" :key="alt" type="button" class="btn-tonal-emerald rounded-full px-2.5 py-1 text-sm font-medium" @click="searchAlt(alt)">{{ alt }}</button>
      </div>
    </div>

    <!-- Scope tabs with counts -->
    <div class="mb-3 flex flex-wrap items-center gap-2">
      <button
        v-for="t in scopeTabs"
        :key="t.key"
        type="button"
        class="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium transition"
        :style="toggleStyle(activeScope === t.key)"
        @click="activeScope = t.key"
      >
        <BaseIcon :name="t.icon" :size="14" />{{ t.label }}
        <span class="rounded-full px-1.5 text-xs" :style="activeScope === t.key ? { background: 'rgba(255,255,255,0.25)' } : { background: 'rgba(var(--v-theme-on-surface), 0.1)' }">{{ t.count }}</span>
      </button>

      <!-- ضمن قطاعاتي — تقييد اختياريّ (النتائج مرتّبة بقطاعاتي دائمًا) -->
      <button
        v-if="sector.has.value"
        type="button"
        class="ms-auto inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium transition"
        :style="toggleStyle(onlyMine, 'secondary')"
        @click="onlyMine = !onlyMine"
      >
        <BaseIcon name="mdi-shape-outline" :size="14" /> ضمن قطاعاتي
      </button>
    </div>

    <!-- Results by category -->
    <template v-if="totalCount">
      <div v-for="cat in shownCategories" :key="cat.key" class="mb-5">
        <div class="mb-2 flex items-center gap-2">
          <BaseIcon :name="cat.icon" :size="22" :style="{ color: 'rgba(var(--v-theme-on-surface), 0.6)' }" />
          <h3 class="text-base font-bold text-content">{{ cat.label }}</h3>
          <BaseChip color="neutral">{{ cat.items.length }}</BaseChip>
        </div>
        <BaseCard :padded="false" class="overflow-hidden">
          <button
            v-for="(item, i) in cat.items"
            :key="item.id"
            type="button"
            class="flex w-full items-center gap-3 p-3 text-start transition"
            :class="[{ 'border-t border-ui': i > 0 }, item.route ? 'hover:bg-surfalt' : 'cursor-default']"
            @click="openItem(item.route)"
          >
            <BaseAvatar :color="mapColor(item.color)" tonal square><BaseIcon :name="item.icon" :size="20" /></BaseAvatar>
            <div class="min-w-0 flex-1">
              <div class="font-bold text-content">{{ item.title }}</div>
              <div class="truncate text-xs text-muted">{{ item.subtitle }}</div>
            </div>
            <BaseIcon v-if="item.route" name="mdi-arrow-left" :size="20" :style="{ color: 'rgba(var(--v-theme-on-surface), 0.5)' }" />
          </button>
        </BaseCard>
      </div>
    </template>

    <BaseCard v-else :padded="false">
      <EmptyState
        icon="mdi-magnify-close"
        title="لا نتائج"
        :description="query ? `لم نجد نتائج عن «${query}». جرّب كلمات أخرى.` : 'اكتب في شريط البحث بالأعلى للبدء.'"
      />
    </BaseCard>
  </div>
</template>
