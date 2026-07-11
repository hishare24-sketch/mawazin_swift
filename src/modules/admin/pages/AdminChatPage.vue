<script setup lang="ts">
defineProps<{ embedded?: boolean }>()
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import PageHeader from '@/components/shared/PageHeader.vue'
import StatCard from '@/components/shared/StatCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseDrawer from '@/components/ui/BaseDrawer.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BasePagination from '@/components/ui/BasePagination.vue'
import BaseSnackbar from '@/components/ui/BaseSnackbar.vue'
import BaseSwitch from '@/components/ui/BaseSwitch.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import LineChart from '@/components/charts/LineChart.vue'
import { type ChatAiLinkage, type ChatAssistantPreview, type ChatConfig, type ChatSettings, type ChatStats, type ChatThread, type ChatThreadDetail, type PageMeta, api } from '@/services/api'
import { useAuthStore } from '@/stores/AuthStore'

const { t } = useI18n()
const auth = useAuthStore()
const canManage = computed(() => auth.hasPermission('manage_chat'))

const settings = ref<ChatSettings | null>(null)
const linkage = ref<ChatAiLinkage | null>(null)
const stats = ref<ChatStats | null>(null)

const snack = ref({ show: false, text: '', color: 'success' })
function toast(text: string, color = 'success') { snack.value = { show: true, text, color } }
function fail(e: unknown) { toast((e as { message?: string })?.message ?? t('admin.toast.failed'), 'error') }

async function loadConfig() {
  try {
    const cfg: ChatConfig = await api.admin.chatConfig()
    settings.value = cfg.settings
    linkage.value = cfg.aiLinkage
  }
  catch (e) { fail(e) }
}
async function loadStats() { try { stats.value = await api.admin.chatStats() } catch { /* تجاهل */ } }

// ── الحوكمة (حفظ فوريّ لكلّ مفتاح — ربط حيّ) ──
async function setFlag(key: keyof ChatSettings, value: boolean | number) {
  if (!settings.value || !canManage.value)
    return
  const snake = { directMessagesEnabled: 'direct_messages_enabled', assistantEnabled: 'assistant_enabled', moderationEnabled: 'moderation_enabled', retentionDays: 'retention_days' }[key]
  try {
    settings.value = await api.admin.updateChatSettings({ [snake]: value } as Record<string, boolean | number>)
    loadConfig() // أعِد جلب الربط (assistant_enabled يؤثّر على effectiveEnabled)
    toast(t('admin.chat.saved'))
  }
  catch (e) { fail(e) }
}

const seriesData = computed(() => (stats.value?.series ?? []).map(s => ({ label: s.date.slice(5), value: s.value })))

// ── جدول المحادثات ──
const threads = ref<ChatThread[]>([])
const meta = ref<PageMeta | null>(null)
const page = ref(1)
const search = ref('')
const loadingThreads = ref(false)
let searchTimer: ReturnType<typeof setTimeout> | undefined
async function loadThreads() {
  loadingThreads.value = true
  try {
    const r = await api.admin.chatThreads({ page: page.value, q: search.value || undefined })
    threads.value = r.items
    meta.value = r.meta
  }
  catch (e) { fail(e) }
  finally { loadingThreads.value = false }
}
function onSearch(v: string | number) {
  search.value = String(v)
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; loadThreads() }, 300)
}
function goPage(p: number) { page.value = p; loadThreads() }

// ── درج المحادثة ──
const drawerOpen = ref(false)
const detail = ref<ChatThreadDetail | null>(null)
async function openThread(th: ChatThread) {
  drawerOpen.value = true
  detail.value = null
  try { detail.value = await api.admin.chatThread(th.key) }
  catch (e) { fail(e) }
}

// ── لوحة اختبار المساعد الذكيّ (تفاعل ذكيّ موصول بحوكمة الذكاء) ──
const prompt = ref('')
const previewing = ref(false)
const preview = ref<ChatAssistantPreview | null>(null)
const blocked = ref<string | null>(null)
const LEVEL_LABEL = computed<Record<number, string>>(() => ({ 1: t('admin.ai.level1'), 2: t('admin.ai.level2'), 3: t('admin.ai.level3') }))
async function runPreview() {
  if (!prompt.value.trim())
    return
  previewing.value = true
  preview.value = null
  blocked.value = null
  try { preview.value = await api.admin.chatAssistantPreview(prompt.value.trim()) }
  catch (e) { blocked.value = (e as { message?: string })?.message ?? t('admin.toast.failed') }
  finally { previewing.value = false }
}

function fmtDate(s: string | null) { return s ? new Date(s).toLocaleString() : '—' }

onMounted(() => { loadConfig(); loadStats(); loadThreads() })
</script>

<template>
  <div>
    <PageHeader v-if="!embedded" :title="t('admin.chat.title')" :subtitle="t('admin.chat.subtitle')" icon="mdi-forum-outline" />

    <!-- شريط الإحصاءات -->
    <div class="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div class="grid grid-cols-2 gap-3 lg:col-span-2">
        <StatCard icon="mdi-forum-outline" :value="stats?.threads ?? 0" :title="t('admin.chat.statThreads')" color="primary" />
        <StatCard icon="mdi-message-text-outline" :value="stats?.messages ?? 0" :title="t('admin.chat.statMessages')" color="info" />
        <StatCard icon="mdi-flash-outline" :value="stats?.activeToday ?? 0" :title="t('admin.chat.statActiveToday')" color="accent" />
        <StatCard icon="mdi-account-group-outline" :value="stats?.participants ?? 0" :title="t('admin.chat.statParticipants')" color="success" />
      </div>
      <BaseCard>
        <div class="mb-2 flex items-center gap-2">
          <BaseIcon name="mdi-chart-line" :size="18" class="text-brand" />
          <h2 class="text-sm font-bold text-content">{{ t('admin.chat.activity') }}</h2>
        </div>
        <LineChart v-if="seriesData.length" :data="seriesData" color="primary" :height="150" />
        <p v-else class="py-6 text-center text-xs text-muted">—</p>
      </BaseCard>
    </div>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <!-- بطاقة تكامل الذكاء (ربط حيّ بموديول Ai) -->
      <BaseCard v-if="linkage">
        <div class="mb-3 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <BaseIcon name="mdi-robot-outline" :size="20" class="text-brand" />
            <h2 class="font-bold text-content">{{ t('admin.chat.aiCardTitle') }}</h2>
          </div>
          <BaseChip :color="linkage.effectiveEnabled ? 'success' : 'error'">
            {{ linkage.effectiveEnabled ? t('admin.chat.assistantLive') : t('admin.chat.assistantOff') }}
          </BaseChip>
        </div>
        <p class="mb-3 text-xs text-muted">{{ t('admin.chat.aiCardHint') }}</p>
        <div class="space-y-2 text-sm">
          <div class="flex items-center justify-between">
            <span class="text-muted">{{ t('admin.chat.gateAiMaster') }}</span>
            <BaseChip :color="linkage.aiEnabled ? 'success' : 'neutral'">{{ linkage.aiEnabled ? t('admin.chat.on') : t('admin.chat.off') }}</BaseChip>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-muted">{{ t('admin.chat.gateChatSection') }}</span>
            <BaseChip :color="linkage.chatCapabilityEnabled ? 'success' : 'neutral'">{{ linkage.chatCapabilityEnabled ? t('admin.chat.on') : t('admin.chat.off') }}</BaseChip>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-muted">{{ t('admin.chat.gateProvider') }}</span>
            <span class="font-medium text-content">{{ linkage.provider }} · {{ linkage.model || '—' }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-muted">{{ t('admin.chat.gateLevel') }}</span>
            <span class="font-medium text-content">{{ LEVEL_LABEL[linkage.assistantLevel] }}</span>
          </div>
        </div>
        <RouterLink :to="{ name: 'admin-ai' }" class="mt-3 inline-flex items-center gap-1 text-sm text-brand hover:underline">
          <BaseIcon name="mdi-cog-outline" :size="16" />{{ t('admin.chat.manageAi') }}
        </RouterLink>
      </BaseCard>

      <!-- حوكمة المحادثات (مفاتيح تحكم السلوك حيًّا) -->
      <BaseCard v-if="settings">
        <div class="mb-3 flex items-center gap-2">
          <BaseIcon name="mdi-shield-check-outline" :size="20" class="text-brand" />
          <h2 class="font-bold text-content">{{ t('admin.chat.governanceTitle') }}</h2>
        </div>
        <div class="divide-y divide-ui">
          <div class="flex items-center justify-between gap-3 py-3">
            <div>
              <div class="font-medium text-content">{{ t('admin.chat.swDirectTitle') }}</div>
              <div class="text-xs text-muted">{{ t('admin.chat.swDirectHint') }}</div>
            </div>
            <BaseSwitch :model-value="settings.directMessagesEnabled" :disabled="!canManage" @update:model-value="v => setFlag('directMessagesEnabled', v)" />
          </div>
          <div class="flex items-center justify-between gap-3 py-3">
            <div>
              <div class="font-medium text-content">{{ t('admin.chat.swAssistantTitle') }}</div>
              <div class="text-xs text-muted">{{ t('admin.chat.swAssistantHint') }}</div>
            </div>
            <BaseSwitch :model-value="settings.assistantEnabled" :disabled="!canManage" @update:model-value="v => setFlag('assistantEnabled', v)" />
          </div>
          <div class="flex items-center justify-between gap-3 py-3">
            <div>
              <div class="font-medium text-content">{{ t('admin.chat.swModerationTitle') }}</div>
              <div class="text-xs text-muted">{{ t('admin.chat.swModerationHint') }}</div>
            </div>
            <BaseSwitch :model-value="settings.moderationEnabled" :disabled="!canManage" @update:model-value="v => setFlag('moderationEnabled', v)" />
          </div>
        </div>
      </BaseCard>
    </div>

    <!-- لوحة اختبار المساعد الذكيّ -->
    <BaseCard class="mt-4">
      <div class="mb-2 flex items-center gap-2">
        <BaseIcon name="mdi-robot-happy-outline" :size="20" class="text-brand" />
        <h2 class="font-bold text-content">{{ t('admin.chat.testTitle') }}</h2>
      </div>
      <p class="mb-3 text-xs text-muted">{{ t('admin.chat.testHint') }}</p>
      <div class="flex flex-col gap-2 sm:flex-row">
        <div class="flex-1">
          <BaseTextarea v-model="prompt" :rows="2" :placeholder="t('admin.chat.testPlaceholder')" />
        </div>
        <BaseButton variant="brand" :disabled="previewing || !prompt.trim()" class="sm:self-end" @click="runPreview">
          <BaseIcon name="mdi-send" :size="18" />{{ t('admin.chat.testRun') }}
        </BaseButton>
      </div>

      <div v-if="blocked" class="mt-3 flex items-start gap-2 rounded-ui p-3 text-sm" style="background: rgba(var(--v-theme-error),0.08); color: rgb(var(--v-theme-error))">
        <BaseIcon name="mdi-cancel" :size="18" />
        <span>{{ blocked }}</span>
      </div>

      <div v-else-if="preview" class="mt-3 rounded-ui p-3" style="background: rgba(var(--v-theme-primary),0.06)">
        <div class="mb-2 flex flex-wrap items-center gap-2">
          <BaseChip color="brand">{{ LEVEL_LABEL[preview.level] }}</BaseChip>
          <BaseChip color="neutral">{{ preview.provider }} · {{ preview.model || '—' }}</BaseChip>
          <BaseChip color="info">{{ t('admin.chat.tokensCap', { n: preview.tokensCap }) }}</BaseChip>
          <BaseChip v-if="preview.simulated" color="warning">{{ t('admin.chat.simulated') }}</BaseChip>
        </div>
        <p class="whitespace-pre-line text-sm text-content">{{ preview.reply }}</p>
        <div v-if="preview.usedKnowledge.length" class="mt-2 flex flex-wrap items-center gap-1">
          <span class="text-[11px] text-muted">{{ t('admin.chat.usedKnowledge') }}:</span>
          <span v-for="k in preview.usedKnowledge" :key="k" class="rounded-full px-2 py-0.5 text-[11px] text-brand" style="background: rgba(var(--v-theme-primary),0.1)">{{ k }}</span>
        </div>
      </div>
    </BaseCard>

    <!-- جدول المحادثات (إشراف) -->
    <BaseCard class="mt-4">
      <div class="mb-3 flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <BaseIcon name="mdi-eye-outline" :size="20" class="text-brand" />
          <h2 class="font-bold text-content">{{ t('admin.chat.oversightTitle') }}</h2>
        </div>
        <div class="w-56">
          <BaseInput :model-value="search" :placeholder="t('admin.chat.searchPlaceholder')" @update:model-value="onSearch" />
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-ui text-muted">
              <th class="p-2 text-start font-medium">{{ t('admin.chat.colParticipants') }}</th>
              <th class="p-2 text-start font-medium">{{ t('admin.chat.colLast') }}</th>
              <th class="p-2 text-center font-medium">{{ t('admin.chat.colMessages') }}</th>
              <th class="p-2 text-center font-medium">{{ t('admin.chat.colUnread') }}</th>
              <th class="p-2 text-start font-medium">{{ t('admin.chat.colActivity') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="th in threads" :key="th.key" class="cursor-pointer border-b border-ui hover:bg-[rgba(var(--v-theme-on-surface),0.04)]" @click="openThread(th)">
              <td class="whitespace-nowrap p-2 font-medium text-content">
                <div class="flex items-center gap-2"><BaseIcon name="mdi-account-multiple-outline" :size="16" class="text-muted" />{{ th.participants.join(' ⟷ ') }}</div>
              </td>
              <td class="max-w-[280px] truncate p-2 text-muted"><b class="text-content">{{ th.lastSender }}:</b> {{ th.lastBody }}</td>
              <td class="p-2 text-center">{{ th.messagesCount }}</td>
              <td class="p-2 text-center"><BaseChip v-if="th.unread" color="warning">{{ th.unread }}</BaseChip><span v-else class="text-muted">—</span></td>
              <td class="whitespace-nowrap p-2 text-xs text-muted">{{ fmtDate(th.lastMessageAt) }}</td>
            </tr>
            <tr v-if="!threads.length && !loadingThreads"><td colspan="5" class="p-8 text-center text-sm text-muted">{{ t('admin.chat.empty') }}</td></tr>
          </tbody>
        </table>
      </div>

      <BasePagination
        v-if="meta && meta.last_page > 1"
        class="mt-3"
        :page="meta.current_page"
        :last-page="meta.last_page"
        :total="meta.total"
        :per-page="meta.itemPerPage"
        @update:page="goPage"
      />
    </BaseCard>

    <!-- درج المحادثة -->
    <BaseDrawer v-model="drawerOpen" :width="440">
      <div v-if="detail" class="flex h-full flex-col p-4">
        <div class="mb-3 flex items-center gap-2 border-b border-ui pb-3">
          <BaseIcon name="mdi-forum-outline" :size="22" class="text-brand" />
          <h3 class="text-base font-bold text-content">{{ detail.participants.join(' ⟷ ') }}</h3>
        </div>
        <div class="flex-1 space-y-2 overflow-y-auto">
          <div v-for="(m, i) in detail.messages" :key="m.id" class="flex" :class="i % 2 === 0 ? 'justify-start' : 'justify-end'">
            <div class="max-w-[80%] rounded-ui px-3 py-2" :style="{ background: i % 2 === 0 ? 'rgba(var(--v-theme-on-surface),0.06)' : 'rgba(var(--v-theme-primary),0.12)' }">
              <div class="mb-0.5 text-[11px] font-medium text-brand">{{ m.senderName }}</div>
              <div class="text-sm text-content">{{ m.body }}</div>
              <div class="mt-0.5 text-[10px] text-muted">{{ fmtDate(m.at) }}<span v-if="m.read"> · {{ t('admin.chat.read') }}</span></div>
            </div>
          </div>
        </div>
        <p class="mt-3 border-t border-ui pt-2 text-[11px] text-muted">{{ t('admin.chat.readOnlyNote') }}</p>
      </div>
      <div v-else class="p-8 text-center text-sm text-muted">…</div>
    </BaseDrawer>

    <BaseSnackbar v-model="snack.show" :color="snack.color">{{ snack.text }}</BaseSnackbar>
  </div>
</template>
