<script setup lang="ts" generic="T">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FacetSpec, SortSpec } from '@/composables/useFacetedList'
import { useFacetedList } from '@/composables/useFacetedList'
import { useMediaQuery } from '@/composables/useMediaQuery'
import { useFilterViewsStore } from '@/stores/FilterViewsStore'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSlider from '@/components/ui/BaseSlider.vue'
import BaseDrawer from '@/components/ui/BaseDrawer.vue'

// العقد الموحّد للاكتشاف: بحث بطل + شريط قطاعات + رقائق فاسِت + شيت سفليّ + فرز.
// موبايل-أوّلًا؛ يعيد استخدامه كل سطح بتمرير spec للفاسِتات وبطاقة عبر #item.
interface SavedView { label: string, icon?: string, apply: () => void }
const props = withDefaults(defineProps<{
  items: T[]
  facets: FacetSpec<T>[]
  sorts: SortSpec<T>[]
  text?: (t: T) => string
  itemKey: (t: T) => string | number
  noun?: string
  searchPlaceholder?: string
  view?: 'grid' | 'list'
  /** بذرة «لك» على الفاسِت المحوريّ (قطاعات المستخدم) */
  primaryPreset?: { label: string, icon?: string, values: string[] }
  savedViews?: SavedView[]
  /** مفتاح السطح (سوق) لحفظ/استرجاع توليفات الفلاتر عبر FilterViewsStore */
  surface?: string
}>(), { noun: 'نتيجة', searchPlaceholder: 'ابحث بالاسم أو المهارة…', view: 'grid' })

const { t } = useI18n()

const api = useFacetedList<T>({
  items: () => props.items,
  facets: props.facets,
  sorts: props.sorts,
  text: props.text,
})

// العروض المحفوظة (توليفة فلاتر كاملة) — مربوطة بـFilterViewsStore عند تمرير surface
const viewsStore = useFilterViewsStore()
const storeViews = computed(() => (props.surface ? viewsStore.forSurface(props.surface) : []))
// يُظهر زرّ الحفظ حين يوجد ما يُحفَظ (فاسِت مطبّق أو بحث)
const canSaveView = computed(() => !!props.surface && (api.hasActiveFacets.value || !!api.state.q.trim()))
function currentViewLabel(): string {
  const chips = api.appliedChips.value.map(c => c.label)
  if (chips.length)
    return chips.slice(0, 3).join(' · ')
  if (api.state.q.trim())
    return `«${api.state.q.trim()}»`
  return `${t('discovery.savedView')} ${storeViews.value.length + 1}`
}
function saveCurrentView() {
  if (props.surface)
    viewsStore.saveView(props.surface, currentViewLabel(), api.snapshot())
}

const primaryFacet = computed(() => props.facets.find(f => f.primary))
const otherFacets = computed(() => props.facets.filter(f => !f.primary))
const ribbonOptions = computed(() => primaryFacet.value?.options?.() ?? [])
const RIBBON_LIMIT = 8

const filterOpen = ref(false)
const sortOpen = ref(false)
// الشاشات الواسعة: درج جانبيّ للفلاتر بدل الشيت السفليّ (الموبايل يبقى شيتًا)
const isWide = useMediaQuery('(min-width: 1024px)')
// حالة مستقلّة لكل فاسِت باحث (بحث + توسّع) — لا تتقاطع عند وجود فاسِتين قابلين للبحث
const sheetSearch = ref<Record<string, string>>({})
const showAllOpts = ref<Record<string, boolean>>({})
// أقسام الشيت قابلة للطيّ (accordion): القسم الأوّل مفتوح افتراضًا + أي قسم بتصفية نشطة
const openSections = ref<Record<string, boolean>>({})
function sectionOpen(key: string, index: number): boolean {
  return openSections.value[key] ?? (index === 0 || api.isActive(key))
}
function toggleSection(key: string, index: number) {
  openSections.value[key] = !sectionOpen(key, index)
}
const PRIMARY_TOPN = 6
function facetQuery(key: string): string {
  return sheetSearch.value[key] ?? ''
}

const activeSort = computed(() => props.sorts.find(s => s.key === api.state.sortKey) ?? props.sorts[0])

// — الشريط المحوريّ (القطاع): «الكل» و«لك» واختيار مفرد سريع —
function primarySel(): string[] {
  return primaryFacet.value ? (api.state.sel[primaryFacet.value.key] ?? []) : []
}
const isAll = computed(() => primarySel().length === 0)
const isPreset = computed(() => {
  const vals = props.primaryPreset?.values ?? []
  const sel = primarySel()
  return vals.length > 0 && sel.length === vals.length && vals.every(v => sel.includes(v))
})
function ribbonActive(value: string): boolean {
  const sel = primarySel()
  return sel.length === 1 && sel[0] === value
}
function pickRibbon(value: string) {
  const key = primaryFacet.value!.key
  api.setMulti(key, ribbonActive(value) ? [] : [value])
}
function pickAll() {
  if (primaryFacet.value)
    api.setMulti(primaryFacet.value.key, [])
}
function pickPreset() {
  if (primaryFacet.value && props.primaryPreset)
    api.setMulti(primaryFacet.value.key, props.primaryPreset.values)
}

// — رقائق الفاسِت السريعة —
function onQuickChip(f: FacetSpec<T>) {
  if (f.kind === 'bool')
    api.setBool(f.key, !api.state.bools[f.key])
  else
    filterOpen.value = true
}

// — محتوى الشيت (خيارات فاسِت متعدّد قابلة للبحث) —
function sheetOptions(f: FacetSpec<T>) {
  const q = facetQuery(f.key).trim()
  const opts = f.options?.() ?? []
  return f.searchable && q ? opts.filter(o => o.label.includes(q)) : opts
}
// قائمة مُختصرة (أهمّ N) للتصنيف القابل للبحث — تُوسَّع بـ«عرض الكل»
function displayOptions(f: FacetSpec<T>) {
  const all = sheetOptions(f)
  if (facetQuery(f.key).trim() || showAllOpts.value[f.key])
    return all
  return all.slice(0, PRIMARY_TOPN)
}
function hiddenCount(f: FacetSpec<T>): number {
  return Math.max(0, sheetOptions(f).length - PRIMARY_TOPN)
}
function pickSort(key: string) {
  api.setSort(key)
  sortOpen.value = false
}
</script>

<template>
  <div>
    <!-- ① البحث البطل -->
    <div class="mb-3">
      <BaseInput v-model="api.state.q" prefix-icon="mdi-magnify" :placeholder="searchPlaceholder">
        <template #suffix>
          <button v-if="api.state.q" type="button" class="text-muted" :aria-label="t('discovery.clear')" @click="api.state.q = ''">
            <BaseIcon name="mdi-close" :size="18" />
          </button>
        </template>
      </BaseInput>
    </div>

    <!-- ② شريط القطاعات المحوريّ -->
    <div v-if="primaryFacet" class="hbar mb-3 flex gap-2.5 overflow-x-auto pb-1">
      <button
        v-if="primaryPreset && primaryPreset.values.length"
        type="button"
        class="chip" :class="isPreset ? 'chip-on' : ''"
        @click="pickPreset"
      >
        <BaseIcon :name="primaryPreset.icon ?? 'mdi-star-outline'" :size="15" /> {{ primaryPreset.label }}
      </button>
      <button type="button" class="chip" :class="isAll ? 'chip-on' : ''" @click="pickAll">{{ t('discovery.all') }}</button>
      <button
        v-for="opt in ribbonOptions.slice(0, RIBBON_LIMIT)"
        :key="opt.value"
        type="button"
        class="chip" :class="[ribbonActive(opt.value) ? 'chip-on' : '', opt.count === 0 ? 'chip-empty' : '']"
        @click="pickRibbon(opt.value)"
      >
        <BaseIcon v-if="opt.icon" :name="opt.icon" :size="15" /> {{ opt.label }}<span v-if="opt.count != null" class="chip-count">{{ opt.count }}</span>
      </button>
      <button type="button" class="chip" @click="filterOpen = true">
        <BaseIcon name="mdi-dots-horizontal" :size="15" /> {{ t('discovery.more') }}
      </button>
    </div>

    <!-- ③ رقائق الفاسِت السريعة + كل الفلاتر + فرز -->
    <div class="hbar mb-3 flex items-center gap-2.5 overflow-x-auto pb-1">
      <button type="button" class="btn-bar" @click="filterOpen = true">
        <BaseIcon name="mdi-tune-variant" :size="16" /> {{ t('discovery.allFilters') }}
        <span v-if="api.hasActiveFacets.value" class="ms-1 rounded-full bg-brand px-1.5 text-xs text-on-brand">{{ api.appliedChips.value.length }}</span>
      </button>
      <button
        v-for="f in otherFacets"
        :key="f.key"
        type="button"
        class="chip whitespace-nowrap" :class="api.isActive(f.key) ? 'chip-on' : ''"
        @click="onQuickChip(f)"
      >
        {{ f.label }}
        <template v-if="f.kind === 'multi' && api.activeCount(f.key)">({{ api.activeCount(f.key) }})</template>
        <BaseIcon v-if="f.kind !== 'bool'" name="mdi-chevron-down" :size="15" />
      </button>
      <button type="button" class="btn-bar whitespace-nowrap" @click="sortOpen = true">
        <BaseIcon name="mdi-sort" :size="16" /> {{ activeSort?.label }}
      </button>
      <button v-if="canSaveView" type="button" class="btn-bar whitespace-nowrap" @click="saveCurrentView">
        <BaseIcon name="mdi-bookmark-plus-outline" :size="16" /> {{ t('discovery.saveView') }}
      </button>
      <slot name="toolbar" />
    </div>

    <!-- ④ العدّاد + الرقائق المطبّقة -->
    <div class="mb-3 flex flex-wrap items-center gap-2">
      <span class="text-sm font-bold text-content">{{ api.results.value.length }} {{ noun }}</span>
      <TransitionGroup tag="span" name="pop" class="inline-flex flex-wrap items-center gap-2">
        <button
          v-for="chip in api.appliedChips.value"
          :key="chip.key"
          type="button"
          class="inline-flex items-center gap-1 rounded-full border-ui bg-surfalt px-2.5 py-1 text-xs text-content transition active:scale-95"
          @click="chip.remove()"
        >
          {{ chip.label }} <BaseIcon name="mdi-close" :size="13" />
        </button>
      </TransitionGroup>
      <button v-if="api.appliedChips.value.length" type="button" class="text-xs text-brand hover:underline" @click="api.clearAll()">
        {{ t('discovery.clearAll') }}
      </button>
    </div>

    <!-- ⑤ العروض المحفوظة (تمريرة الصفحة القديمة + المخزَّنة عبر surface) -->
    <div v-if="(savedViews && savedViews.length) || storeViews.length" class="hbar mb-3 flex items-center gap-2.5 overflow-x-auto pb-1">
      <span class="whitespace-nowrap text-xs text-muted">{{ t('discovery.yourViews') }}</span>
      <button
        v-for="(v, i) in savedViews"
        :key="`legacy-${i}`"
        type="button"
        class="chip whitespace-nowrap"
        @click="v.apply()"
      >
        <BaseIcon v-if="v.icon" :name="v.icon" :size="14" /> {{ v.label }}
      </button>
      <span
        v-for="v in storeViews"
        :key="`store-${v.id}`"
        class="chip whitespace-nowrap"
      >
        <button type="button" class="inline-flex items-center gap-1" @click="api.applyState(v.state)">
          <BaseIcon name="mdi-bookmark-outline" :size="14" /> {{ v.label }}
        </button>
        <button type="button" class="ms-1 leading-none opacity-60" :aria-label="t('common.delete')" @click.stop="viewsStore.removeView(v.id)">
          <BaseIcon name="mdi-close" :size="13" />
        </button>
      </span>
    </div>

    <!-- ⑥ البانر (اختياريّ) + النتائج -->
    <slot name="banner" />

    <div v-if="api.results.value.length" class="grid gap-4" :class="view === 'grid' ? 'md:grid-cols-2' : 'grid-cols-1'">
      <template v-for="item in api.results.value" :key="itemKey(item)">
        <slot name="item" :item="item" />
      </template>
    </div>
    <slot v-else name="empty">
      <div class="rounded-ui border-ui py-12 text-center">
        <BaseIcon name="mdi-magnify-close" :size="56" class="text-muted" />
        <div class="mt-3 font-bold text-content">{{ t('discovery.noResults') }}</div>
        <div class="mb-3 text-sm text-muted">{{ t('discovery.noResultsHint') }}</div>
        <button type="button" class="btn-bar mx-auto" @click="api.clearAll()">{{ t('discovery.resetFilters') }}</button>
      </div>
    </slot>

    <!-- «كل الفلاتر»: درج جانبيّ على الواسعة · شيت سفليّ على الموبايل -->
    <BaseDrawer v-model="filterOpen" :side="isWide ? 'end' : 'bottom'" :width="360">
      <div class="p-4">
        <div v-if="!isWide" class="handle" />
        <div class="mb-1 flex items-center">
          <span class="flex-1 text-base font-bold text-content">{{ t('discovery.allFilters') }}</span>
          <button class="icon-btn h-8 w-8" :aria-label="t('discovery.close')" @click="filterOpen = false"><BaseIcon name="mdi-close" :size="20" /></button>
        </div>

        <!-- أقسام قابلة للطيّ (accordion): رأس بعدّاد مُختار + جسم يُطوى -->
        <div v-for="(f, fi) in facets" :key="f.key" class="border-b border-ui">
          <button type="button" class="flex w-full items-center gap-2 py-3 text-start" @click="toggleSection(f.key, fi)">
            <span class="flex-1 text-sm font-bold text-content">{{ f.label }}</span>
            <span v-if="f.kind === 'multi' && api.activeCount(f.key)" class="rounded-full bg-brand px-1.5 text-xs font-bold text-on-brand">{{ api.activeCount(f.key) }}</span>
            <span v-else-if="f.kind !== 'multi' && api.isActive(f.key)" class="h-2 w-2 rounded-full bg-brand" />
            <BaseIcon :name="sectionOpen(f.key, fi) ? 'mdi-chevron-up' : 'mdi-chevron-down'" :size="20" class="text-muted" />
          </button>

          <div v-show="sectionOpen(f.key, fi)" class="pb-3">
            <!-- فاسِت متعدّد -->
            <template v-if="f.kind === 'multi'">
              <div v-if="f.searchable" class="relative mb-2">
                <BaseInput v-model="sheetSearch[f.key]" prefix-icon="mdi-magnify" :placeholder="t('discovery.searchShort')" />
              </div>
              <!-- قابل للبحث (تصنيف كبير): أهمّ N صفوف + «عرض الكل» -->
              <div v-if="f.searchable">
                <button
                  v-for="opt in displayOptions(f)"
                  :key="opt.value"
                  type="button"
                  class="flex w-full items-center gap-2.5 border-b border-ui py-2.5 text-start"
                  @click="api.toggleMulti(f.key, opt.value)"
                >
                  <span
                    class="flex h-5 w-5 shrink-0 items-center justify-center rounded border-ui"
                    :class="(api.state.sel[f.key] ?? []).includes(opt.value) ? 'bg-brand text-on-brand' : ''"
                  >
                    <BaseIcon v-if="(api.state.sel[f.key] ?? []).includes(opt.value)" name="mdi-check" :size="14" />
                  </span>
                  <BaseIcon v-if="opt.icon" :name="opt.icon" :size="18" class="text-muted" />
                  <span class="flex-1 truncate text-sm" :class="opt.count === 0 ? 'text-muted' : ''">{{ opt.label }}</span>
                  <span v-if="opt.count != null" class="text-xs text-muted tabular-nums">{{ opt.count }}</span>
                </button>
                <button
                  v-if="!facetQuery(f.key).trim() && hiddenCount(f) > 0"
                  type="button"
                  class="w-full py-2.5 text-center text-sm font-medium text-brand"
                  @click="showAllOpts[f.key] = !showAllOpts[f.key]"
                >
                  {{ showAllOpts[f.key] ? t('discovery.showLess') : t('discovery.showAllOf', { label: f.label, count: (f.options?.() ?? []).length }) }}
                </button>
              </div>
              <!-- قائمة قصيرة: رقائق -->
              <div v-else class="flex flex-wrap gap-2">
                <button
                  v-for="opt in sheetOptions(f)"
                  :key="opt.value"
                  type="button"
                  class="chip" :class="(api.state.sel[f.key] ?? []).includes(opt.value) ? 'chip-on' : ''"
                  @click="api.toggleMulti(f.key, opt.value)"
                >{{ opt.label }}</button>
              </div>
            </template>

            <!-- فاسِت منطقيّ -->
            <template v-else-if="f.kind === 'bool'">
              <button
                type="button"
                class="chip" :class="api.state.bools[f.key] ? 'chip-on' : ''"
                @click="api.setBool(f.key, !api.state.bools[f.key])"
              >{{ t('discovery.onlyLabel', { label: f.label }) }}</button>
            </template>

            <!-- فاسِت مدى (حدّ أدنى أو أقصى) -->
            <template v-else>
              <div class="mb-1 text-sm text-muted">
                {{ (api.state.ranges[f.key] ?? (f.range?.mode === 'max' ? f.range?.max : 0) ?? 0).toLocaleString('en-US') }} {{ f.range?.mode === 'max' ? t('discovery.orLess') : t('discovery.orMore') }}
              </div>
              <BaseSlider
                :model-value="api.state.ranges[f.key] ?? (f.range?.mode === 'max' ? (f.range?.max ?? 100) : 0)"
                :min="f.range?.min ?? 0"
                :max="f.range?.max ?? 100"
                :step="f.range?.step ?? 1"
                color="secondary"
                @update:model-value="(v: number) => api.setRange(f.key, v)"
              />
            </template>
          </div>
        </div>

        <div class="sticky bottom-0 mt-4 flex gap-2 bg-surface pt-3">
          <button type="button" class="btn-bar" @click="api.clearAll()">
            <BaseIcon name="mdi-refresh" :size="16" /> {{ t('discovery.reset') }}
          </button>
          <button type="button" class="flex-1 rounded-ui bg-brand py-2.5 text-center font-bold text-on-brand" @click="filterOpen = false">
            {{ t('discovery.showN', { count: api.results.value.length, noun }) }}
          </button>
        </div>
      </div>
    </BaseDrawer>

    <!-- شيت الفرز -->
    <BaseDrawer v-model="sortOpen" side="bottom">
      <div class="p-4">
        <div class="handle" />
        <div class="mb-2 text-base font-bold text-content">{{ t('discovery.sortBy') }}</div>
        <button
          v-for="s in sorts"
          :key="s.key"
          type="button"
          class="flex w-full items-center justify-between border-b border-ui py-3 text-start text-sm"
          @click="pickSort(s.key)"
        >
          <span>{{ s.label }}</span>
          <BaseIcon v-if="s.key === api.state.sortKey" name="mdi-check" :size="18" class="text-brand" />
        </button>
      </div>
    </BaseDrawer>
  </div>
</template>

<style scoped>
/* شريط أفقيّ بلا شريط تمرير مرئيّ (تنعيم عبر المتصفّحات) */
.hbar { scrollbar-width: none; -ms-overflow-style: none; }
.hbar::-webkit-scrollbar { display: none; }

/* أهداف لمس مريحة (≥44px) على الأجهزة اللمسيّة فقط — يبقى الديسكتوب مضغوطًا */
@media (pointer: coarse) {
  .chip, .btn-bar { min-height: 44px; }
}

.chip {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 5px;
  border-radius: 999px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.16);
  padding: 7px 13px;
  font-size: 13.5px;
  line-height: 1.2;
  color: rgb(var(--v-theme-on-surface));
  transition: background 0.18s ease, border-color 0.18s ease, transform 0.1s ease;
  white-space: nowrap;
}
.chip:hover { background: rgba(var(--v-theme-on-surface), 0.05); }
.chip:active { transform: scale(0.96); }
/* عدّاد النتائج داخل الرقاقة + تخفيف الرقائق الفارغة (تبقى مرئيّة لكن ثانويّة) */
.chip-count { margin-inline-start: 5px; font-size: 11.5px; opacity: 0.6; font-variant-numeric: tabular-nums; }
.chip-empty { opacity: 0.5; }
.chip-empty.chip-on { opacity: 1; }
.chip-on {
  background: rgb(var(--v-theme-primary));
  border-color: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  font-weight: 500;
}
.btn-bar {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.22);
  padding: 7px 13px;
  font-size: 13.5px;
  line-height: 1.2;
  color: rgb(var(--v-theme-on-surface));
  transition: background 0.18s ease, transform 0.1s ease;
}
.btn-bar:hover { background: rgba(var(--v-theme-on-surface), 0.05); }
.btn-bar:active { transform: scale(0.96); }

/* انتقال ظهور/إزالة الرقائق المطبّقة */
.pop-enter-active, .pop-leave-active { transition: opacity 0.18s ease, transform 0.18s ease; }
.pop-enter-from, .pop-leave-to { opacity: 0; transform: scale(0.8); }

/* مقبض السحب أعلى الشيت */
.handle {
  width: 40px; height: 5px; border-radius: 999px; margin: 2px auto 12px;
  background: rgba(var(--v-theme-on-surface), 0.22);
}
</style>
