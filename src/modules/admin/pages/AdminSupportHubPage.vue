<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import PageHeader from '@/components/shared/PageHeader.vue'
import StatCard from '@/components/shared/StatCard.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseTabs from '@/components/ui/BaseTabs.vue'
import DonutChart from '@/components/charts/DonutChart.vue'
import AdminSupportPage from '@/modules/admin/pages/AdminSupportPage.vue'
import AdminChatPage from '@/modules/admin/pages/AdminChatPage.vue'
import AdminAiPage from '@/modules/admin/pages/AdminAiPage.vue'
import { type AdminSupportStats, type AiStats, type ChatAiLinkage, type ChatStats, api } from '@/services/api'
import { useAuthStore } from '@/stores/AuthStore'

const { t } = useI18n()
const auth = useAuthStore()
const can = (p: string) => auth.hasPermission(p)

type Tab = 'overview' | 'support' | 'chat' | 'ai'
const tab = ref<Tab>('overview')
const tabs = computed(() => {
  const arr: { value: Tab, label: string, icon: string }[] = [{ value: 'overview', label: t('admin.hub.tabOverview'), icon: 'mdi-view-dashboard-outline' }]
  if (can('view_support')) arr.push({ value: 'support', label: t('admin.hub.tabSupport'), icon: 'mdi-lifebuoy' })
  if (can('view_chat')) arr.push({ value: 'chat', label: t('admin.hub.tabChat'), icon: 'mdi-forum-outline' })
  if (can('view_ai')) arr.push({ value: 'ai', label: t('admin.hub.tabAi'), icon: 'mdi-robot-outline' })
  return arr
})

// ── نظرة عامّة (تجميع من نقاط الإحصاء القائمة) ──
const support = ref<AdminSupportStats | null>(null)
const chat = ref<ChatStats | null>(null)
const aiStats = ref<AiStats | null>(null)
const linkage = ref<ChatAiLinkage | null>(null)

async function loadOverview() {
  if (can('view_support'))
    try { support.value = await api.admin.ticketsStats() } catch { /* تجاهل */ }
  if (can('view_chat')) {
    try { chat.value = await api.admin.chatStats() } catch { /* تجاهل */ }
    try { linkage.value = (await api.admin.chatConfig()).aiLinkage } catch { /* تجاهل */ }
  }
  if (can('view_ai'))
    try { aiStats.value = await api.admin.aiStats() } catch { /* تجاهل */ }
}
onMounted(loadOverview)

const supportCat = computed(() => support.value?.byCategory ?? [])
</script>

<template>
  <div>
    <PageHeader :title="t('admin.hub.title')" :subtitle="t('admin.hub.subtitle')" icon="mdi-headset" />

    <BaseTabs v-model="tab" :tabs="tabs" />

    <!-- ═══ نظرة عامّة ═══ -->
    <div v-if="tab === 'overview'" class="mt-4">
      <!-- حالة المساعد الحيّة (تكامل الذكاء ↔ الشات) -->
      <BaseCard v-if="linkage" class="mb-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="grid h-12 w-12 place-items-center rounded-ui text-2xl" :style="{ background: linkage.effectiveEnabled ? 'rgba(var(--v-theme-success),0.12)' : 'rgba(var(--v-theme-error),0.1)' }">🤖</div>
            <div>
              <div class="font-bold text-content">{{ t('admin.hub.assistantStatus') }}</div>
              <div class="text-xs text-muted">{{ linkage.provider }} · {{ linkage.model || '—' }} · {{ t('admin.hub.level') }} {{ linkage.assistantLevel }}</div>
            </div>
          </div>
          <BaseChip :color="linkage.effectiveEnabled ? 'success' : 'error'">{{ linkage.effectiveEnabled ? t('admin.hub.live') : t('admin.hub.off') }}</BaseChip>
        </div>
      </BaseCard>

      <!-- مؤشّرات مجمّعة -->
      <div class="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon="mdi-lifebuoy" :value="support?.total ?? 0" :title="t('admin.hub.kpiTickets')" color="primary" />
        <StatCard icon="mdi-ticket-confirmation-outline" :value="support?.open ?? 0" :title="t('admin.hub.kpiOpen')" color="warning" />
        <StatCard icon="mdi-forum-outline" :value="chat?.threads ?? 0" :title="t('admin.hub.kpiThreads')" color="info" />
        <StatCard icon="mdi-message-text-outline" :value="chat?.messages ?? 0" :title="t('admin.hub.kpiMessages')" color="accent" />
        <StatCard icon="mdi-robot-happy-outline" :value="aiStats ? `${aiStats.capabilitiesEnabled}/${aiStats.capabilitiesTotal}` : '—'" :title="t('admin.hub.kpiSections')" color="brand" />
        <StatCard icon="mdi-book-open-variant" :value="aiStats?.knowledgeActive ?? 0" :title="t('admin.hub.kpiKnowledge')" color="emerald" />
        <StatCard icon="mdi-flash-outline" :value="chat?.activeToday ?? 0" :title="t('admin.hub.kpiActiveToday')" color="success" />
        <StatCard icon="mdi-check-circle-outline" :value="support?.resolved ?? 0" :title="t('admin.hub.kpiResolved')" color="neutral" />
      </div>

      <!-- توزيع التذاكر + روابط سريعة -->
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BaseCard v-if="supportCat.length">
          <div class="mb-2 flex items-center gap-2"><BaseIcon name="mdi-chart-donut" :size="18" class="text-brand" /><h2 class="text-sm font-bold text-content">{{ t('admin.hub.ticketsByCategory') }}</h2></div>
          <DonutChart :data="supportCat" :size="160" />
        </BaseCard>
        <BaseCard>
          <div class="mb-2 flex items-center gap-2"><BaseIcon name="mdi-open-in-new" :size="18" class="text-brand" /><h2 class="text-sm font-bold text-content">{{ t('admin.hub.quickLinks') }}</h2></div>
          <div class="flex flex-col gap-2">
            <RouterLink v-if="can('view_support')" :to="{ name: 'admin-support' }" class="hub-link"><BaseIcon name="mdi-lifebuoy" :size="18" />{{ t('admin.hub.openSupport') }}</RouterLink>
            <RouterLink v-if="can('view_chat')" :to="{ name: 'admin-chat' }" class="hub-link"><BaseIcon name="mdi-forum-outline" :size="18" />{{ t('admin.hub.openChat') }}</RouterLink>
            <RouterLink v-if="can('view_ai')" :to="{ name: 'admin-ai' }" class="hub-link"><BaseIcon name="mdi-robot-outline" :size="18" />{{ t('admin.hub.openAi') }}</RouterLink>
          </div>
        </BaseCard>
      </div>
    </div>

    <!-- ═══ التبويبات المضمّنة (إعادة استخدام الشاشات القائمة) ═══ -->
    <div v-else-if="tab === 'support'" class="mt-4"><AdminSupportPage embedded /></div>
    <div v-else-if="tab === 'chat'" class="mt-4"><AdminChatPage embedded /></div>
    <div v-else-if="tab === 'ai'" class="mt-4"><AdminAiPage embedded /></div>
  </div>
</template>

<style scoped>
.hub-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 0.85rem;
  border-radius: 10px;
  font-size: 0.9rem;
  color: rgb(var(--v-theme-on-surface));
  background: rgba(var(--v-theme-on-surface), 0.04);
  transition: all 0.15s;
}
.hub-link:hover {
  background: rgba(var(--v-theme-primary), 0.1);
  color: rgb(var(--v-theme-primary));
}
</style>
