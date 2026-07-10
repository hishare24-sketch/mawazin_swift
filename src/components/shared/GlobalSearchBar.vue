<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ai } from '@/services/ai'
import { TAXONOMY } from '@/services/taxonomy'
import type { SearchScope } from '@/services/ai/types'
import { useSearchPrefsStore } from '@/stores/SearchPrefsStore'

const { t } = useI18n()
const router = useRouter()
const prefs = useSearchPrefsStore()

const query = ref('')
const focused = ref(false)
const listening = ref(false)

const suggestions = computed(() => (focused.value ? ai.searchSuggestions(query.value) : []))
const alternatives = computed(() => (query.value ? ai.keywordAlternatives(query.value) : []))
// Recent + saved searches only surface before the user starts typing (adaptive history)
const recent = computed(() => (focused.value && !query.value.trim() ? prefs.recent.slice(0, 6) : []))
const savedSearches = computed(() => (focused.value && !query.value.trim() ? prefs.saved.slice(0, 5) : []))
const showDropdown = computed(() => focused.value && (suggestions.value.length > 0 || alternatives.value.length > 0 || recent.value.length > 0 || savedSearches.value.length > 0))

// The suggestions list is teleported to <body> so it escapes the app-bar's
// `overflow: hidden`; its position is anchored to the field on every open/resize.
const wrapEl = ref<HTMLElement>()
const dropdownStyle = ref<Record<string, string>>({})
function updateDropdownPos() {
  const field = wrapEl.value?.querySelector('.v-field') as HTMLElement | null
  if (!field)
    return
  const r = field.getBoundingClientRect()
  dropdownStyle.value = {
    position: 'fixed',
    top: `${r.bottom + 6}px`,
    left: `${r.left}px`,
    width: `${r.width}px`,
  }
}
function onFocus() {
  focused.value = true
  nextTick(updateDropdownPos)
}
onMounted(() => window.addEventListener('resize', updateDropdownPos))
onBeforeUnmount(() => window.removeEventListener('resize', updateDropdownPos))

const scopes = computed<{ value: SearchScope, title: string }[]>(() => [
  { value: 'all', title: t('search.scopes.all') },
  { value: 'requests', title: t('search.scopes.requests') },
  { value: 'opportunities', title: t('search.scopes.opportunities') },
  { value: 'interviewers', title: t('search.scopes.interviewers') },
  { value: 'users', title: t('search.scopes.users') },
  { value: 'companies', title: t('search.scopes.companies') },
])

function go(extra: Record<string, string> = {}) {
  focused.value = false
  prefs.recordSearch(query.value)
  router.push({ name: 'search', query: { q: query.value.trim(), ...extra } })
}
function runSaved(s: { q: string, scope: string }) {
  query.value = s.q
  go({ scope: s.scope })
}
function pick(s: string) {
  query.value = s
  go()
}
function onBlur() {
  // delay so a suggestion mousedown registers before the list closes
  setTimeout(() => (focused.value = false), 200)
}

// Advanced search
const advDialog = ref(false)
const advScope = ref<SearchScope>('all')
const advKeywords = ref('')
const advCategory = ref<string | null>(null)
const advRating = ref(0)
const advDate = ref<string | null>(null)
const categoryOptions = TAXONOMY.map(c => ({ value: c.id, title: c.label }))
const dateOptions = computed(() => [
  { value: 'day', title: t('search.dates.day') },
  { value: 'week', title: t('search.dates.week') },
  { value: 'month', title: t('search.dates.month') },
  { value: 'year', title: t('search.dates.year') },
])
function applyAdvanced() {
  const q: Record<string, string> = { q: (advKeywords.value || query.value).trim(), scope: advScope.value }
  if (advCategory.value)
    q.category = advCategory.value
  if (advRating.value)
    q.rating = String(advRating.value)
  if (advDate.value)
    q.date = advDate.value
  advDialog.value = false
  focused.value = false
  router.push({ name: 'search', query: q })
}

// Voice search (Web Speech API, graceful fallback)
const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
const voiceSupported = !!SpeechRec
function startVoice() {
  if (!SpeechRec)
    return
  const rec = new SpeechRec()
  rec.lang = 'ar-SA'
  rec.interimResults = false
  listening.value = true
  rec.onresult = (e: any) => {
    query.value = e.results[0][0].transcript
    listening.value = false
    go()
  }
  rec.onerror = () => (listening.value = false)
  rec.onend = () => (listening.value = false)
  rec.start()
}
</script>

<template>
  <div ref="wrapEl" class="global-search position-relative flex-grow-1" style="max-width: 560px">
    <VTextField
      v-model="query"
      :placeholder="t('search.placeholder')"
      prepend-inner-icon="mdi-magnify"
      variant="solo"
      density="compact"
      hide-details
      flat
      rounded="lg"
      bg-color="background"
      @focus="onFocus"
      @blur="onBlur"
      @keydown.enter="go()"
    >
      <template #append-inner>
        <VTooltip :text="voiceSupported ? t('search.voice') : t('search.voiceUnsupported')" location="bottom">
          <template #activator="{ props }">
            <VBtn v-bind="props" :icon="listening ? 'mdi-microphone' : 'mdi-microphone-outline'" :color="listening ? 'error' : undefined" variant="text" size="small" :disabled="!voiceSupported" @click.stop="startVoice" />
          </template>
        </VTooltip>
        <VTooltip :text="t('search.advanced')" location="bottom">
          <template #activator="{ props }">
            <VBtn v-bind="props" icon="mdi-tune-variant" variant="text" size="small" @click.stop="advDialog = true" />
          </template>
        </VTooltip>
      </template>
    </VTextField>

    <!-- Live suggestions — teleported to <body> to escape the app-bar clip -->
    <Teleport to="body">
      <VExpandTransition>
        <VCard v-if="showDropdown" class="global-search__menu" :style="dropdownStyle" elevation="8" rounded="lg">
          <VList density="compact">
            <template v-if="savedSearches.length">
              <VListSubheader class="text-caption"><VIcon icon="mdi-bookmark-outline" size="14" class="me-1" /> {{ t('search.savedSearches') }}</VListSubheader>
              <VListItem v-for="s in savedSearches" :key="`sav-${s.id}`" prepend-icon="mdi-bookmark" :title="s.q" @mousedown="runSaved(s)" />
            </template>
            <template v-if="recent.length">
              <VListSubheader class="text-caption"><VIcon icon="mdi-history" size="14" class="me-1" /> {{ t('search.recentSearches') }}</VListSubheader>
              <VListItem v-for="r in recent" :key="`rec-${r}`" prepend-icon="mdi-clock-outline" :title="r" @mousedown="pick(r)" />
            </template>
            <VListSubheader v-if="alternatives.length" class="text-caption">{{ t('search.didYouMean') }}</VListSubheader>
            <VListItem v-for="alt in alternatives" :key="`alt-${alt}`" prepend-icon="mdi-lightbulb-on-outline" :title="alt" @mousedown="pick(alt)" />
            <VListSubheader class="text-caption"><VIcon icon="mdi-robot-happy-outline" size="14" class="me-1" /> {{ t('search.smartSuggestions') }}</VListSubheader>
            <VListItem v-for="(s, i) in suggestions" :key="i" prepend-icon="mdi-magnify" :title="s" @mousedown="pick(s)" />
          </VList>
        </VCard>
      </VExpandTransition>
    </Teleport>

    <!-- Advanced search dialog (teleported by VDialog itself) -->
    <VDialog v-model="advDialog" max-width="520">
      <VCard class="pa-2">
        <VCardTitle class="d-flex align-center ga-2"><VIcon icon="mdi-tune-variant" /> {{ t('search.advanced') }}</VCardTitle>
        <VCardText>
          <VSelect v-model="advScope" :items="scopes" :label="t('search.scopeLabel')" class="mb-3" hide-details />
          <VTextField v-model="advKeywords" :label="t('search.keywords')" :placeholder="t('search.keywordsPlaceholder')" class="mb-3" hide-details />
          <VSelect v-model="advCategory" :items="categoryOptions" :label="t('search.field')" clearable class="mb-3" hide-details />
          <div class="text-caption font-weight-bold mb-1">{{ t('search.minRating', { rating: advRating }) }}</div>
          <VSlider v-model="advRating" :min="0" :max="5" :step="0.5" color="warning" hide-details class="mb-3" />
          <VSelect v-model="advDate" :items="dateOptions" :label="t('search.postDate')" clearable hide-details />
        </VCardText>
        <VCardActions class="justify-end">
          <VBtn variant="text" @click="advDialog = false">{{ t('search.cancel') }}</VBtn>
          <VBtn color="accent" prepend-icon="mdi-magnify" @click="applyAdvanced">{{ t('search.searchBtn') }}</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>

<style scoped>
/* Teleported to <body>; must clear the app bar (z-index ~1005) */
.global-search__menu {
  z-index: 2400;
  max-height: 60vh;
  overflow-y: auto;
}
</style>
