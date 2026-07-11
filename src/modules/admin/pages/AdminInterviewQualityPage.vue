<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/shared/PageHeader.vue'
import StatCard from '@/components/shared/StatCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseDrawer from '@/components/ui/BaseDrawer.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseSnackbar from '@/components/ui/BaseSnackbar.vue'
import BaseSwitch from '@/components/ui/BaseSwitch.vue'
import BaseTooltip from '@/components/ui/BaseTooltip.vue'
import DonutChart from '@/components/charts/DonutChart.vue'
import ResourceScaffold from '@/modules/admin/components/ResourceScaffold.vue'
import type { FilterDef } from '@/modules/admin/components/ResourceScaffold.vue'
import type { TableColumn } from '@/components/ui/BaseTable.vue'
import { useAdminResource } from '@/modules/admin/composables/useAdminResource'
import { confirm } from '@/components/ui/confirm'
import {
  type AdminInterviewDetail, type AdminInterviewRow, type AdminInterviewRubric,
  type InterviewCalibration, type InterviewQualityStats, type IntegrityLevel,
  type RubricCriterion, api,
} from '@/services/api'
import { useAuthStore } from '@/stores/AuthStore'

const { t } = useI18n()
const auth = useAuthStore()
const canManage = computed(() => auth.hasPermission('manage_interview_quality'))

const r = useAdminResource<AdminInterviewRow>({ fetcher: params => api.admin.interviewQuality(params), initialSort: '-id' })
const { items, meta, loading, sortKey, search, filters } = r

const stats = ref<InterviewQualityStats | null>(null)
const calibration = ref<InterviewCalibration | null>(null)
const rubrics = ref<AdminInterviewRubric[]>([])
async function loadStats() { try { stats.value = await api.admin.interviewQualityStats() } catch { /* تجاهل */ } }
async function loadCalibration() { try { calibration.value = await api.admin.interviewCalibration() } catch { /* تجاهل */ } }
async function loadRubrics() { try { rubrics.value = await api.admin.interviewRubrics() } catch { /* تجاهل */ } }
onMounted(() => { loadStats(); loadCalibration(); loadRubrics() })
function refreshAll() { r.refresh(); loadStats(); loadCalibration() }

const snack = ref({ show: false, text: '', color: 'success' })
function toast(text: string, color = 'success') { snack.value = { show: true, text, color } }
function fail(e: unknown) { toast((e as { message?: string })?.message ?? t('admin.toast.failed'), 'error') }

// ——— ألوان/تسميات ———
const LEVEL_COLOR: Record<string, 'success' | 'warning' | 'error'> = { low: 'success', medium: 'warning', high: 'error' }
const REVIEW_COLOR: Record<string, 'warning' | 'success' | 'error'> = { pending: 'warning', approved: 'success', flagged: 'error' }
const levelLabel = (l: string) => t(`admin.iquality.level_${l}`)
const reviewLabel = (s: string) => t(`admin.iquality.review_${s}`)
const scoreColor = (n: number) => (n >= 75 ? 'var(--v-theme-success)' : n >= 50 ? 'var(--v-theme-warning)' : 'var(--v-theme-error)')

const trackOptions = computed(() => (calibration.value?.tracks ?? []).map(x => ({ value: x.track, label: x.track })))
const columns: TableColumn[] = [
  { key: 'candidateName', label: t('admin.iquality.colCandidate'), sortable: false },
  { key: 'track', label: t('admin.iquality.colTrack'), align: 'center' },
  { key: 'score', label: t('admin.iquality.colScore'), sortable: true, align: 'center' },
  { key: 'integrityLevel', label: t('admin.iquality.colIntegrity'), align: 'center' },
  { key: 'reviewStatus', label: t('admin.iquality.colReview'), align: 'center' },
]
const filterDefs = computed<FilterDef[]>(() => [
  { key: 'track', label: t('admin.iquality.colTrack'), options: trackOptions.value },
  { key: 'review_status', label: t('admin.iquality.colReview'), options: ['pending', 'approved', 'flagged'].map(s => ({ value: s, label: reviewLabel(s) })) },
  { key: 'integrity', label: t('admin.iquality.colIntegrity'), options: (['low', 'medium', 'high'] as IntegrityLevel[]).map(l => ({ value: l, label: levelLabel(l) })) },
])

// ——— درج التفصيل ———
const detailOpen = ref(false)
const detail = ref<AdminInterviewDetail | null>(null)
const loadingDetail = ref(false)
async function openDetail(row: AdminInterviewRow) {
  detailOpen.value = true
  detail.value = null
  loadingDetail.value = true
  try { detail.value = await api.admin.interviewDetail(row.id) }
  catch (e) { fail(e) }
  finally { loadingDetail.value = false }
}
async function review(status: string) {
  if (!detail.value)
    return
  try {
    await api.admin.reviewInterview(detail.value.id, status)
    detail.value = { ...detail.value, reviewStatus: status }
    toast(t('admin.iquality.reviewed'))
    refreshAll()
  }
  catch (e) { fail(e) }
}

// ——— محرّر المعيار (rubric) ———
const editorOpen = ref(false)
const mode = ref<'create' | 'edit'>('create')
const target = ref<AdminInterviewRubric | null>(null)
const form = ref<{ name: string, track: string, active: boolean, criteria: RubricCriterion[] }>({ name: '', track: '', active: true, criteria: [] })
const saving = ref(false)
const totalWeight = computed(() => form.value.criteria.reduce((s, c) => s + (Number(c.weight) || 0), 0))

function openCreateRubric() {
  mode.value = 'create'
  target.value = null
  form.value = { name: '', track: '', active: true, criteria: [{ key: 'criterion_1', label: '', weight: 50 }] }
  editorOpen.value = true
}
function openEditRubric(rb: AdminInterviewRubric) {
  mode.value = 'edit'
  target.value = rb
  form.value = { name: rb.name, track: rb.track, active: rb.active, criteria: rb.criteria.map(c => ({ ...c })) }
  editorOpen.value = true
}
function addCriterion() { form.value.criteria.push({ key: `criterion_${form.value.criteria.length + 1}`, label: '', weight: 0 }) }
function removeCriterion(i: number) { form.value.criteria.splice(i, 1) }
async function saveRubric() {
  saving.value = true
  const payload = {
    name: form.value.name.trim(),
    track: form.value.track.trim(),
    active: form.value.active,
    criteria: form.value.criteria.filter(c => c.label.trim()).map(c => ({ key: c.key || c.label, label: c.label.trim(), weight: Number(c.weight) || 0 })),
  }
  try {
    if (mode.value === 'create')
      await api.admin.createRubric(payload)
    else if (target.value)
      await api.admin.updateRubric(target.value.id, payload)
    toast(mode.value === 'create' ? t('admin.iquality.rubricCreated') : t('admin.toast.updated'))
    editorOpen.value = false
    loadRubrics()
  }
  catch (e) { fail(e) }
  finally { saving.value = false }
}
async function removeRubric(rb: AdminInterviewRubric) {
  const ok = await confirm({ title: t('admin.iquality.confirmDeleteTitle'), message: t('admin.iquality.confirmDeleteMsg', { name: rb.name }), confirmText: t('admin.iquality.delete'), tone: 'danger', icon: 'mdi-delete-outline' })
  if (!ok)
    return
  try { await api.admin.deleteRubric(rb.id); toast(t('admin.toast.updated')); loadRubrics() }
  catch (e) { fail(e) }
}
</script>

<template>
  <div>
    <PageHeader :title="t('admin.iquality.title')" :subtitle="t('admin.iquality.subtitle')" icon="mdi-clipboard-check-outline" />

    <!-- شريط الإحصاءات -->
    <div class="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div class="grid grid-cols-2 gap-3 lg:col-span-2">
        <StatCard icon="mdi-clipboard-text-outline" :value="stats?.total ?? 0" :title="t('admin.iquality.statTotal')" color="primary" />
        <StatCard icon="mdi-star-outline" :value="stats?.avgScore ?? 0" :title="t('admin.iquality.statAvg')" color="info" />
        <StatCard icon="mdi-flag-outline" :value="stats?.flagged ?? 0" :title="t('admin.iquality.statFlagged')" color="warning" />
        <StatCard icon="mdi-shield-alert-outline" :value="stats?.highRisk ?? 0" :title="t('admin.iquality.statHighRisk')" color="error" />
      </div>
      <BaseCard>
        <div class="mb-2 flex items-center gap-2">
          <BaseIcon name="mdi-chart-donut" :size="18" class="text-brand" />
          <h2 class="text-sm font-bold text-content">{{ t('admin.iquality.byIntegrity') }}</h2>
        </div>
        <DonutChart v-if="stats?.byIntegrity?.length" :data="stats.byIntegrity.map(d => ({ label: levelLabel(d.label), value: d.value }))" :size="150" :center-label="t('admin.iquality.statTotal')" />
        <p v-else class="py-6 text-center text-xs text-muted">—</p>
      </BaseCard>
    </div>

    <!-- المعايرة (تحيّز المسارات) -->
    <BaseCard class="mb-5">
      <div class="mb-3 flex items-center gap-2">
        <BaseIcon name="mdi-scale-balance" :size="18" class="text-brand" />
        <h2 class="text-sm font-bold text-content">{{ t('admin.iquality.calibration') }}</h2>
        <span class="text-xs text-muted">· {{ t('admin.iquality.overallAvg') }}: <b class="text-content">{{ calibration?.overallAvg ?? 0 }}</b></span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-xs text-muted">
            <tr class="border-b border-ui">
              <th class="py-2 text-start font-medium">{{ t('admin.iquality.colTrack') }}</th>
              <th class="py-2 text-center font-medium">{{ t('admin.iquality.colCount') }}</th>
              <th class="py-2 text-center font-medium">{{ t('admin.iquality.colAvg') }}</th>
              <th class="py-2 text-center font-medium">{{ t('admin.iquality.colRange') }}</th>
              <th class="py-2 text-center font-medium">{{ t('admin.iquality.colHighRisk') }}</th>
              <th class="py-2 text-center font-medium">{{ t('admin.iquality.colBias') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in calibration?.tracks ?? []" :key="row.track" class="border-b border-ui/50">
              <td class="py-2 font-medium text-content">{{ row.track }}</td>
              <td class="py-2 text-center text-muted">{{ row.count }}</td>
              <td class="py-2 text-center text-content">{{ row.avgScore }}</td>
              <td class="py-2 text-center text-muted">{{ row.minScore }}–{{ row.maxScore }}</td>
              <td class="py-2 text-center">
                <BaseChip :color="row.highRiskRate >= 25 ? 'error' : row.highRiskRate > 0 ? 'warning' : 'success'">{{ row.highRiskRate }}%</BaseChip>
              </td>
              <td class="py-2 text-center">
                <BaseChip :color="Math.abs(row.bias) < 3 ? 'neutral' : row.bias > 0 ? 'warning' : 'info'">
                  {{ row.bias > 0 ? '+' : '' }}{{ row.bias }} · {{ Math.abs(row.bias) < 3 ? t('admin.iquality.biasBalanced') : row.bias > 0 ? t('admin.iquality.biasLenient') : t('admin.iquality.biasStrict') }}
                </BaseChip>
              </td>
            </tr>
            <tr v-if="!(calibration?.tracks?.length)"><td colspan="6" class="py-4 text-center text-xs text-muted">—</td></tr>
          </tbody>
        </table>
      </div>
    </BaseCard>

    <!-- مكتبة المعايير (rubrics) -->
    <BaseCard class="mb-5">
      <div class="mb-3 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <BaseIcon name="mdi-format-list-checks" :size="18" class="text-brand" />
          <h2 class="text-sm font-bold text-content">{{ t('admin.iquality.rubrics') }} ({{ rubrics.length }})</h2>
        </div>
        <BaseButton v-if="canManage" variant="brand" size="sm" @click="openCreateRubric">
          <BaseIcon name="mdi-plus" :size="18" />{{ t('admin.iquality.newRubric') }}
        </BaseButton>
      </div>
      <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <div v-for="rb in rubrics" :key="rb.id" class="rounded-ui border-ui p-3">
          <div class="mb-1.5 flex items-center gap-2">
            <span class="flex-1 font-medium text-content">{{ rb.name }}</span>
            <BaseChip color="neutral">{{ rb.track }}</BaseChip>
            <BaseChip v-if="rb.isSystem" color="info">{{ t('admin.iquality.system') }}</BaseChip>
          </div>
          <div class="space-y-1">
            <div v-for="c in rb.criteria" :key="c.key" class="flex items-center gap-2 text-xs">
              <span class="flex-1 text-muted">{{ c.label }}</span>
              <span class="font-mono text-content">{{ c.weight }}%</span>
            </div>
          </div>
          <div v-if="canManage" class="mt-2 flex items-center justify-end gap-1 border-t border-ui pt-2">
            <BaseTooltip :text="t('admin.iquality.edit')">
              <button class="row-act text-brand" :aria-label="t('admin.iquality.edit')" @click="openEditRubric(rb)"><BaseIcon name="mdi-pencil-outline" :size="17" /></button>
            </BaseTooltip>
            <BaseTooltip v-if="!rb.isSystem" :text="t('admin.iquality.delete')">
              <button class="row-act" style="color: rgb(var(--v-theme-error))" :aria-label="t('admin.iquality.delete')" @click="removeRubric(rb)"><BaseIcon name="mdi-delete-outline" :size="17" /></button>
            </BaseTooltip>
          </div>
        </div>
        <p v-if="!rubrics.length" class="col-span-full rounded-ui border border-dashed border-ui py-4 text-center text-xs text-muted">—</p>
      </div>
    </BaseCard>

    <!-- طابور المقابلات -->
    <ResourceScaffold
      :columns="columns"
      :items="items"
      :loading="loading"
      :meta="meta"
      :sort-key="sortKey"
      :search="search"
      :filters="filterDefs"
      :active-filters="filters"
      :search-placeholder="t('admin.iquality.searchPlaceholder')"
      inspectable
      export-name="interview-quality"
      @row-click="openDetail"
      @update:sort-key="r.setSort"
      @update:search="r.setSearch"
      @filter="r.setFilter"
      @update:page="r.setPage"
      @update:per-page="r.setPerPage"
    >
      <template #cell-candidateName="{ row }">
        <span class="font-medium text-content">{{ row.candidateName || '—' }}</span>
      </template>
      <template #cell-track="{ row }">
        <BaseChip color="neutral">{{ row.track }}</BaseChip>
      </template>
      <template #cell-score="{ row }">
        <div class="flex items-center justify-center gap-2">
          <div class="h-1.5 w-16 overflow-hidden rounded-full bg-ui">
            <div class="h-full rounded-full" :style="{ width: `${row.score}%`, background: `rgb(${scoreColor(row.score)})` }" />
          </div>
          <span class="font-mono text-xs text-content">{{ row.score }}</span>
        </div>
      </template>
      <template #cell-integrityLevel="{ row }">
        <BaseChip :color="LEVEL_COLOR[row.integrityLevel]">
          <BaseIcon :name="row.integrityLevel === 'high' ? 'mdi-shield-alert' : row.integrityLevel === 'medium' ? 'mdi-shield-half-full' : 'mdi-shield-check'" :size="12" />
          {{ levelLabel(row.integrityLevel) }}
        </BaseChip>
      </template>
      <template #cell-reviewStatus="{ row }">
        <BaseChip :color="REVIEW_COLOR[row.reviewStatus] || 'neutral'">{{ reviewLabel(row.reviewStatus) }}</BaseChip>
      </template>
    </ResourceScaffold>

    <!-- درج التفصيل -->
    <BaseDrawer v-model="detailOpen" :width="440">
      <div v-if="loadingDetail" class="flex h-full items-center justify-center">
        <BaseIcon name="mdi-loading" :size="28" class="animate-spin text-brand" />
      </div>
      <div v-else-if="detail" class="p-4">
        <div class="mb-1 flex items-center gap-2">
          <BaseIcon name="mdi-account-tie-outline" :size="22" class="text-brand" />
          <h3 class="text-base font-bold text-content">{{ detail.candidateName || '—' }}</h3>
        </div>
        <div class="mb-3 flex flex-wrap items-center gap-1.5">
          <BaseChip color="neutral">{{ detail.track }}</BaseChip>
          <BaseChip v-if="detail.rubric" color="brand">{{ detail.rubric.name }}</BaseChip>
          <BaseChip :color="REVIEW_COLOR[detail.reviewStatus] || 'neutral'">{{ reviewLabel(detail.reviewStatus) }}</BaseChip>
        </div>

        <!-- الدرجة الموزونة -->
        <div class="mb-3 flex items-center gap-3 rounded-ui border-ui p-3">
          <div class="text-center">
            <div class="text-2xl font-bold" :style="{ color: `rgb(${scoreColor(detail.score)})` }">{{ detail.score }}</div>
            <div class="text-[11px] text-muted">{{ t('admin.iquality.score') }}</div>
          </div>
          <div v-if="detail.weightedScore !== null" class="text-center">
            <div class="text-lg font-bold text-content">{{ detail.weightedScore }}</div>
            <div class="text-[11px] text-muted">{{ t('admin.iquality.weighted') }}</div>
          </div>
        </div>

        <!-- تفكيك المعايير -->
        <div v-if="detail.breakdown.length" class="mb-3">
          <p class="mb-1.5 text-xs font-bold text-content">{{ t('admin.iquality.breakdown') }}</p>
          <div class="space-y-2">
            <div v-for="b in detail.breakdown" :key="b.key">
              <div class="mb-0.5 flex items-center justify-between text-xs">
                <span class="text-muted">{{ b.label }} <span class="text-[10px]">({{ b.weight }}%)</span></span>
                <span class="font-mono text-content">{{ b.score }}</span>
              </div>
              <div class="h-1.5 w-full overflow-hidden rounded-full bg-ui">
                <div class="h-full rounded-full" :style="{ width: `${b.score}%`, background: `rgb(${scoreColor(b.score)})` }" />
              </div>
            </div>
          </div>
        </div>

        <!-- النزاهة -->
        <div class="mb-3 rounded-ui border-ui p-3">
          <div class="mb-1.5 flex items-center justify-between">
            <span class="text-xs font-bold text-content">{{ t('admin.iquality.integrity') }}</span>
            <BaseChip :color="LEVEL_COLOR[detail.integrity.level]">{{ levelLabel(detail.integrity.level) }} · {{ detail.integrity.score }}</BaseChip>
          </div>
          <div v-if="detail.integrity.signals.length" class="flex flex-wrap gap-1.5">
            <BaseChip v-for="s in detail.integrity.signals" :key="s.key" color="warning">
              <BaseIcon name="mdi-alert-outline" :size="12" />{{ s.label }}: {{ s.count }}
            </BaseChip>
          </div>
          <p v-else class="text-xs text-muted">{{ t('admin.iquality.noSignals') }}</p>
        </div>

        <!-- إجراءات المراجعة -->
        <div v-if="canManage" class="flex items-center gap-2">
          <BaseButton variant="emerald" size="sm" :disabled="detail.reviewStatus === 'approved'" @click="review('approved')">
            <BaseIcon name="mdi-check-decagram-outline" :size="17" />{{ t('admin.iquality.approve') }}
          </BaseButton>
          <BaseButton variant="ghost" size="sm" style="color: rgb(var(--v-theme-error))" :disabled="detail.reviewStatus === 'flagged'" @click="review('flagged')">
            <BaseIcon name="mdi-flag-outline" :size="17" />{{ t('admin.iquality.flag') }}
          </BaseButton>
        </div>
      </div>
    </BaseDrawer>

    <!-- محرّر المعيار -->
    <BaseModal v-model="editorOpen" :title="mode === 'create' ? t('admin.iquality.newRubric') : t('admin.iquality.editRubric', { name: target?.name })" :max-width="620">
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <BaseInput v-model="form.name" :label="t('admin.iquality.fieldName')" />
          <BaseInput v-model="form.track" :label="t('admin.iquality.fieldTrack')" />
        </div>

        <div>
          <div class="mb-1.5 flex items-center justify-between">
            <span class="text-sm font-bold text-content">{{ t('admin.iquality.criteria') }}</span>
            <span class="text-xs" :class="totalWeight === 100 ? 'text-muted' : 'text-warning'">{{ t('admin.iquality.totalWeight') }}: {{ totalWeight }}%</span>
          </div>
          <div class="space-y-2">
            <div v-for="(c, i) in form.criteria" :key="i" class="flex items-center gap-2">
              <BaseInput v-model="c.label" class="flex-1" :placeholder="t('admin.iquality.criterionLabel')" />
              <BaseInput v-model.number="c.weight" type="number" class="w-24" :placeholder="t('admin.iquality.weight')" />
              <button class="mv" style="color: rgb(var(--v-theme-error))" :aria-label="t('admin.iquality.removeCriterion')" @click="removeCriterion(i)"><BaseIcon name="mdi-close" :size="16" /></button>
            </div>
          </div>
          <button class="type-pill mt-2" @click="addCriterion"><BaseIcon name="mdi-plus" :size="14" />{{ t('admin.iquality.addCriterion') }}</button>
        </div>

        <BaseSwitch v-model="form.active" :label="t('admin.iquality.fieldActive')" />
      </div>
      <template #actions>
        <BaseButton variant="ghost" @click="editorOpen = false">{{ t('admin.users.cancel') }}</BaseButton>
        <BaseButton variant="brand" :disabled="saving || !form.name.trim() || !form.track.trim() || !form.criteria.some(c => c.label.trim())" @click="saveRubric">
          <BaseIcon name="mdi-check" :size="18" />{{ mode === 'create' ? t('admin.iquality.create') : t('admin.iquality.save') }}
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
.mv {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 6px;
  color: rgb(var(--v-theme-on-surface));
}
.mv:hover {
  background: rgba(var(--v-theme-on-surface), 0.08);
}
.type-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 11px;
  border-radius: 8px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.15);
  font-size: 0.75rem;
  color: rgb(var(--v-theme-on-surface));
  transition: all 0.15s ease;
}
.type-pill:hover {
  border-color: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.06);
}
</style>
