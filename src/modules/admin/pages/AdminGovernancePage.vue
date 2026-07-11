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
import BaseSnackbar from '@/components/ui/BaseSnackbar.vue'
import BaseTooltip from '@/components/ui/BaseTooltip.vue'
import DonutChart from '@/components/charts/DonutChart.vue'
import BarChart from '@/components/charts/BarChart.vue'
import ResourceScaffold from '@/modules/admin/components/ResourceScaffold.vue'
import type { FilterDef } from '@/modules/admin/components/ResourceScaffold.vue'
import type { TableColumn } from '@/components/ui/BaseTable.vue'
import { useAdminResource } from '@/modules/admin/composables/useAdminResource'
import { confirm } from '@/components/ui/confirm'
import { type AdminModerationDetail, type AdminModerationItem, type AdminModerationStats, api } from '@/services/api'
import { useAuthStore } from '@/stores/AuthStore'

const { t } = useI18n()
const auth = useAuthStore()
const canManage = computed(() => auth.hasPermission('manage_governance'))
const r = useAdminResource<AdminModerationItem>({ fetcher: params => api.admin.moderation(params), initialSort: '-id' })
const { items, meta, loading, sortKey, search, filters, selected } = r

const stats = ref<AdminModerationStats | null>(null)
async function loadStats() { try { stats.value = await api.admin.moderationStats() } catch { /* تجاهل */ } }
onMounted(loadStats)
function refreshAll() { r.refresh(); loadStats() }

const TYPES = ['expert_application', 'skill_verification', 'content_report', 'endorsement']
const typeLabel = (x: string) => t(`admin.governance.type_${x}`)
const typeIcon: Record<string, string> = { expert_application: 'mdi-account-star-outline', skill_verification: 'mdi-certificate-outline', content_report: 'mdi-flag-outline', endorsement: 'mdi-thumb-up-outline' }
const typeColor: Record<string, 'brand' | 'info' | 'error' | 'success' | 'neutral'> = { expert_application: 'brand', skill_verification: 'info', content_report: 'error', endorsement: 'success' }
const statusColor: Record<string, 'warning' | 'success' | 'error' | 'neutral'> = { pending: 'warning', approved: 'success', rejected: 'error', resolved: 'neutral' }

const columns: TableColumn[] = [
  { key: 'type', label: t('admin.governance.colType'), align: 'center' },
  { key: 'subject', label: t('admin.governance.colSubject') },
  { key: 'submitter', label: t('admin.governance.colSubmitter') },
  { key: 'status', label: t('admin.governance.colStatus'), sortable: true, align: 'center' },
  { key: 'created_at', label: t('admin.governance.colDate'), sortable: true },
]
const filterDefs: FilterDef[] = [
  { key: 'type', label: t('admin.governance.colType'), options: TYPES.map(x => ({ value: x, label: typeLabel(x) })) },
  { key: 'status', label: t('admin.governance.colStatus'), options: ['pending', 'approved', 'rejected', 'resolved'].map(s => ({ value: s, label: t(`admin.governance.st_${s}`) })) },
]

const snack = ref({ show: false, text: '', color: 'success' })
function toast(text: string, color = 'success') { snack.value = { show: true, text, color } }
function fail(e: unknown) { toast((e as { message?: string })?.message ?? t('admin.toast.failed'), 'error') }
function fmtDate(iso?: string) { return iso ? new Date(iso).toLocaleDateString() : '—' }

async function decide(m: AdminModerationItem, decision: 'approved' | 'rejected' | 'resolved') {
  if (decision !== 'approved') {
    const ok = await confirm({
      title: t(`admin.governance.confirm_${decision}_title`),
      message: t('admin.governance.confirmMsg', { subject: m.subject }),
      confirmText: t(`admin.governance.st_${decision}`),
      tone: 'danger',
      icon: decision === 'rejected' ? 'mdi-close-circle-outline' : 'mdi-check-all',
    })
    if (!ok)
      return
  }
  try { await api.admin.resolveModeration(m.id, decision); toast(t('admin.governance.done')); refreshAll(); detailOpen.value = false }
  catch (e) { fail(e) }
}

// ===== درج التفصيل (مراجعة عميقة + لقطة الهدف) =====
const detailOpen = ref(false)
const detail = ref<AdminModerationDetail | null>(null)
const loadingDetail = ref(false)
async function openDetail(row: AdminModerationItem) {
  detailOpen.value = true
  loadingDetail.value = true
  detail.value = null
  try { detail.value = await api.admin.moderationDetail(row.id) }
  catch (e) { fail(e) }
  finally { loadingDetail.value = false }
}

function setSelected(v: (string | number)[]) { selected.value = v }

// ===== بتّ جماعيّ =====
async function bulkDecide(decision: 'approved' | 'rejected' | 'resolved') {
  const ids = selected.value.map(Number)
  if (!ids.length)
    return
  const ok = await confirm({
    title: t('admin.governance.bulkConfirmTitle'),
    message: t('admin.governance.bulkConfirmMsg', { count: ids.length, decision: t(`admin.governance.st_${decision}`) }),
    confirmText: t(`admin.governance.st_${decision}`),
    tone: decision === 'approved' ? 'default' : 'danger',
  })
  if (!ok)
    return
  try {
    const res = await api.admin.bulkResolveModeration(ids, decision)
    toast(t('admin.governance.bulkDone', { count: res.resolved }))
    r.clearSelection()
    refreshAll()
  }
  catch (e) { fail(e) }
}
</script>

<template>
  <div>
    <PageHeader :title="t('admin.governance.title')" :subtitle="t('admin.governance.subtitle')" icon="mdi-gavel" />

    <!-- شريط الإحصاءات -->
    <div class="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
      <StatCard icon="mdi-clock-alert-outline" :value="stats?.pending ?? 0" :title="t('admin.governance.statPending')" color="warning" />
      <StatCard icon="mdi-check-circle-outline" :value="stats?.approved ?? 0" :title="t('admin.governance.statApproved')" color="success" />
      <StatCard icon="mdi-close-circle-outline" :value="stats?.rejected ?? 0" :title="t('admin.governance.statRejected')" color="error" />
      <StatCard icon="mdi-inbox-outline" :value="stats?.total ?? 0" :title="t('admin.governance.statTotal')" color="primary" />
    </div>

    <div class="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <BaseCard>
        <div class="mb-3 flex items-center gap-2">
          <BaseIcon name="mdi-chart-donut" :size="20" class="text-brand" />
          <h2 class="text-base font-bold text-content">{{ t('admin.governance.byType') }}</h2>
        </div>
        <DonutChart v-if="stats?.byType?.length" :data="stats.byType.map(x => ({ label: typeLabel(x.label), value: x.value }))" :size="150" :center-label="t('admin.governance.statTotal')" />
      </BaseCard>
      <BaseCard>
        <div class="mb-3 flex items-center gap-2">
          <BaseIcon name="mdi-chart-bar" :size="20" class="text-brand" />
          <h2 class="text-base font-bold text-content">{{ t('admin.governance.byStatus') }}</h2>
        </div>
        <BarChart v-if="stats?.byStatus?.length" :data="stats.byStatus.map(x => ({ label: t(`admin.governance.st_${x.label}`), value: x.value }))" color="secondary" :height="150" />
      </BaseCard>
    </div>

    <ResourceScaffold
      :columns="columns"
      :items="items"
      :loading="loading"
      :meta="meta"
      :sort-key="sortKey"
      :search="search"
      :filters="filterDefs"
      :active-filters="filters"
      :search-placeholder="t('admin.governance.searchPlaceholder')"
      export-name="moderation"
      :selectable="canManage"
      :selected="selected"
      inspectable
      @update:sort-key="r.setSort"
      @update:search="r.setSearch"
      @filter="r.setFilter"
      @update:page="r.setPage"
      @update:per-page="r.setPerPage"
      @update:selected="setSelected"
      @row-click="openDetail"
    >
      <template #bulk>
        <BaseButton size="sm" variant="ghost" @click="bulkDecide('approved')"><BaseIcon name="mdi-check-circle-outline" :size="16" />{{ t('admin.governance.st_approved') }}</BaseButton>
        <BaseButton size="sm" variant="ghost" @click="bulkDecide('rejected')"><BaseIcon name="mdi-close-circle-outline" :size="16" />{{ t('admin.governance.st_rejected') }}</BaseButton>
        <BaseButton size="sm" variant="ghost" @click="bulkDecide('resolved')"><BaseIcon name="mdi-check-all" :size="16" />{{ t('admin.governance.st_resolved') }}</BaseButton>
      </template>
      <template #cell-type="{ row }">
        <BaseChip :color="typeColor[row.type] || 'neutral'"><BaseIcon :name="typeIcon[row.type] || 'mdi-shield'" :size="12" />{{ typeLabel(row.type) }}</BaseChip>
      </template>
      <template #cell-subject="{ row }">
        <div>
          <div class="text-content">{{ row.subject }}</div>
          <div v-if="row.reason" class="text-[11px] text-muted">{{ row.reason }}</div>
        </div>
      </template>
      <template #cell-status="{ row }">
        <div class="flex items-center justify-center gap-1">
          <BaseChip :color="statusColor[row.status] || 'neutral'">{{ t(`admin.governance.st_${row.status}`) }}</BaseChip>
          <BaseChip v-if="row.removed" color="error"><BaseIcon name="mdi-delete-outline" :size="12" />{{ t('admin.governance.removed') }}</BaseChip>
        </div>
      </template>
      <template #cell-created_at="{ row }">
        <span class="text-muted">{{ fmtDate(row.createdAt) }}</span>
      </template>

      <template #actions="{ row }">
        <div v-if="row.status === 'pending' && canManage" class="flex items-center justify-end gap-1">
          <BaseTooltip v-if="row.type === 'content_report' || row.type === 'endorsement'" :text="t('admin.governance.st_resolved')">
            <button class="row-act" style="color: rgb(var(--v-theme-info))" :aria-label="t('admin.governance.st_resolved')" @click="decide(row, 'resolved')"><BaseIcon name="mdi-check-all" :size="18" /></button>
          </BaseTooltip>
          <BaseTooltip :text="t('admin.governance.st_approved')">
            <button class="row-act" style="color: rgb(var(--v-theme-success))" :aria-label="t('admin.governance.st_approved')" @click="decide(row, 'approved')"><BaseIcon name="mdi-check-circle-outline" :size="18" /></button>
          </BaseTooltip>
          <BaseTooltip :text="t('admin.governance.st_rejected')">
            <button class="row-act" style="color: rgb(var(--v-theme-error))" :aria-label="t('admin.governance.st_rejected')" @click="decide(row, 'rejected')"><BaseIcon name="mdi-close-circle-outline" :size="18" /></button>
          </BaseTooltip>
        </div>
        <span v-else class="text-xs text-muted">{{ row.resolver ?? '—' }}</span>
      </template>
    </ResourceScaffold>

    <!-- درج المراجعة العميقة -->
    <BaseDrawer v-model="detailOpen" :width="420">
      <div v-if="loadingDetail" class="p-6 text-center text-sm text-muted">…</div>
      <div v-else-if="detail" class="space-y-4 p-4">
        <div class="flex items-start gap-2">
          <BaseChip :color="typeColor[detail.type] || 'neutral'"><BaseIcon :name="typeIcon[detail.type] || 'mdi-shield'" :size="12" />{{ typeLabel(detail.type) }}</BaseChip>
          <BaseChip :color="statusColor[detail.status] || 'neutral'">{{ t(`admin.governance.st_${detail.status}`) }}</BaseChip>
          <BaseChip v-if="detail.removed" color="error"><BaseIcon name="mdi-delete-outline" :size="12" />{{ t('admin.governance.removed') }}</BaseChip>
        </div>

        <h3 class="text-base font-bold text-content">{{ detail.subject }}</h3>

        <div class="space-y-2 text-sm">
          <div class="gv-det"><span class="text-muted">{{ t('admin.governance.colSubmitter') }}</span><span class="text-content">{{ detail.submitter }}</span></div>
          <div v-if="detail.reason" class="gv-det"><span class="text-muted">{{ t('admin.governance.reason') }}</span><span class="text-content">{{ detail.reason }}</span></div>
          <div v-if="detail.resolver" class="gv-det"><span class="text-muted">{{ t('admin.governance.resolver') }}</span><span class="text-content">{{ detail.resolver }}</span></div>
        </div>

        <!-- لقطة الهدف -->
        <div v-if="detail.target" class="rounded-ui border-ui p-3">
          <div class="mb-2 flex items-center gap-1.5 text-xs font-bold text-content">
            <BaseIcon name="mdi-target" :size="15" class="text-brand" />{{ t('admin.governance.target') }}
          </div>
          <div class="space-y-1 text-xs">
            <div class="flex items-center gap-1.5"><span class="text-muted">{{ t('admin.governance.targetType') }}:</span><span class="font-mono text-content" dir="ltr">{{ detail.target.type }}#{{ detail.target.id }}</span></div>
            <div v-if="detail.target.title" class="flex items-center gap-1.5"><span class="text-muted">{{ t('admin.governance.targetTitle') }}:</span><span class="text-content">{{ detail.target.title }}</span></div>
            <div class="flex items-center gap-1.5">
              <BaseChip v-if="detail.target.removed" color="error">{{ t('admin.governance.targetRemoved') }}</BaseChip>
              <BaseChip v-else-if="detail.target.exists" color="success">{{ t('admin.governance.targetLive') }}</BaseChip>
              <BaseChip v-else color="neutral">{{ t('admin.governance.targetMissing') }}</BaseChip>
            </div>
          </div>
        </div>

        <!-- قرارات (للمعلّق فقط) -->
        <div v-if="detail.status === 'pending' && canManage" class="flex flex-wrap gap-2 pt-1">
          <BaseButton size="sm" variant="brand" @click="decide(detail, 'approved')"><BaseIcon name="mdi-check-circle-outline" :size="16" />{{ detail.type === 'content_report' ? t('admin.governance.upholdRemove') : t('admin.governance.st_approved') }}</BaseButton>
          <BaseButton size="sm" variant="ghost" @click="decide(detail, 'rejected')"><BaseIcon name="mdi-close-circle-outline" :size="16" />{{ t('admin.governance.st_rejected') }}</BaseButton>
          <BaseButton size="sm" variant="ghost" @click="decide(detail, 'resolved')"><BaseIcon name="mdi-check-all" :size="16" />{{ t('admin.governance.st_resolved') }}</BaseButton>
        </div>
      </div>
    </BaseDrawer>

    <BaseSnackbar v-model="snack.show" :color="snack.color">{{ snack.text }}</BaseSnackbar>
  </div>
</template>

<style scoped>
.row-act {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  transition: background-color 0.15s ease;
}
.row-act:hover {
  background: rgba(var(--v-theme-on-surface), 0.08);
}
.gv-det {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}
</style>
