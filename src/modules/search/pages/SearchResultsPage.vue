<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGlobalSearch } from '@/services/globalSearch'
import { ai } from '@/services/ai'
import type { SearchScope } from '@/services/ai/types'
import EmptyState from '@/components/shared/EmptyState.vue'
import { useSearchPrefsStore } from '@/stores/SearchPrefsStore'

const route = useRoute()
const router = useRouter()
const { search } = useGlobalSearch()
const prefs = useSearchPrefsStore()

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

const categories = computed(() => search(query.value, 'all', category.value))
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
    <div class="d-flex align-center justify-space-between flex-wrap ga-2 mb-1">
      <h1 class="text-h5 font-weight-bold">نتائج البحث</h1>
      <VBtn
        v-if="query"
        :color="savedNow ? 'accent' : undefined"
        :variant="savedNow ? 'tonal' : 'outlined'"
        size="small"
        :prepend-icon="savedNow ? 'mdi-bookmark' : 'mdi-bookmark-outline'"
        @click="toggleSave"
      >
        {{ savedNow ? 'محفوظ' : 'حفظ البحث' }}
      </VBtn>
    </div>
    <p v-if="query" class="text-body-2 text-medium-emphasis mb-3">
      عن «{{ query }}» — {{ totalCount }} نتيجة
    </p>

    <!-- Saved searches (quick re-run) -->
    <div v-if="prefs.saved.length" class="d-flex align-center flex-wrap ga-1 mb-3">
      <span class="text-caption text-medium-emphasis"><VIcon icon="mdi-bookmark-multiple-outline" size="14" /> محفوظة:</span>
      <VChip
        v-for="s in prefs.saved"
        :key="s.id"
        size="small"
        variant="outlined"
        closable
        @click="runSaved(s)"
        @click:close="prefs.removeSaved(s.id)"
      >
        {{ s.q }}
      </VChip>
    </div>

    <!-- AI intent + alternatives -->
    <VAlert v-if="query" color="secondary" variant="tonal" density="comfortable" class="mb-4" border="start">
      <template #prepend><VIcon icon="mdi-robot-happy-outline" /></template>
      <div class="d-flex align-center justify-space-between flex-wrap ga-2">
        <span class="text-body-2">{{ intent.note }}</span>
        <div v-if="alternatives.length" class="d-flex align-center ga-1 flex-wrap">
          <span class="text-caption text-medium-emphasis">هل تقصد:</span>
          <VChip v-for="alt in alternatives" :key="alt" size="small" color="secondary" @click="searchAlt(alt)">{{ alt }}</VChip>
        </div>
      </div>
    </VAlert>

    <!-- Scope tabs with counts -->
    <VChipGroup v-model="activeScope" mandatory class="mb-3">
      <VChip v-for="t in scopeTabs" :key="t.key" :value="t.key" filter :prepend-icon="t.icon">
        {{ t.label }} <VChip size="x-small" class="ms-1" label>{{ t.count }}</VChip>
      </VChip>
    </VChipGroup>

    <!-- Results by category -->
    <template v-if="totalCount">
      <div v-for="cat in shownCategories" :key="cat.key" class="mb-5">
        <div class="d-flex align-center ga-2 mb-2">
          <VIcon :icon="cat.icon" color="medium-emphasis" />
          <h3 class="text-subtitle-1 font-weight-bold">{{ cat.label }}</h3>
          <VChip size="x-small" label>{{ cat.items.length }}</VChip>
        </div>
        <VCard>
          <VList lines="two" class="py-0">
            <template v-for="(item, i) in cat.items" :key="item.id">
              <VListItem :class="item.route ? 'cursor-pointer' : ''" @click="openItem(item.route)">
                <template #prepend>
                  <VAvatar :color="item.color" variant="tonal" rounded="lg"><VIcon :icon="item.icon" /></VAvatar>
                </template>
                <VListItemTitle class="font-weight-bold">{{ item.title }}</VListItemTitle>
                <VListItemSubtitle>{{ item.subtitle }}</VListItemSubtitle>
                <template v-if="item.route" #append>
                  <VIcon icon="mdi-arrow-left" color="medium-emphasis" />
                </template>
              </VListItem>
              <VDivider v-if="i < cat.items.length - 1" />
            </template>
          </VList>
        </VCard>
      </div>
    </template>

    <VCard v-else>
      <EmptyState
        icon="mdi-magnify-close"
        title="لا نتائج"
        :description="query ? `لم نجد نتائج عن «${query}». جرّب كلمات أخرى.` : 'اكتب في شريط البحث بالأعلى للبدء.'"
      />
    </VCard>
  </div>
</template>
