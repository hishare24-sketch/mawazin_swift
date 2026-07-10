<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/shared/PageHeader.vue'
import StatCard from '@/components/shared/StatCard.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseSnackbar from '@/components/ui/BaseSnackbar.vue'
import BaseTooltip from '@/components/ui/BaseTooltip.vue'
import BarChart from '@/components/charts/BarChart.vue'
import ResourceScaffold from '@/modules/admin/components/ResourceScaffold.vue'
import type { TableColumn } from '@/components/ui/BaseTable.vue'
import { useAdminResource } from '@/modules/admin/composables/useAdminResource'
import { type AdminWallet, type AdminWalletsStats, api } from '@/services/api'

const { t } = useI18n()
const r = useAdminResource<AdminWallet>({ fetcher: params => api.admin.wallets(params), initialSort: '-balance' })
const { items, meta, loading, sortKey, search } = r

const stats = ref<AdminWalletsStats | null>(null)
async function loadStats() { try { stats.value = await api.admin.walletsStats() } catch { /* تجاهل */ } }
onMounted(loadStats)

const columns: TableColumn[] = [
  { key: 'userName', label: t('admin.wallets.colUser') },
  { key: 'userEmail', label: t('admin.wallets.colEmail') },
  { key: 'balance', label: t('admin.wallets.colBalance'), sortable: true, align: 'center' },
  { key: 'transactions', label: t('admin.wallets.colTx'), align: 'center' },
  { key: 'updated_at', label: t('admin.wallets.colUpdated') },
]

const snack = ref({ show: false, text: '', color: 'success' })
function toast(text: string, color = 'success') { snack.value = { show: true, text, color } }
function fail(e: unknown) { toast((e as { message?: string })?.message ?? t('admin.toast.failed'), 'error') }
function fmtDate(iso?: string) { return iso ? new Date(iso).toLocaleDateString() : '—' }

// ——— تعديل الرصيد ———
const adjustOpen = ref(false)
const target = ref<AdminWallet | null>(null)
const mode = ref<'credit' | 'debit'>('credit')
const amount = ref<number | null>(null)
const note = ref('')
const signed = computed(() => (amount.value ? (mode.value === 'credit' ? amount.value : -amount.value) : 0))
const projected = computed(() => (target.value ? target.value.balance + signed.value : 0))

function openAdjust(w: AdminWallet) {
  target.value = w
  mode.value = 'credit'
  amount.value = null
  note.value = ''
  adjustOpen.value = true
}
async function applyAdjust() {
  if (!target.value || !amount.value || amount.value <= 0)
    return
  try {
    await api.admin.adjustWallet(target.value.id, signed.value, note.value.trim() || undefined)
    toast(t('admin.toast.adjusted'))
    adjustOpen.value = false
    r.refresh()
  }
  catch (e) { fail(e) }
}
</script>

<template>
  <div>
    <PageHeader :title="t('admin.wallets.title')" :subtitle="t('admin.wallets.subtitle')" icon="mdi-wallet-outline" />

    <!-- شريط الإحصاءات -->
    <div class="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div class="grid grid-cols-3 gap-3">
        <StatCard icon="mdi-cash-multiple" :value="`${(stats?.totalBalance ?? 0).toLocaleString()}`" :title="t('admin.wallets.statTotal')" color="primary" />
        <StatCard icon="mdi-wallet-outline" :value="stats?.wallets ?? 0" :title="t('admin.wallets.statCount')" color="info" />
        <StatCard icon="mdi-scale-balance" :value="`${(stats?.avgBalance ?? 0).toLocaleString()}`" :title="t('admin.wallets.statAvg')" color="accent" />
      </div>
      <BaseCard class="lg:col-span-2">
        <div class="mb-3 flex items-center gap-2">
          <BaseIcon name="mdi-chart-bar" :size="20" class="text-brand" />
          <h2 class="text-base font-bold text-content">{{ t('admin.wallets.topHolders') }}</h2>
        </div>
        <BarChart v-if="stats?.topHolders?.some(h => h.value)" :data="stats.topHolders.filter(h => h.value)" color="secondary" :height="160" />
        <p v-else class="py-6 text-center text-xs text-muted">{{ t('admin.wallets.noData') }}</p>
      </BaseCard>
    </div>

    <ResourceScaffold
      :columns="columns"
      :items="items"
      :loading="loading"
      :meta="meta"
      :sort-key="sortKey"
      :search="search"
      :search-placeholder="t('admin.wallets.searchPlaceholder')"
      export-name="wallets"
      @update:sort-key="r.setSort"
      @update:search="r.setSearch"
      @update:page="r.setPage"
      @update:per-page="r.setPerPage"
    >
      <template #cell-userEmail="{ row }">
        <span class="text-muted" dir="ltr">{{ row.userEmail }}</span>
      </template>
      <template #cell-balance="{ row }">
        <span class="font-bold text-content">{{ row.balance.toLocaleString() }} <span class="text-xs text-muted">ر.س</span></span>
      </template>
      <template #cell-updated_at="{ row }">
        <span class="text-muted">{{ fmtDate(row.updatedAt) }}</span>
      </template>

      <template #actions="{ row }">
        <BaseTooltip :text="t('admin.wallets.adjust')">
          <button class="row-act text-brand" :aria-label="t('admin.wallets.adjust')" @click="openAdjust(row)">
            <BaseIcon name="mdi-cash-edit" :size="18" />
          </button>
        </BaseTooltip>
      </template>
    </ResourceScaffold>

    <!-- تعديل الرصيد -->
    <BaseModal v-model="adjustOpen" :title="target ? t('admin.wallets.adjustTitle', { name: target.userName }) : ''" :max-width="440">
      <div v-if="target" class="space-y-3">
        <div class="flex items-center justify-between rounded-ui border-ui bg-surfalt px-3 py-2 text-sm">
          <span class="text-muted">{{ t('admin.wallets.current') }}</span>
          <span class="font-bold text-content">{{ target.balance.toLocaleString() }} ر.س</span>
        </div>

        <div class="seg">
          <button type="button" class="seg-btn" :class="{ 'is-active': mode === 'credit' }" @click="mode = 'credit'">
            <BaseIcon name="mdi-plus" :size="15" />{{ t('admin.wallets.credit') }}
          </button>
          <button type="button" class="seg-btn" :class="{ 'is-active': mode === 'debit' }" @click="mode = 'debit'">
            <BaseIcon name="mdi-minus" :size="15" />{{ t('admin.wallets.debit') }}
          </button>
        </div>

        <BaseInput v-model.number="amount" :label="t('admin.wallets.amount')" type="number" />
        <BaseInput v-model="note" :label="t('admin.wallets.note')" />

        <div class="flex items-center justify-between rounded-ui px-3 py-2 text-sm" :style="{ background: projected < 0 ? 'rgba(var(--v-theme-error),0.1)' : 'rgba(var(--v-theme-success),0.1)' }">
          <span class="text-muted">→ {{ t('admin.wallets.colBalance') }}</span>
          <span class="font-bold" :style="{ color: projected < 0 ? 'rgb(var(--v-theme-error))' : 'rgb(var(--v-theme-success))' }">{{ projected.toLocaleString() }} ر.س</span>
        </div>
      </div>

      <template #actions>
        <BaseButton variant="ghost" @click="adjustOpen = false">{{ t('admin.users.cancel') }}</BaseButton>
        <BaseButton variant="brand" :disabled="!amount || amount <= 0 || projected < 0" @click="applyAdjust">
          <BaseIcon name="mdi-check" :size="18" />{{ t('admin.wallets.apply') }}
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
  width: 32px;
  height: 32px;
  border-radius: 8px;
  transition: background-color 0.15s ease;
}
.row-act:hover {
  background: rgba(var(--v-theme-on-surface), 0.08);
}
</style>
