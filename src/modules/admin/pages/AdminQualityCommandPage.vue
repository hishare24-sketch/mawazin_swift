<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/shared/PageHeader.vue'
import StatCard from '@/components/shared/StatCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseSnackbar from '@/components/ui/BaseSnackbar.vue'
import BaseTooltip from '@/components/ui/BaseTooltip.vue'
import DonutChart from '@/components/charts/DonutChart.vue'
import LineChart from '@/components/charts/LineChart.vue'
import ResourceScaffold from '@/modules/admin/components/ResourceScaffold.vue'
import type { FilterDef } from '@/modules/admin/components/ResourceScaffold.vue'
import type { TableColumn } from '@/components/ui/BaseTable.vue'
import { useAdminResource } from '@/modules/admin/composables/useAdminResource'
import { type QualityAtom, type QualityBoard, type QualityCi, type QualityDispatchCard, type QualityOverview, type QualityRuntimeError, type QualityScaffold, api } from '@/services/api'
import { useAuthStore } from '@/stores/AuthStore'

const { t } = useI18n()
const auth = useAuthStore()
const canManage = computed(() => auth.hasPermission('manage_quality'))

type ChipColor = 'brand' | 'accent' | 'emerald' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
const STATUS_COLOR: Record<string, ChipColor> = { automated: 'success', gap: 'warning', failing: 'error' }
const STATUS_ICON: Record<string, string> = { automated: 'mdi-check-circle-outline', gap: 'mdi-checkbox-blank-outline', failing: 'mdi-close-circle-outline' }
const PRIORITY_COLOR: Record<string, ChipColor> = { critical: 'error', important: 'warning', normal: 'neutral' }
const LAYER_COLOR: Record<string, ChipColor> = { backend: 'info', frontend: 'brand', ops: 'accent', filters: 'emerald' }
const STATUS_THEME: Record<string, string> = { automated: 'success', gap: 'warning', failing: 'error' }
const DEPT_META: Record<string, { icon: string, color: ChipColor }> = {
  triage: { icon: 'mdi-inbox-outline', color: 'neutral' },
  ops: { icon: 'mdi-cog-outline', color: 'accent' },
  testing: { icon: 'mdi-test-tube', color: 'info' },
  backend: { icon: 'mdi-server-outline', color: 'info' },
  frontend: { icon: 'mdi-monitor-dashboard', color: 'brand' },
  filters: { icon: 'mdi-filter-variant', color: 'emerald' },
}
const STATE_COLOR: Record<string, ChipColor> = { todo: 'neutral', doing: 'info', review: 'warning', done: 'success' }
const SEVERITY_COLOR: Record<string, ChipColor> = { critical: 'error', high: 'error', warning: 'warning', info: 'info' }
const RT_STATE_COLOR: Record<string, ChipColor> = { new: 'error', ongoing: 'warning', regressed: 'error', resolved: 'success' }
const statusLabel = (s: string) => t(`admin.qcc.status_${s}`)
const priorityLabel = (p: string) => t(`admin.qcc.priority_${p}`)
const layerLabel = (l: string) => t(`admin.qcc.layer_${l}`)
const typeLabel = (t2: string) => t(`admin.qcc.type_${t2}`)
const deptLabel = (d: string) => t(`admin.qcc.dept_${d}`)
const stateLabel = (s: string) => t(`admin.qcc.state_${s}`)

// ——— النظرة العامّة (KPIs + توزيعات + اتّجاه) ———
const overview = ref<QualityOverview | null>(null)
const loadingOverview = ref(false)
async function loadOverview() {
  loadingOverview.value = true
  try { overview.value = await api.admin.qualityOverview() }
  catch { /* تجاهل */ }
  finally { loadingOverview.value = false }
}

const statusDonut = computed(() => (overview.value?.byStatus ?? []).map(s => ({
  label: statusLabel(s.key), value: s.count, color: `rgb(var(--v-theme-${STATUS_THEME[s.key] ?? 'neutral'}))`,
})))
const coverageSeries = computed(() => (overview.value?.series ?? []).map(s => ({ label: s.date.slice(5), value: s.coverage })))
const maxLayer = computed(() => Math.max(1, ...(overview.value?.byLayer ?? []).map(l => l.count)))

// ——— لوحة التحويل (الأقسام / kanban) ———
const board = ref<QualityBoard | null>(null)
async function loadBoard() {
  try { board.value = await api.admin.qualityBoard() }
  catch { /* تجاهل */ }
}
const deptOptions = computed(() => (board.value?.departments ?? []).map(d => ({ value: d, title: deptLabel(d) })))
const stateOptions = computed(() => (board.value?.states ?? []).map(s => ({ value: s, title: stateLabel(s) })))

const snack = ref({ show: false, text: '', color: 'success' })
function toast(text: string, color = 'success') { snack.value = { show: true, text, color } }
function fail(e: unknown) { toast((e as { message?: string })?.message ?? t('admin.toast.failed'), 'error') }

// حوار التحويل من جدول الذرّات
const dispatchOpen = ref(false)
const dispatchTarget = ref<QualityAtom | null>(null)
const dispatchForm = ref({ department: 'triage', state: 'todo', note: '' })
function openDispatch(atom: QualityAtom) {
  dispatchTarget.value = atom
  dispatchForm.value = { department: 'triage', state: 'todo', note: '' }
  dispatchOpen.value = true
}
async function submitDispatch() {
  if (!dispatchTarget.value)
    return
  try {
    await api.admin.qualityDispatch(dispatchTarget.value.id, { ...dispatchForm.value })
    toast(t('admin.qcc.dispatched'))
    dispatchOpen.value = false
    loadBoard()
  }
  catch (e) { fail(e) }
}
async function moveCard(card: QualityDispatchCard, patch: { department?: string, state?: string }) {
  try { await api.admin.qualityMoveDispatch(card.id, patch); loadBoard() }
  catch (e) { fail(e) }
}
async function removeCard(card: QualityDispatchCard) {
  try { await api.admin.qualityRemoveDispatch(card.id); toast(t('admin.toast.updated')); loadBoard() }
  catch (e) { fail(e) }
}

// ——— توليد الفجوة → اختبار (ف5) ———
const scaffoldOpen = ref(false)
const scaffold = ref<QualityScaffold | null>(null)
const scaffoldLoading = ref(false)
async function openScaffold(atom: QualityAtom) {
  scaffoldOpen.value = true
  scaffold.value = null
  scaffoldLoading.value = true
  try { scaffold.value = await api.admin.qualityScaffold(atom.id) }
  catch (e) { fail(e) }
  finally { scaffoldLoading.value = false }
}
async function copyScaffold() {
  if (!scaffold.value)
    return
  try { await navigator.clipboard.writeText(scaffold.value.code); toast(t('admin.qcc.copied')) }
  catch { toast(t('admin.toast.failed'), 'error') }
}

// ——— مستكشف الذرّات (خادميّ التقسيم) ———
const r = useAdminResource<QualityAtom>({ fetcher: params => api.admin.qualityAtoms(params), initialSort: 'caseId', perPage: 20 })
const { items, meta, loading, sortKey, search, filters } = r

// ——— رصد وقت-التشغيل ———
const runtimeErrors = ref<QualityRuntimeError[]>([])
async function loadRuntime() {
  try { runtimeErrors.value = (await api.admin.qualityRuntime({ perPage: 12 })).items }
  catch { /* تجاهل */ }
}
function fmtTime(s: string | null) { return s ? new Date(s).toLocaleString() : '—' }

// ——— حالة CI (GitHub Actions) ———
const ci = ref<QualityCi | null>(null)
async function loadCi() {
  try { ci.value = await api.admin.qualityCi() }
  catch { /* تجاهل */ }
}
const CI_COLOR: Record<string, ChipColor> = { success: 'success', failure: 'error', cancelled: 'neutral', skipped: 'neutral', in_progress: 'info', queued: 'info' }
const ciConcColor = (c: string | null) => CI_COLOR[c ?? ''] ?? 'info'

function refreshAll() { r.refresh(); loadOverview(); loadBoard(); loadRuntime(); loadCi() }
onMounted(() => { loadOverview(); loadBoard(); loadRuntime(); loadCi() })

const columns: TableColumn[] = [
  { key: 'caseId', label: t('admin.qcc.colId'), sortable: true },
  { key: 'title', label: t('admin.qcc.colTitle'), sortable: false },
  { key: 'layer', label: t('admin.qcc.colLayer'), sortable: true, align: 'center' },
  { key: 'type', label: t('admin.qcc.colType'), sortable: true, align: 'center' },
  { key: 'priority', label: t('admin.qcc.colPriority'), sortable: true, align: 'center' },
  { key: 'status', label: t('admin.qcc.colStatus'), sortable: true, align: 'center' },
  { key: 'testFile', label: t('admin.qcc.colTest'), sortable: false },
]
const filterDefs = computed<FilterDef[]>(() => [
  { key: 'layer', label: t('admin.qcc.colLayer'), options: ['backend', 'frontend', 'ops', 'filters'].map(l => ({ value: l, label: layerLabel(l) })) },
  { key: 'status', label: t('admin.qcc.colStatus'), options: ['automated', 'gap', 'failing'].map(s => ({ value: s, label: statusLabel(s) })) },
  { key: 'priority', label: t('admin.qcc.colPriority'), options: ['critical', 'important', 'normal'].map(p => ({ value: p, label: priorityLabel(p) })) },
  { key: 'type', label: t('admin.qcc.colType'), options: ['U', 'F', 'E'].map(x => ({ value: x, label: typeLabel(x) })) },
])
</script>

<template>
  <div>
    <PageHeader :title="t('admin.qcc.title')" :subtitle="t('admin.qcc.subtitle')" icon="mdi-shield-star-outline">
      <template #actions>
        <BaseButton variant="ghost" size="sm" :disabled="loading || loadingOverview" @click="refreshAll">
          <BaseIcon name="mdi-refresh" :size="18" />{{ t('admin.qcc.refresh') }}
        </BaseButton>
      </template>
    </PageHeader>

    <!-- بطاقات المؤشّرات -->
    <div class="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <StatCard icon="mdi-atom" :value="overview?.total ?? 0" :title="t('admin.qcc.statTotal')" color="primary" />
      <StatCard icon="mdi-check-decagram-outline" :value="`${overview?.coverage ?? 0}%`" :title="t('admin.qcc.statCoverage')" color="success" />
      <StatCard icon="mdi-check-circle-outline" :value="overview?.automated ?? 0" :title="t('admin.qcc.statAutomated')" color="emerald" />
      <StatCard icon="mdi-checkbox-blank-outline" :value="overview?.gap ?? 0" :title="t('admin.qcc.statGaps')" color="warning" />
      <StatCard icon="mdi-fire" :value="overview?.criticalGaps ?? 0" :title="t('admin.qcc.statCriticalGaps')" color="error" />
      <StatCard icon="mdi-close-circle-outline" :value="overview?.failing ?? 0" :title="t('admin.qcc.statFailing')" color="error" />
    </div>

    <!-- التوزيعات والاتّجاه -->
    <div class="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
      <!-- دونات الحالة -->
      <BaseCard>
        <div class="mb-2 flex items-center gap-2">
          <BaseIcon name="mdi-chart-donut" :size="18" class="text-brand" />
          <h2 class="text-sm font-bold text-content">{{ t('admin.qcc.byStatus') }}</h2>
        </div>
        <DonutChart v-if="statusDonut.length" :data="statusDonut" :size="160" :center-label="t('admin.qcc.statTotal')" />
        <p v-else class="py-8 text-center text-xs text-muted">—</p>
      </BaseCard>

      <!-- اتّجاه التغطية -->
      <BaseCard class="lg:col-span-2">
        <div class="mb-2 flex items-center gap-2">
          <BaseIcon name="mdi-trending-up" :size="18" class="text-brand" />
          <h2 class="text-sm font-bold text-content">{{ t('admin.qcc.coverageTrend') }}</h2>
          <span class="text-xs text-muted">· {{ t('admin.qcc.statCoverage') }}: <b class="text-content">{{ overview?.coverage ?? 0 }}%</b></span>
        </div>
        <LineChart v-if="coverageSeries.length > 1" :data="coverageSeries" color="success" :height="180" />
        <p v-else class="py-10 text-center text-xs text-muted">{{ t('admin.qcc.trendSoon') }}</p>
      </BaseCard>
    </div>

    <!-- الطبقات + أعلى الأقسام فجوةً -->
    <div class="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <BaseCard>
        <div class="mb-3 flex items-center gap-2">
          <BaseIcon name="mdi-layers-outline" :size="18" class="text-brand" />
          <h2 class="text-sm font-bold text-content">{{ t('admin.qcc.byLayer') }}</h2>
        </div>
        <div class="space-y-2.5">
          <div v-for="l in overview?.byLayer ?? []" :key="l.key" class="flex items-center gap-3">
            <BaseChip :color="LAYER_COLOR[l.key] || 'neutral'" class="w-24 justify-center">{{ layerLabel(l.key) }}</BaseChip>
            <div class="h-2 flex-1 overflow-hidden rounded-full bg-ui">
              <div class="h-full rounded-full" :style="{ width: `${(l.count / maxLayer) * 100}%`, background: `rgb(var(--v-theme-${LAYER_COLOR[l.key] || 'neutral'}))` }" />
            </div>
            <span class="w-10 text-end font-mono text-xs text-content">{{ l.count }}</span>
          </div>
          <p v-if="!(overview?.byLayer?.length)" class="py-4 text-center text-xs text-muted">—</p>
        </div>
      </BaseCard>

      <BaseCard>
        <div class="mb-3 flex items-center gap-2">
          <BaseIcon name="mdi-alert-decagram-outline" :size="18" class="text-brand" />
          <h2 class="text-sm font-bold text-content">{{ t('admin.qcc.topGaps') }}</h2>
        </div>
        <div class="space-y-1.5">
          <div v-for="g in overview?.topGapSections ?? []" :key="`${g.layer}-${g.section}`" class="flex items-center gap-2 text-sm">
            <BaseChip :color="LAYER_COLOR[g.layer] || 'neutral'" class="shrink-0">{{ layerLabel(g.layer) }}</BaseChip>
            <span class="flex-1 truncate text-content" :title="g.section">{{ g.section }}</span>
            <BaseChip color="warning">{{ g.gaps }}</BaseChip>
          </div>
          <p v-if="!(overview?.topGapSections?.length)" class="py-4 text-center text-xs text-muted">—</p>
        </div>
      </BaseCard>
    </div>

    <!-- لوحة التحويل (الأقسام / kanban) -->
    <BaseCard class="mb-5">
      <div class="mb-3 flex items-center gap-2">
        <BaseIcon name="mdi-directions-fork" :size="18" class="text-brand" />
        <h2 class="text-sm font-bold text-content">{{ t('admin.qcc.boardTitle') }}</h2>
        <span class="text-xs text-muted">· {{ board?.total ?? 0 }}</span>
        <span class="ms-auto text-[11px] text-muted">{{ t('admin.qcc.boardHint') }}</span>
      </div>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <div v-for="dept in board?.departments ?? []" :key="dept" class="rounded-ui border border-ui bg-ui/20 p-2">
          <div class="mb-2 flex items-center gap-1.5">
            <BaseIcon :name="DEPT_META[dept]?.icon || 'mdi-folder-outline'" :size="16" :style="{ color: `rgb(var(--v-theme-${DEPT_META[dept]?.color || 'neutral'}))` }" />
            <span class="flex-1 truncate text-xs font-bold text-content">{{ deptLabel(dept) }}</span>
            <BaseChip :color="DEPT_META[dept]?.color || 'neutral'">{{ board?.counts[dept] ?? 0 }}</BaseChip>
          </div>
          <div class="space-y-2">
            <div v-for="card in board?.lanes[dept] ?? []" :key="card.id" class="rounded-ui border border-ui bg-surface p-2">
              <div class="mb-0.5 flex items-center gap-1">
                <span class="font-mono text-[11px] font-medium text-content">{{ card.atom?.caseId }}</span>
                <BaseChip v-if="card.atom" :color="PRIORITY_COLOR[card.atom.priority] || 'neutral'" class="ms-auto">{{ priorityLabel(card.atom.priority) }}</BaseChip>
              </div>
              <div class="mb-1.5 line-clamp-2 text-[11px] text-muted" :title="card.atom?.title">{{ card.atom?.title }}</div>
              <div v-if="canManage" class="flex items-center gap-1">
                <BaseSelect :model-value="card.state" :items="stateOptions" class="flex-1" @update:model-value="v => moveCard(card, { state: String(v) })" />
                <BaseSelect :model-value="card.department" :items="deptOptions" class="flex-1" @update:model-value="v => moveCard(card, { department: String(v) })" />
                <BaseTooltip :text="t('admin.qcc.removeCard')">
                  <button class="row-act" style="color: rgb(var(--v-theme-error))" :aria-label="t('admin.qcc.removeCard')" @click="removeCard(card)"><BaseIcon name="mdi-close" :size="15" /></button>
                </BaseTooltip>
              </div>
              <BaseChip v-else :color="STATE_COLOR[card.state] || 'neutral'">{{ stateLabel(card.state) }}</BaseChip>
            </div>
            <p v-if="!(board?.lanes[dept]?.length)" class="rounded-ui border border-dashed border-ui py-3 text-center text-[11px] text-muted">—</p>
          </div>
        </div>
      </div>
    </BaseCard>

    <!-- حالة CI (GitHub Actions) -->
    <BaseCard class="mb-5">
      <div class="mb-3 flex flex-wrap items-center gap-2">
        <BaseIcon name="mdi-github" :size="18" class="text-brand" />
        <h2 class="text-sm font-bold text-content">{{ t('admin.qcc.ciTitle') }}</h2>
        <template v-if="ci?.available && ci.summary">
          <BaseChip :color="ciConcColor(ci.summary.lastConclusion)" class="ms-1">{{ ci.summary.lastConclusion ?? t('admin.qcc.ciRunning') }}</BaseChip>
          <span v-if="ci.summary.passRate !== null" class="text-xs text-muted">{{ t('admin.qcc.ciPassRate') }}: <b class="text-content">{{ ci.summary.passRate }}%</b></span>
          <span v-if="ci.repo" class="ms-auto font-mono text-[11px] text-muted" dir="ltr">{{ ci.repo }}</span>
        </template>
      </div>
      <div v-if="ci?.available && ci.runs?.length" class="space-y-1.5">
        <a v-for="run in ci.runs.slice(0, 8)" :key="run.id" :href="run.url || undefined" target="_blank" rel="noopener"
           class="flex items-center gap-2 rounded-ui border border-ui px-2.5 py-1.5 text-sm hover:bg-ui/40">
          <BaseChip :color="ciConcColor(run.conclusion ?? run.status)">{{ run.conclusion ?? run.status }}</BaseChip>
          <span class="font-medium text-content">{{ run.name }}</span>
          <BaseChip color="neutral" class="font-mono">{{ run.branch }}</BaseChip>
          <span class="truncate text-[11px] text-muted" :title="run.commit">{{ run.commit }}</span>
          <span class="ms-auto shrink-0 text-[11px] text-muted" dir="ltr">#{{ run.runNumber }} · {{ fmtTime(run.updatedAt) }}</span>
        </a>
      </div>
      <p v-else class="py-4 text-center text-xs text-muted">{{ t('admin.qcc.ciUnavailable') }}</p>
    </BaseCard>

    <!-- رصد وقت-التشغيل -->
    <BaseCard class="mb-5">
      <div class="mb-3 flex flex-wrap items-center gap-2">
        <BaseIcon name="mdi-pulse" :size="18" class="text-brand" />
        <h2 class="text-sm font-bold text-content">{{ t('admin.qcc.runtimeTitle') }}</h2>
        <div class="ms-auto flex items-center gap-3 text-xs">
          <span class="text-muted">{{ t('admin.qcc.rtOpen') }}: <b class="text-content">{{ overview?.runtime?.open ?? 0 }}</b></span>
          <span class="text-muted">{{ t('admin.qcc.rtCritical') }}: <b :style="{ color: 'rgb(var(--v-theme-error))' }">{{ overview?.runtime?.critical ?? 0 }}</b></span>
          <span class="text-muted">{{ t('admin.qcc.rtToday') }}: <b class="text-content">{{ overview?.runtime?.today ?? 0 }}</b></span>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-xs text-muted">
            <tr class="border-b border-ui">
              <th class="py-2 text-start font-medium">{{ t('admin.qcc.rtSeverity') }}</th>
              <th class="py-2 text-start font-medium">{{ t('admin.qcc.rtType') }}</th>
              <th class="py-2 text-start font-medium">{{ t('admin.qcc.rtMessage') }}</th>
              <th class="py-2 text-center font-medium">{{ t('admin.qcc.rtCount') }}</th>
              <th class="py-2 text-center font-medium">{{ t('admin.qcc.rtStatus') }}</th>
              <th class="py-2 text-start font-medium">{{ t('admin.qcc.rtLastSeen') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in runtimeErrors" :key="e.id" class="border-b border-ui/50">
              <td class="py-2"><BaseChip :color="SEVERITY_COLOR[e.severity] || 'neutral'">{{ e.severity }}</BaseChip></td>
              <td class="py-2"><span class="font-mono text-[11px] text-muted" dir="ltr">{{ e.type }}</span></td>
              <td class="max-w-sm py-2">
                <div class="truncate text-content" :title="e.message" dir="ltr">{{ e.message }}</div>
                <div v-if="e.route" class="truncate text-[11px] text-muted" dir="ltr">{{ e.route }}</div>
              </td>
              <td class="py-2 text-center font-mono text-content">{{ e.count }}</td>
              <td class="py-2 text-center"><BaseChip :color="RT_STATE_COLOR[e.status] || 'neutral'">{{ e.status }}</BaseChip></td>
              <td class="py-2 text-[11px] text-muted" dir="ltr">{{ fmtTime(e.lastSeen) }}</td>
            </tr>
            <tr v-if="!runtimeErrors.length"><td colspan="6" class="py-6 text-center text-xs text-muted">{{ t('admin.qcc.rtEmpty') }}</td></tr>
          </tbody>
        </table>
      </div>
    </BaseCard>

    <!-- مستكشف الذرّات -->
    <ResourceScaffold
      :columns="columns"
      :items="items"
      :loading="loading"
      :meta="meta"
      :sort-key="sortKey"
      :search="search"
      :filters="filterDefs"
      :active-filters="filters"
      :search-placeholder="t('admin.qcc.searchPlaceholder')"
      export-name="quality-atoms"
      @update:sort-key="r.setSort"
      @update:search="r.setSearch"
      @filter="r.setFilter"
      @update:page="r.setPage"
      @update:per-page="r.setPerPage"
    >
      <template #cell-caseId="{ row }">
        <span class="font-mono text-xs font-medium text-content">{{ row.caseId }}</span>
      </template>
      <template #cell-title="{ row }">
        <div class="max-w-md">
          <div class="truncate text-content" :title="row.title">{{ row.title }}</div>
          <div class="truncate text-[11px] text-muted" :title="row.section">{{ row.section }}</div>
        </div>
      </template>
      <template #cell-layer="{ row }">
        <BaseChip :color="LAYER_COLOR[row.layer] || 'neutral'">{{ layerLabel(row.layer) }}</BaseChip>
      </template>
      <template #cell-type="{ row }">
        <BaseChip v-if="row.type" color="neutral">{{ row.type }}</BaseChip>
        <span v-else class="text-muted">—</span>
      </template>
      <template #cell-priority="{ row }">
        <BaseChip :color="PRIORITY_COLOR[row.priority] || 'neutral'">{{ priorityLabel(row.priority) }}</BaseChip>
      </template>
      <template #cell-status="{ row }">
        <BaseChip :color="STATUS_COLOR[row.status] || 'neutral'">
          <BaseIcon :name="STATUS_ICON[row.status]" :size="12" />{{ statusLabel(row.status) }}
        </BaseChip>
      </template>
      <template #cell-testFile="{ row }">
        <span v-if="row.testFile" class="font-mono text-[11px] text-muted" dir="ltr">{{ row.testFile }}</span>
        <span v-else class="text-muted">—</span>
      </template>
      <template #actions="{ row }">
        <div class="flex items-center justify-end gap-1">
          <BaseTooltip :text="t('admin.qcc.scaffold')">
            <button class="row-act text-brand" :aria-label="t('admin.qcc.scaffold')" @click="openScaffold(row)"><BaseIcon name="mdi-flask-outline" :size="17" /></button>
          </BaseTooltip>
          <BaseTooltip v-if="canManage" :text="t('admin.qcc.dispatch')">
            <button class="row-act text-brand" :aria-label="t('admin.qcc.dispatch')" @click="openDispatch(row)"><BaseIcon name="mdi-directions-fork" :size="17" /></button>
          </BaseTooltip>
        </div>
      </template>
    </ResourceScaffold>

    <!-- حوار هيكل الاختبار (ف5) -->
    <BaseModal v-model="scaffoldOpen" :title="t('admin.qcc.scaffoldTitle', { id: scaffold?.caseId })" :max-width="720">
      <div v-if="scaffoldLoading" class="flex h-40 items-center justify-center">
        <BaseIcon name="mdi-loading" :size="26" class="animate-spin text-brand" />
      </div>
      <div v-else-if="scaffold">
        <div class="mb-2 flex flex-wrap items-center gap-2 text-xs">
          <BaseChip color="brand">{{ scaffold.framework }}</BaseChip>
          <span class="font-mono text-muted" dir="ltr">{{ scaffold.filename }}</span>
          <BaseButton variant="ghost" size="sm" class="ms-auto" @click="copyScaffold"><BaseIcon name="mdi-content-copy" :size="16" />{{ t('admin.qcc.copy') }}</BaseButton>
        </div>
        <pre class="max-h-[55vh] overflow-auto rounded-ui border border-ui bg-ui/30 p-3 text-[12px] leading-relaxed text-content" dir="ltr"><code>{{ scaffold.code }}</code></pre>
      </div>
    </BaseModal>

    <!-- حوار التحويل -->
    <BaseModal v-model="dispatchOpen" :title="t('admin.qcc.dispatchTitle', { id: dispatchTarget?.caseId })" :max-width="480">
      <div class="space-y-3">
        <div>
          <label class="mb-1 block text-xs font-medium text-muted">{{ t('admin.qcc.fieldDept') }}</label>
          <BaseSelect v-model="dispatchForm.department" :items="deptOptions" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-muted">{{ t('admin.qcc.fieldState') }}</label>
          <BaseSelect v-model="dispatchForm.state" :items="stateOptions" />
        </div>
        <BaseInput v-model="dispatchForm.note" :label="t('admin.qcc.fieldNote')" />
      </div>
      <template #actions>
        <BaseButton variant="ghost" @click="dispatchOpen = false">{{ t('admin.users.cancel') }}</BaseButton>
        <BaseButton variant="brand" :disabled="!dispatchForm.department" @click="submitDispatch">
          <BaseIcon name="mdi-check" :size="18" />{{ t('admin.qcc.dispatch') }}
        </BaseButton>
      </template>
    </BaseModal>

    <BaseSnackbar v-model="snack.show" :color="snack.color">{{ snack.text }}</BaseSnackbar>
  </div>
</template>

<style scoped>
.row-act {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  transition: background-color 0.15s ease;
}
.row-act:hover {
  background: rgba(var(--v-theme-on-surface), 0.08);
}
</style>
