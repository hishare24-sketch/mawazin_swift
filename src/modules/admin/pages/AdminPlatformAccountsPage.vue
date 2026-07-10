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
import LineChart from '@/components/charts/LineChart.vue'
import DonutChart from '@/components/charts/DonutChart.vue'
import ResourceScaffold from '@/modules/admin/components/ResourceScaffold.vue'
import type { FilterDef } from '@/modules/admin/components/ResourceScaffold.vue'
import type { TableColumn } from '@/components/ui/BaseTable.vue'
import { useAdminResource } from '@/modules/admin/composables/useAdminResource'
import { confirm } from '@/components/ui/confirm'
import { type AdminPlatformAccount, type AdminPlatformTxn, type AdminTreasuryStats, api } from '@/services/api'

const { t } = useI18n()
const r = useAdminResource<AdminPlatformAccount>({ fetcher: params => api.admin.platformAccounts(params), initialSort: '-balance' })
const { items, meta, loading, sortKey, search, filters } = r

const stats = ref<AdminTreasuryStats | null>(null)
async function loadStats() { try { stats.value = await api.admin.treasuryStats() } catch { /* تجاهل */ } }
onMounted(loadStats)
function refreshAll() { r.refresh(); loadStats() }

const columns: TableColumn[] = [
  { key: 'name', label: t('admin.treasury.colName'), sortable: true },
  { key: 'type', label: t('admin.treasury.colType'), align: 'center' },
  { key: 'bank_name', label: t('admin.treasury.colBank') },
  { key: 'balance', label: t('admin.treasury.colBalance'), sortable: true, align: 'center' },
  { key: 'transactions', label: t('admin.treasury.colTxns'), align: 'center' },
  { key: 'active', label: t('admin.treasury.colActive'), align: 'center' },
]
const filterDefs: FilterDef[] = [
  { key: 'type', label: t('admin.treasury.colType'), options: [
    { value: 'bank', label: t('admin.treasury.typeBank') }, { value: 'cash', label: t('admin.treasury.typeCash') }, { value: 'gateway', label: t('admin.treasury.typeGateway') },
  ] },
]
const typeLabel: Record<string, string> = { bank: t('admin.treasury.typeBank'), cash: t('admin.treasury.typeCash'), gateway: t('admin.treasury.typeGateway') }
const revenueSeries = computed(() => (stats.value?.revenueSeries ?? []).map(s => ({ label: s.date.slice(5), value: s.value })))

const snack = ref({ show: false, text: '', color: 'success' })
function toast(text: string, color = 'success') { snack.value = { show: true, text, color } }
function fail(e: unknown) { toast((e as { message?: string })?.message ?? t('admin.toast.failed'), 'error') }

// ——— إنشاء حساب ———
const createOpen = ref(false)
const cform = ref({ name: '', type: 'bank', bank_name: '', account_no_masked: '', notes: '', active: true })
const saving = ref(false)
function openCreate() { cform.value = { name: '', type: 'bank', bank_name: '', account_no_masked: '', notes: '', active: true }; createOpen.value = true }
async function create() {
  saving.value = true
  try {
    await api.admin.createPlatformAccount({ ...cform.value })
    toast(t('admin.treasury.created')); createOpen.value = false; refreshAll()
  }
  catch (e) { fail(e) }
  finally { saving.value = false }
}

// ——— إيداع/سحب ———
const adjustOpen = ref(false)
const target = ref<AdminPlatformAccount | null>(null)
const mode = ref<'credit' | 'debit'>('credit')
const amount = ref<number | null>(null)
const note = ref('')
const signed = computed(() => (amount.value ? (mode.value === 'credit' ? amount.value : -amount.value) : 0))
const projected = computed(() => (target.value ? target.value.balance + signed.value : 0))
function openAdjust(a: AdminPlatformAccount) { target.value = a; mode.value = 'credit'; amount.value = null; note.value = ''; adjustOpen.value = true }
async function applyAdjust() {
  if (!target.value || !amount.value || amount.value <= 0)
    return
  try {
    await api.admin.adjustPlatformAccount(target.value.id, signed.value, mode.value === 'credit' ? 'transfer' : 'payout', note.value.trim() || undefined)
    toast(t('admin.treasury.adjusted')); adjustOpen.value = false; refreshAll()
  }
  catch (e) { fail(e) }
}

// ——— دفتر الحركات ———
const ledgerOpen = ref(false)
const ledger = ref<AdminPlatformTxn[]>([])
const ledgerAccount = ref<AdminPlatformAccount | null>(null)
async function openLedger(a: AdminPlatformAccount) {
  ledgerAccount.value = a; ledgerOpen.value = true; ledger.value = []
  try { const res = await api.admin.platformAccountTxns(a.id); ledger.value = res.items }
  catch (e) { fail(e) }
}

async function remove(a: AdminPlatformAccount) {
  const ok = await confirm({
    title: t('admin.treasury.confirmDeleteTitle'),
    message: t('admin.treasury.confirmDeleteMsg', { name: a.name }),
    confirmText: t('admin.treasury.delete'),
    tone: 'danger',
    icon: 'mdi-delete-outline',
  })
  if (!ok)
    return
  try { await api.admin.deletePlatformAccount(a.id); toast(t('admin.toast.updated')); refreshAll() }
  catch (e) { fail(e) }
}
function fmtDate(iso?: string) { return iso ? new Date(iso).toLocaleString() : '—' }
</script>

<template>
  <div>
    <PageHeader :title="t('admin.treasury.title')" :subtitle="t('admin.treasury.subtitle')" icon="mdi-bank-outline" />

    <!-- شريط الإحصاءات -->
    <div class="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
      <StatCard icon="mdi-bank-outline" :value="`${(stats?.treasury ?? 0).toLocaleString()} ر.س`" :title="t('admin.treasury.statTreasury')" color="primary" />
      <StatCard icon="mdi-trending-up" :value="`${(stats?.revenue ?? 0).toLocaleString()} ر.س`" :title="t('admin.treasury.statRevenue')" color="success" />
      <StatCard icon="mdi-arrow-down-bold-circle-outline" :value="`${(stats?.inflow ?? 0).toLocaleString()}`" :title="t('admin.treasury.statInflow')" color="info" />
      <StatCard icon="mdi-arrow-up-bold-circle-outline" :value="`${(stats?.outflow ?? 0).toLocaleString()}`" :title="t('admin.treasury.statOutflow')" color="warning" />
    </div>

    <div class="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
      <BaseCard class="lg:col-span-2">
        <div class="mb-3 flex items-center gap-2">
          <BaseIcon name="mdi-chart-line" :size="20" class="text-brand" />
          <h2 class="text-base font-bold text-content">{{ t('admin.treasury.revenueTrend') }}</h2>
        </div>
        <LineChart v-if="revenueSeries.length" :data="revenueSeries" color="success" :height="200" />
      </BaseCard>
      <BaseCard>
        <div class="mb-3 flex items-center gap-2">
          <BaseIcon name="mdi-chart-donut" :size="20" class="text-brand" />
          <h2 class="text-base font-bold text-content">{{ t('admin.treasury.balanceByAccount') }}</h2>
        </div>
        <DonutChart v-if="stats?.distribution?.some(d => d.value)" :data="stats.distribution.filter(d => d.value)" :size="160" :center-label="t('admin.treasury.statTreasury')" />
        <p v-else class="py-8 text-center text-xs text-muted">{{ t('admin.treasury.noBalance') }}</p>
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
      :search-placeholder="t('admin.treasury.searchPlaceholder')"
      export-name="platform-accounts"
      @update:sort-key="r.setSort"
      @update:search="r.setSearch"
      @filter="r.setFilter"
      @update:page="r.setPage"
      @update:per-page="r.setPerPage"
    >
      <template #toolbar>
        <BaseButton variant="brand" size="sm" @click="openCreate">
          <BaseIcon name="mdi-plus" :size="18" />{{ t('admin.treasury.newAccount') }}
        </BaseButton>
      </template>

      <template #cell-type="{ row }">
        <BaseChip color="neutral">{{ typeLabel[row.type] || row.type }}</BaseChip>
      </template>
      <template #cell-bank_name="{ row }">
        <div>
          <div class="text-content">{{ row.bank_name ?? '—' }}</div>
          <div v-if="row.account_no_masked" class="text-[11px] text-muted" dir="ltr">{{ row.account_no_masked }}</div>
        </div>
      </template>
      <template #cell-balance="{ row }">
        <span class="font-bold text-content">{{ row.balance.toLocaleString() }} <span class="text-xs text-muted">{{ row.currency }}</span></span>
        <BaseChip v-if="row.is_default" color="brand" class="ms-1"><BaseIcon name="mdi-star" :size="11" />{{ t('admin.treasury.default') }}</BaseChip>
      </template>
      <template #cell-active="{ row }">
        <BaseChip :color="row.active ? 'success' : 'neutral'">{{ row.active ? t('admin.treasury.statusActive') : t('admin.treasury.statusInactive') }}</BaseChip>
      </template>

      <template #actions="{ row }">
        <div class="flex items-center justify-end gap-1">
          <BaseTooltip :text="t('admin.treasury.adjust')">
            <button class="row-act text-brand" :aria-label="t('admin.treasury.adjust')" @click="openAdjust(row)"><BaseIcon name="mdi-cash-plus" :size="18" /></button>
          </BaseTooltip>
          <BaseTooltip :text="t('admin.treasury.ledger')">
            <button class="row-act" style="color: rgb(var(--v-theme-info))" :aria-label="t('admin.treasury.ledger')" @click="openLedger(row)"><BaseIcon name="mdi-format-list-bulleted" :size="18" /></button>
          </BaseTooltip>
          <BaseTooltip v-if="!row.is_default" :text="t('admin.treasury.delete')">
            <button class="row-act" style="color: rgb(var(--v-theme-error))" :aria-label="t('admin.treasury.delete')" @click="remove(row)"><BaseIcon name="mdi-delete-outline" :size="18" /></button>
          </BaseTooltip>
        </div>
      </template>
    </ResourceScaffold>

    <!-- إنشاء حساب -->
    <BaseModal v-model="createOpen" :title="t('admin.treasury.newAccount')" :max-width="480">
      <div class="space-y-3">
        <BaseInput v-model="cform.name" :label="t('admin.treasury.fieldName')" />
        <BaseSelect
          v-model="cform.type"
          :label="t('admin.treasury.fieldType')"
          :items="[{ value: 'bank', title: t('admin.treasury.typeBank') }, { value: 'cash', title: t('admin.treasury.typeCash') }, { value: 'gateway', title: t('admin.treasury.typeGateway') }]"
        />
        <BaseInput v-model="cform.bank_name" :label="t('admin.treasury.fieldBank')" />
        <BaseInput v-model="cform.account_no_masked" :label="t('admin.treasury.fieldAccountNo')" />
        <BaseInput v-model="cform.notes" :label="t('admin.treasury.fieldNotes')" />
        <BaseSwitch v-model="cform.active" :label="t('admin.treasury.fieldActive')" />
      </div>
      <template #actions>
        <BaseButton variant="ghost" @click="createOpen = false">{{ t('admin.users.cancel') }}</BaseButton>
        <BaseButton variant="brand" :disabled="saving || !cform.name.trim()" @click="create">
          <BaseIcon name="mdi-check" :size="18" />{{ t('admin.treasury.create') }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- إيداع/سحب -->
    <BaseModal v-model="adjustOpen" :title="target ? t('admin.treasury.adjustTitle', { name: target.name }) : ''" :max-width="440">
      <div v-if="target" class="space-y-3">
        <div class="flex items-center justify-between rounded-ui border-ui bg-surfalt px-3 py-2 text-sm">
          <span class="text-muted">{{ t('admin.treasury.current') }}</span>
          <span class="font-bold text-content">{{ target.balance.toLocaleString() }} {{ target.currency }}</span>
        </div>
        <div class="seg">
          <button type="button" class="seg-btn" :class="{ 'is-active': mode === 'credit' }" @click="mode = 'credit'"><BaseIcon name="mdi-plus" :size="15" />{{ t('admin.treasury.deposit') }}</button>
          <button type="button" class="seg-btn" :class="{ 'is-active': mode === 'debit' }" @click="mode = 'debit'"><BaseIcon name="mdi-minus" :size="15" />{{ t('admin.treasury.withdraw') }}</button>
        </div>
        <BaseInput v-model.number="amount" :label="t('admin.treasury.amount')" type="number" />
        <BaseInput v-model="note" :label="t('admin.treasury.note')" />
        <div class="flex items-center justify-between rounded-ui px-3 py-2 text-sm" :style="{ background: projected < 0 ? 'rgba(var(--v-theme-error),0.1)' : 'rgba(var(--v-theme-success),0.1)' }">
          <span class="text-muted">→ {{ t('admin.treasury.colBalance') }}</span>
          <span class="font-bold" :style="{ color: projected < 0 ? 'rgb(var(--v-theme-error))' : 'rgb(var(--v-theme-success))' }">{{ projected.toLocaleString() }}</span>
        </div>
      </div>
      <template #actions>
        <BaseButton variant="ghost" @click="adjustOpen = false">{{ t('admin.users.cancel') }}</BaseButton>
        <BaseButton variant="brand" :disabled="!amount || amount <= 0 || projected < 0" @click="applyAdjust">
          <BaseIcon name="mdi-check" :size="18" />{{ t('admin.treasury.apply') }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- دفتر الحركات -->
    <BaseDrawer v-model="ledgerOpen" :width="420">
      <div class="p-4">
        <h3 class="mb-3 flex items-center gap-2 text-base font-bold text-content">
          <BaseIcon name="mdi-format-list-bulleted" :size="20" class="text-brand" />{{ t('admin.treasury.ledger') }} — {{ ledgerAccount?.name }}
        </h3>
        <div v-if="!ledger.length" class="py-10 text-center text-sm text-muted">{{ t('admin.treasury.noTxns') }}</div>
        <ul v-else class="space-y-2">
          <li v-for="tx in ledger" :key="tx.id" class="flex items-center justify-between rounded-ui border-ui px-3 py-2">
            <div>
              <div class="text-sm text-content">{{ tx.note ?? tx.type }}</div>
              <div class="text-[11px] text-muted">{{ fmtDate(tx.at) }}</div>
            </div>
            <span class="font-bold" :style="{ color: tx.amount >= 0 ? 'rgb(var(--v-theme-success))' : 'rgb(var(--v-theme-error))' }">
              {{ tx.amount >= 0 ? '+' : '' }}{{ tx.amount.toLocaleString() }}
            </span>
          </li>
        </ul>
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
.seg {
  display: flex;
  gap: 4px;
  padding: 3px;
  border-radius: 10px;
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.seg-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 7px;
  border-radius: 8px;
  font-size: 0.85rem;
  color: rgb(var(--v-theme-on-surface));
}
.seg-btn.is-active {
  background: rgb(var(--v-theme-surface));
  font-weight: 700;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
</style>
