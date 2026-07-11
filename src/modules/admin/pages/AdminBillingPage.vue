<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/shared/PageHeader.vue'
import StatCard from '@/components/shared/StatCard.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseSnackbar from '@/components/ui/BaseSnackbar.vue'
import BaseTooltip from '@/components/ui/BaseTooltip.vue'
import LineChart from '@/components/charts/LineChart.vue'
import DonutChart from '@/components/charts/DonutChart.vue'
import ResourceScaffold from '@/modules/admin/components/ResourceScaffold.vue'
import type { FilterDef } from '@/modules/admin/components/ResourceScaffold.vue'
import type { TableColumn } from '@/components/ui/BaseTable.vue'
import { useAdminResource } from '@/modules/admin/composables/useAdminResource'
import { confirm } from '@/components/ui/confirm'
import { type AdminBillingStats, type AdminInvoice, api } from '@/services/api'
import { useAuthStore } from '@/stores/AuthStore'

const { t } = useI18n()
const auth = useAuthStore()
const canManage = computed(() => auth.hasPermission('manage_billing'))
const r = useAdminResource<AdminInvoice>({ fetcher: params => api.admin.invoices(params), initialSort: '-id' })
const { items, meta, loading, sortKey, search, filters } = r

const stats = ref<AdminBillingStats | null>(null)
async function loadStats() { try { stats.value = await api.admin.invoicesStats() } catch { /* تجاهل */ } }
onMounted(loadStats)
function refreshAll() { r.refresh(); loadStats() }
const seriesData = computed(() => (stats.value?.series ?? []).map(s => ({ label: s.date.slice(5), value: s.value })))

const columns: TableColumn[] = [
  { key: 'reference', label: t('admin.billing.colRef') },
  { key: 'user', label: t('admin.billing.colUser') },
  { key: 'plan_name', label: t('admin.billing.colPlan') },
  { key: 'amount', label: t('admin.billing.colAmount'), sortable: true, align: 'center' },
  { key: 'status', label: t('admin.billing.colStatus'), sortable: true, align: 'center' },
  { key: 'created_at', label: t('admin.billing.colDate'), sortable: true },
]
const filterDefs: FilterDef[] = [
  { key: 'status', label: t('admin.billing.colStatus'), options: [
    { value: 'paid', label: t('admin.billing.statusPaid') }, { value: 'refunded', label: t('admin.billing.statusRefunded') },
  ] },
]

const snack = ref({ show: false, text: '', color: 'success' })
function toast(text: string, color = 'success') { snack.value = { show: true, text, color } }
function fail(e: unknown) { toast((e as { message?: string })?.message ?? t('admin.toast.failed'), 'error') }
function fmtDate(iso?: string) { return iso ? new Date(iso).toLocaleDateString() : '—' }

async function refund(inv: AdminInvoice) {
  const ok = await confirm({
    title: t('admin.billing.confirmRefundTitle'),
    message: t('admin.billing.confirmRefundMsg', { ref: inv.reference ?? inv.id, amount: inv.amount }),
    confirmText: t('admin.billing.refund'),
    tone: 'danger',
    icon: 'mdi-cash-refund',
  })
  if (!ok)
    return
  try { await api.admin.refundInvoice(inv.id); toast(t('admin.billing.refunded')); refreshAll() }
  catch (e) { fail(e) }
}
</script>

<template>
  <div>
    <PageHeader :title="t('admin.billing.title')" :subtitle="t('admin.billing.subtitle')" icon="mdi-receipt-text-outline" />

    <!-- شريط الإحصاءات -->
    <div class="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
      <StatCard icon="mdi-cash-multiple" :value="`${(stats?.revenue ?? 0).toLocaleString()} ر.س`" :title="t('admin.billing.statRevenue')" color="success" />
      <StatCard icon="mdi-receipt-text-outline" :value="stats?.invoices ?? 0" :title="t('admin.billing.statInvoices')" color="primary" />
      <StatCard icon="mdi-check-circle-outline" :value="stats?.paid ?? 0" :title="t('admin.billing.statPaid')" color="info" />
      <StatCard icon="mdi-cash-refund" :value="stats?.refunded ?? 0" :title="t('admin.billing.statRefunded')" color="error" />
    </div>

    <div class="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
      <BaseCard class="lg:col-span-2">
        <div class="mb-3 flex items-center gap-2">
          <BaseIcon name="mdi-chart-line" :size="20" class="text-brand" />
          <h2 class="text-base font-bold text-content">{{ t('admin.billing.revenueTrend') }}</h2>
        </div>
        <LineChart v-if="seriesData.length" :data="seriesData" color="success" :height="190" />
      </BaseCard>
      <BaseCard>
        <div class="mb-3 flex items-center gap-2">
          <BaseIcon name="mdi-chart-donut" :size="20" class="text-brand" />
          <h2 class="text-base font-bold text-content">{{ t('admin.billing.byPlan') }}</h2>
        </div>
        <DonutChart v-if="stats?.byPlan?.length" :data="stats.byPlan" :size="150" :center-label="t('admin.billing.statRevenue')" />
        <p v-else class="py-6 text-center text-xs text-muted">{{ t('admin.billing.noRevenue') }}</p>
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
      :search-placeholder="t('admin.billing.searchPlaceholder')"
      export-name="invoices"
      @update:sort-key="r.setSort"
      @update:search="r.setSearch"
      @filter="r.setFilter"
      @update:page="r.setPage"
      @update:per-page="r.setPerPage"
    >
      <template #cell-reference="{ row }">
        <span class="font-mono text-xs text-content" dir="ltr">{{ row.reference ?? `#${row.id}` }}</span>
      </template>
      <template #cell-amount="{ row }">
        <span class="font-bold text-content">{{ row.amount.toLocaleString() }} <span class="text-xs text-muted">ر.س</span></span>
      </template>
      <template #cell-status="{ row }">
        <BaseChip :color="row.status === 'paid' ? 'success' : 'error'">{{ row.status === 'paid' ? t('admin.billing.statusPaid') : t('admin.billing.statusRefunded') }}</BaseChip>
      </template>
      <template #cell-created_at="{ row }">
        <span class="text-muted">{{ fmtDate(row.createdAt) }}</span>
      </template>

      <template #actions="{ row }">
        <BaseTooltip v-if="row.status === 'paid' && canManage" :text="t('admin.billing.refund')">
          <button class="row-act" style="color: rgb(var(--v-theme-error))" :aria-label="t('admin.billing.refund')" @click="refund(row)">
            <BaseIcon name="mdi-cash-refund" :size="18" />
          </button>
        </BaseTooltip>
        <span v-else class="text-xs text-muted">—</span>
      </template>
    </ResourceScaffold>

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
</style>
