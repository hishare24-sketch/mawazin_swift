<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseAvatar from '@/components/ui/BaseAvatar.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseSnackbar from '@/components/ui/BaseSnackbar.vue'
import BaseSwitch from '@/components/ui/BaseSwitch.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import {
  type AssistantContext, type AssistantContextResponse, type AssistantConversationRow, type AssistantGovernanceState,
  type AssistantNudge, type AssistantQuota, type SupportTicketDetail, type SupportTicketRow, api,
} from '@/services/api'
import { subscribeUserTickets } from '@/services/supportRealtime'
import { useAuthStore } from '@/stores/AuthStore'

const { t } = useI18n()

type Mode = 'assistant' | 'support'
const mode = ref<Mode>('assistant')

// ── سياق + حوكمة ──
const governance = ref<AssistantGovernanceState | null>(null)
const context = ref<AssistantContext | null>(null)
const suggestions = ref<string[]>([])
const nudges = ref<AssistantNudge[]>([])
const quota = ref<AssistantQuota | null>(null)
const showContext = ref(false)

// أضيق نافذة محدودة متبقّية (لعرضها بإيجاز)؛ null إن كانت كلّها بلا حدّ.
const quotaRemaining = computed(() => {
  const q = quota.value
  if (!q)
    return null
  const windows: { key: 'daily' | 'weekly' | 'monthly', label: string }[] = [
    { key: 'daily', label: t('assistant.quotaDaily') },
    { key: 'weekly', label: t('assistant.quotaWeekly') },
    { key: 'monthly', label: t('assistant.quotaMonthly') },
  ]
  const capped = windows
    .map(w => ({ ...w, remaining: q.remaining[w.key], limit: q.limits[w.key] }))
    .filter(w => w.remaining !== null && w.limit > 0)
  if (!capped.length)
    return null
  return capped.reduce((a, b) => ((b.remaining as number) < (a.remaining as number) ? b : a))
})

const snack = ref({ show: false, text: '', color: 'success' })
function toast(text: string, color = 'success') { snack.value = { show: true, text, color } }
function fail(e: unknown) { toast((e as { message?: string })?.message ?? t('assistant.failed'), 'error') }

const PERSONA_LABEL = computed<Record<string, string>>(() => ({
  seeker: t('assistant.personaSeeker'), organization: t('assistant.personaOrg'),
  interviewer: t('assistant.personaInterviewer'), expert: t('assistant.personaExpert'),
}))

async function loadContext() {
  try {
    const r: AssistantContextResponse = await api.assistant.context()
    governance.value = r.governance
    context.value = r.context
    suggestions.value = r.suggestions
    nudges.value = r.nudges
    quota.value = r.quota ?? null
  }
  catch (e) { fail(e) }
}

// ── المساعد ──
interface Bubble { role: 'user' | 'assistant', body: string, meta?: import('@/services/api').AssistantMeta | null }
const conversations = ref<AssistantConversationRow[]>([])
const activeConvId = ref<number | null>(null)
const messages = ref<Bubble[]>([])
const input = ref('')
const sending = ref(false)
const listRef = ref<HTMLElement | null>(null)
const lastBlocked = ref(false)

async function scrollDown() { await nextTick(); if (listRef.value) listRef.value.scrollTop = listRef.value.scrollHeight }

async function loadConversations() {
  try { conversations.value = await api.assistant.conversations() }
  catch { /* تجاهل */ }
}
function greet() {
  const name = context.value?.name ? ` ${context.value.name}` : ''
  messages.value = [{ role: 'assistant', body: t('assistant.greeting', { name }) }]
  lastBlocked.value = false
}
function newConversation() { activeConvId.value = null; greet() }
async function openConversation(id: number) {
  try {
    const d = await api.assistant.conversation(id)
    activeConvId.value = d.id
    messages.value = d.messages.map(m => ({ role: m.role, body: m.body, meta: m.meta }))
    mode.value = 'assistant'
    await scrollDown()
  }
  catch (e) { fail(e) }
}
async function send(text?: string) {
  const content = (text ?? input.value).trim()
  if (!content || sending.value)
    return
  messages.value.push({ role: 'user', body: content })
  input.value = ''
  sending.value = true
  await scrollDown()
  try {
    const r = await api.assistant.message(content, activeConvId.value ?? undefined)
    activeConvId.value = r.conversationId
    lastBlocked.value = r.blocked
    messages.value.push({ role: 'assistant', body: r.reply, meta: r.meta })
    if (r.nudges?.length)
      nudges.value = r.nudges
    if (r.quota)
      quota.value = r.quota
    loadConversations()
  }
  catch (e) { fail(e) }
  finally { sending.value = false; await scrollDown() }
}

// ── التصعيد للدعم البشريّ ──
async function escalate() {
  try {
    const title = conversations.value.find(c => c.id === activeConvId.value)?.title
    const tk = await api.assistant.escalate({ conversationId: activeConvId.value ?? undefined, subject: title, category: 'other' })
    toast(t('assistant.escalated'))
    mode.value = 'support'
    await loadTickets()
    openTicket(tk.id)
  }
  catch (e) { fail(e) }
}

// ── الدعم (تذاكر/محادثات) ──
const tickets = ref<SupportTicketRow[]>([])
const activeTicket = ref<SupportTicketDetail | null>(null)
const ticketInput = ref('')
const creatingTicket = ref(false)
const newTicket = ref<{ subject: string, category: string, priority: string, body: string }>({ subject: '', category: 'other', priority: 'normal', body: '' })

const CATEGORIES = computed(() => [
  { value: 'billing', title: t('assistant.catBilling') }, { value: 'technical', title: t('assistant.catTechnical') },
  { value: 'account', title: t('assistant.catAccount') }, { value: 'other', title: t('assistant.catOther') },
])
const PRIORITIES = computed(() => [
  { value: 'low', title: t('assistant.prioLow') }, { value: 'normal', title: t('assistant.prioNormal') },
  { value: 'high', title: t('assistant.prioHigh') }, { value: 'urgent', title: t('assistant.prioUrgent') },
])
type ChipColor = 'brand' | 'accent' | 'emerald' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
const STATUS_COLOR: Record<string, ChipColor> = { open: 'info', pending: 'warning', resolved: 'success', closed: 'neutral' }

async function loadTickets() {
  try { tickets.value = await api.support.tickets() }
  catch { /* تجاهل */ }
}
async function openTicket(id: number) {
  try { activeTicket.value = await api.support.ticket(id); creatingTicket.value = false; mode.value = 'support'; await scrollDown() }
  catch (e) { fail(e) }
}
function startNewTicket() { creatingTicket.value = true; activeTicket.value = null; newTicket.value = { subject: '', category: 'other', priority: 'normal', body: '' } }
async function createTicket() {
  if (!newTicket.value.subject.trim() || !newTicket.value.body.trim())
    return
  try {
    const tk = await api.support.createTicket({ ...newTicket.value })
    toast(t('assistant.ticketCreated'))
    await loadTickets()
    openTicket(tk.id)
  }
  catch (e) { fail(e) }
}
async function replyTicket() {
  if (!ticketInput.value.trim() || !activeTicket.value)
    return
  try {
    activeTicket.value = await api.support.replyTicket(activeTicket.value.id, ticketInput.value.trim())
    ticketInput.value = ''
    loadTickets()
    await scrollDown()
  }
  catch (e) { fail(e) }
}

// ── الإعدادات/الخصوصيّة ──
const settingsOpen = ref(false)
const prefs = ref({ dataAccess: true, proactive: true })
async function loadSettings() { try { prefs.value = await api.assistant.settings() } catch { /* تجاهل */ } }
async function saveSettings() {
  try {
    prefs.value = await api.assistant.updateSettings({ data_access: prefs.value.dataAccess, proactive: prefs.value.proactive })
    settingsOpen.value = false
    toast(t('assistant.settingsSaved'))
    loadContext()
  }
  catch (e) { fail(e) }
}

function toneColor(tone: string) { return `rgb(var(--v-theme-${tone === 'amber' ? 'warning' : tone}))` }

// اسم ودّيّ لأداة المنصّة التي استعان بها المساعد (function-calling)
function toolLabel(key: string) { const k = `assistant.tool_${key}`; const l = t(k); return l === k ? key : l }

// بثّ لحظيّ: ردود الدعم تصل مباشرةً للتذكرة المفتوحة والقائمة.
let unsubscribeTickets: (() => void) | null = null
onMounted(async () => {
  await loadContext(); greet(); loadConversations(); loadTickets(); loadSettings()
  const uuid = useAuthStore().authUser?.uuid
  if (uuid) {
    unsubscribeTickets = subscribeUserTickets(uuid, (e) => {
      if (activeTicket.value && activeTicket.value.id === e.ticketId && !activeTicket.value.replies.some(x => x.id === e.reply.id)) {
        activeTicket.value = { ...activeTicket.value, status: e.status, replies: [...activeTicket.value.replies, e.reply] }
        scrollDown()
      }
      loadTickets()
    })
  }
})
onUnmounted(() => unsubscribeTickets?.())
</script>

<template>
  <div class="mx-auto max-w-6xl">
    <!-- الرأس -->
    <div class="mb-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <BaseAvatar color="emerald" tonal square :size="44"><BaseIcon name="mdi-robot-happy-outline" :size="22" /></BaseAvatar>
        <div>
          <h1 class="mb-0 text-lg font-bold text-content">{{ t('assistant.title') }}</h1>
          <div class="flex items-center gap-1 text-xs" :style="{ color: governance?.effectiveEnabled ? 'rgb(var(--v-theme-success))' : 'rgb(var(--v-theme-error))' }">
            <BaseIcon name="mdi-circle" :size="8" />{{ governance?.effectiveEnabled ? t('assistant.online') : t('assistant.assistantOff') }}
          </div>
        </div>
      </div>
      <BaseButton variant="ghost" size="sm" @click="settingsOpen = true"><BaseIcon name="mdi-cog-outline" :size="18" />{{ t('assistant.privacy') }}</BaseButton>
    </div>

    <div class="flex gap-4" style="height: calc(100vh - 150px)">
      <!-- الشريط الجانبيّ -->
      <BaseCard :padded="false" class="hidden w-[270px] min-w-[270px] flex-col p-3 md:flex">
        <div class="mb-3 grid grid-cols-2 gap-1 rounded-ui bg-[rgba(var(--v-theme-on-surface),0.05)] p-1">
          <button class="mode-tab" :class="{ 'mode-active': mode === 'assistant' }" @click="mode = 'assistant'"><BaseIcon name="mdi-robot-happy-outline" :size="16" />{{ t('assistant.tabAssistant') }}</button>
          <button class="mode-tab" :class="{ 'mode-active': mode === 'support' }" @click="mode = 'support'"><BaseIcon name="mdi-lifebuoy" :size="16" />{{ t('assistant.tabSupport') }}</button>
        </div>

        <template v-if="mode === 'assistant'">
          <BaseButton variant="accent" size="sm" class="mb-2" @click="newConversation"><BaseIcon name="mdi-plus" :size="16" />{{ t('assistant.newChat') }}</BaseButton>
          <div class="mb-1 text-xs text-muted">{{ t('assistant.history') }}</div>
          <div class="flex-1 overflow-y-auto">
            <button v-for="c in conversations" :key="c.id" class="list-row" :class="{ 'is-active': c.id === activeConvId }" @click="openConversation(c.id)">
              <BaseIcon name="mdi-message-outline" :size="16" /><span class="flex-1 truncate">{{ c.title }}</span>
            </button>
            <p v-if="!conversations.length" class="px-2 py-4 text-center text-xs text-muted">{{ t('assistant.noHistory') }}</p>
          </div>
        </template>

        <template v-else>
          <BaseButton variant="accent" size="sm" class="mb-2" @click="startNewTicket"><BaseIcon name="mdi-plus" :size="16" />{{ t('assistant.newTicket') }}</BaseButton>
          <div class="mb-1 text-xs text-muted">{{ t('assistant.myTickets') }}</div>
          <div class="flex-1 overflow-y-auto">
            <button v-for="tk in tickets" :key="tk.id" class="list-row flex-col !items-start gap-0.5" :class="{ 'is-active': tk.id === activeTicket?.id }" @click="openTicket(tk.id)">
              <span class="w-full truncate font-medium">{{ tk.subject }}</span>
              <BaseChip :color="STATUS_COLOR[tk.status] || 'neutral'">{{ t(`assistant.st_${tk.status}`) }}</BaseChip>
            </button>
            <p v-if="!tickets.length" class="px-2 py-4 text-center text-xs text-muted">{{ t('assistant.noTickets') }}</p>
          </div>
        </template>
      </BaseCard>

      <!-- ══ لوحة المساعد ══ -->
      <div v-if="mode === 'assistant'" class="flex flex-1 flex-col overflow-hidden">
        <!-- بطاقة السياق (ما يعرفه المساعد) -->
        <BaseCard v-if="context" class="mb-3 !py-2.5">
          <button class="flex w-full items-center justify-between" @click="showContext = !showContext">
            <div class="flex items-center gap-2 text-sm">
              <BaseIcon name="mdi-crosshairs-gps" :size="16" class="text-brand" />
              <span class="font-medium text-content">{{ t('assistant.contextTitle') }}</span>
              <BaseChip color="brand">{{ PERSONA_LABEL[context.persona] || context.persona }}</BaseChip>
              <BaseChip color="neutral">{{ t(`assistant.tier_${context.tier}`) }}</BaseChip>
            </div>
            <BaseIcon :name="showContext ? 'mdi-chevron-up' : 'mdi-chevron-down'" :size="18" class="text-muted" />
          </button>
          <div v-if="showContext" class="mt-2 border-t border-ui pt-2 text-xs text-muted">
            <template v-if="context.dataAccess && context.activity">
              <div class="flex flex-wrap gap-3">
                <span>{{ t('assistant.actApplications') }}: <b class="text-content">{{ context.activity.applications }}</b></span>
                <span>{{ t('assistant.actOpportunities') }}: <b class="text-content">{{ context.activity.opportunities }}</b></span>
                <span>{{ t('assistant.actSurveys') }}: <b class="text-content">{{ context.activity.surveys }}</b></span>
                <span>{{ t('assistant.actWallet') }}: <b class="text-content">{{ context.activity.wallet }}</b></span>
              </div>
            </template>
            <p v-else class="flex items-center gap-1"><BaseIcon name="mdi-shield-lock-outline" :size="14" />{{ t('assistant.privacyOnNote') }}</p>
            <p v-if="quotaRemaining" class="mt-2 flex items-center gap-1 border-t border-ui pt-2">
              <BaseIcon name="mdi-fire" :size="14" class="text-brand" />
              {{ t('assistant.quotaRemaining', { count: (quotaRemaining.remaining as number).toLocaleString(), window: quotaRemaining.label }) }}
            </p>
          </div>
        </BaseCard>

        <!-- تنبيه استباقيّ -->
        <div v-if="nudges.length" class="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-ui border-s-4 p-3" :style="{ background: `rgba(var(--v-theme-${nudges[0].tone}),0.12)`, borderColor: toneColor(nudges[0].tone) }">
          <div class="flex items-center gap-2">
            <BaseIcon :name="nudges[0].icon" :size="20" :style="{ color: toneColor(nudges[0].tone) }" />
            <span class="text-sm text-content">{{ nudges[0].text }}</span>
          </div>
        </div>

        <BaseCard :padded="false" class="flex flex-1 flex-col overflow-hidden">
          <div ref="listRef" class="flex-1 overflow-y-auto p-4">
            <div v-for="(m, i) in messages" :key="i" class="mb-3 flex" :class="m.role === 'user' ? 'justify-end' : 'justify-start'">
              <div class="flex gap-2" :class="m.role === 'user' ? 'flex-row-reverse' : ''" style="max-width: 82%">
                <BaseAvatar :color="m.role === 'user' ? 'brand' : 'emerald'" tonal :size="32"><BaseIcon :name="m.role === 'user' ? 'mdi-account' : 'mdi-robot-happy-outline'" :size="17" /></BaseAvatar>
                <div class="rounded-ui-lg p-3 text-sm" :class="m.role === 'user' ? 'bg-brand text-on-brand' : 'border-ui bg-surfalt text-content'">
                  <span class="whitespace-pre-line">{{ m.body }}</span>
                  <div v-if="m.meta && !m.meta.blocked && (m.meta.usedKnowledge?.length || m.meta.usedTools?.length || m.meta.level)" class="mt-2 flex flex-wrap items-center gap-1 border-t border-ui pt-1.5">
                    <BaseChip v-if="m.meta.level" color="neutral">{{ t(`assistant.level${m.meta.level}`) }}</BaseChip>
                    <span v-for="k in (m.meta.usedKnowledge || [])" :key="k" class="rounded-full px-1.5 py-0.5 text-[10px] text-brand" style="background: rgba(var(--v-theme-primary),0.1)">{{ k }}</span>
                    <span v-for="tl in (m.meta.usedTools || [])" :key="`t-${tl}`" class="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] text-success" style="background: rgba(var(--v-theme-success),0.12)"><BaseIcon name="mdi-database-search-outline" :size="11" />{{ toolLabel(tl) }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="sending" class="mb-3 flex gap-2">
              <BaseAvatar color="emerald" tonal :size="32"><BaseIcon name="mdi-robot-happy-outline" :size="17" /></BaseAvatar>
              <div class="rounded-ui-lg border-ui bg-surfalt p-3"><span class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" style="color: rgb(var(--v-theme-secondary))" /></div>
            </div>
          </div>

          <!-- تصعيد عند الحجب أو دائمًا متاح -->
          <div v-if="lastBlocked" class="mx-4 mb-2 flex items-center justify-between gap-2 rounded-ui p-2.5 text-sm" style="background: rgba(var(--v-theme-warning),0.12)">
            <span class="text-content">{{ t('assistant.blockedHint') }}</span>
            <BaseButton size="sm" variant="brand" @click="escalate"><BaseIcon name="mdi-lifebuoy" :size="16" />{{ t('assistant.escalate') }}</BaseButton>
          </div>

          <hr class="border-ui">
          <div v-if="suggestions.length" class="flex flex-wrap gap-2 px-4 pt-3">
            <button v-for="s in suggestions" :key="s" class="btn-tonal-brand cursor-pointer rounded-full px-2.5 py-1 text-sm font-medium" @click="send(s)">{{ s }}</button>
          </div>
          <div class="flex items-center gap-2 p-4">
            <BaseButton variant="ghost" size="sm" class="shrink-0" :title="t('assistant.escalate')" @click="escalate"><BaseIcon name="mdi-lifebuoy" :size="18" /></BaseButton>
            <BaseInput v-model="input" :placeholder="t('assistant.inputPlaceholder')" class="flex-1" @keyup.enter="send()">
              <template #suffix><button class="icon-btn h-8 w-8" :aria-label="t('assistant.sendLabel')" @click="send()"><BaseIcon name="mdi-send" :size="18" /></button></template>
            </BaseInput>
          </div>
        </BaseCard>
      </div>

      <!-- ══ لوحة الدعم ══ -->
      <div v-else class="flex flex-1 flex-col overflow-hidden">
        <!-- إنشاء تذكرة -->
        <BaseCard v-if="creatingTicket" class="flex-1 overflow-y-auto">
          <h2 class="mb-3 font-bold text-content">{{ t('assistant.newTicket') }}</h2>
          <div class="space-y-3">
            <BaseInput v-model="newTicket.subject" :label="t('assistant.ticketSubject')" />
            <div class="grid grid-cols-2 gap-3">
              <div><label class="mb-1 block text-sm text-muted">{{ t('assistant.ticketCategory') }}</label><BaseSelect v-model="newTicket.category" :items="CATEGORIES" /></div>
              <div><label class="mb-1 block text-sm text-muted">{{ t('assistant.ticketPriority') }}</label><BaseSelect v-model="newTicket.priority" :items="PRIORITIES" /></div>
            </div>
            <BaseTextarea v-model="newTicket.body" :label="t('assistant.ticketBody')" :rows="5" />
            <div class="flex justify-end gap-2">
              <BaseButton variant="ghost" @click="creatingTicket = false">{{ t('assistant.cancel') }}</BaseButton>
              <BaseButton variant="brand" :disabled="!newTicket.subject.trim() || !newTicket.body.trim()" @click="createTicket"><BaseIcon name="mdi-send" :size="16" />{{ t('assistant.createTicket') }}</BaseButton>
            </div>
          </div>
        </BaseCard>

        <!-- محادثة تذكرة -->
        <BaseCard v-else-if="activeTicket" :padded="false" class="flex flex-1 flex-col overflow-hidden">
          <div class="flex items-center justify-between gap-2 border-b border-ui p-3">
            <div class="min-w-0">
              <div class="truncate font-bold text-content">{{ activeTicket.subject }}</div>
              <div class="text-xs text-muted">{{ t(`assistant.cat_${activeTicket.category}`) }} · {{ t(`assistant.prio_${activeTicket.priority}`) }}</div>
            </div>
            <BaseChip :color="STATUS_COLOR[activeTicket.status] || 'neutral'">{{ t(`assistant.st_${activeTicket.status}`) }}</BaseChip>
          </div>
          <div ref="listRef" class="flex-1 overflow-y-auto p-4">
            <div v-for="r in activeTicket.replies" :key="r.id" class="mb-3 flex" :class="r.isStaff ? 'justify-start' : 'justify-end'">
              <div class="flex gap-2" :class="r.isStaff ? '' : 'flex-row-reverse'" style="max-width: 82%">
                <BaseAvatar :color="r.isStaff ? 'info' : 'brand'" tonal :size="32"><BaseIcon :name="r.isStaff ? 'mdi-headset' : 'mdi-account'" :size="17" /></BaseAvatar>
                <div class="rounded-ui-lg p-3 text-sm" :class="r.isStaff ? 'border-ui bg-surfalt text-content' : 'bg-brand text-on-brand'">
                  <div class="mb-0.5 text-[11px] font-medium" :class="r.isStaff ? 'text-info' : 'opacity-80'">{{ r.author }}</div>
                  <span class="whitespace-pre-line">{{ r.body }}</span>
                </div>
              </div>
            </div>
          </div>
          <hr class="border-ui">
          <div class="flex items-center gap-2 p-4">
            <BaseInput v-model="ticketInput" :placeholder="t('assistant.replyPlaceholder')" class="flex-1" @keyup.enter="replyTicket">
              <template #suffix><button class="icon-btn h-8 w-8" :aria-label="t('assistant.sendLabel')" @click="replyTicket"><BaseIcon name="mdi-send" :size="18" /></button></template>
            </BaseInput>
          </div>
        </BaseCard>

        <!-- لا شيء محدّد -->
        <BaseCard v-else class="flex flex-1 flex-col items-center justify-center text-center text-muted">
          <BaseIcon name="mdi-lifebuoy" :size="40" class="mb-2 opacity-40" />
          <p class="text-sm">{{ t('assistant.supportEmpty') }}</p>
          <BaseButton variant="brand" size="sm" class="mt-3" @click="startNewTicket"><BaseIcon name="mdi-plus" :size="16" />{{ t('assistant.newTicket') }}</BaseButton>
        </BaseCard>
      </div>
    </div>

    <!-- إعدادات الخصوصيّة -->
    <BaseModal v-model="settingsOpen" :title="t('assistant.privacyTitle')" :max-width="480">
      <div class="space-y-4">
        <div class="flex items-start justify-between gap-3">
          <div><div class="font-medium text-content">{{ t('assistant.prefDataTitle') }}</div><div class="text-xs text-muted">{{ t('assistant.prefDataHint') }}</div></div>
          <BaseSwitch v-model="prefs.dataAccess" />
        </div>
        <div class="flex items-start justify-between gap-3">
          <div><div class="font-medium text-content">{{ t('assistant.prefProactiveTitle') }}</div><div class="text-xs text-muted">{{ t('assistant.prefProactiveHint') }}</div></div>
          <BaseSwitch v-model="prefs.proactive" />
        </div>
        <p class="flex items-center gap-1 text-xs text-muted"><BaseIcon name="mdi-shield-check-outline" :size="15" />{{ t('assistant.privacyFooter') }}</p>
      </div>
      <template #actions>
        <BaseButton variant="ghost" @click="settingsOpen = false">{{ t('assistant.cancel') }}</BaseButton>
        <BaseButton variant="brand" @click="saveSettings"><BaseIcon name="mdi-check" :size="16" />{{ t('assistant.save') }}</BaseButton>
      </template>
    </BaseModal>

    <BaseSnackbar v-model="snack.show" :color="snack.color">{{ snack.text }}</BaseSnackbar>
  </div>
</template>

<style scoped>
.mode-tab {
  display: flex; align-items: center; justify-content: center; gap: 4px;
  padding: 6px; border-radius: 8px; font-size: 0.8rem; font-weight: 600;
  color: rgb(var(--v-theme-on-surface)); transition: all 0.15s;
}
.mode-active { background: rgb(var(--v-theme-surface)); color: rgb(var(--v-theme-primary)); box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
.list-row {
  display: flex; width: 100%; align-items: center; gap: 0.5rem;
  padding: 0.5rem 0.6rem; margin-bottom: 2px; border-radius: 8px;
  text-align: start; font-size: 0.82rem; color: rgb(var(--v-theme-on-surface)); transition: background 0.15s;
}
.list-row:hover { background: rgba(var(--v-theme-on-surface), 0.05); }
.list-row.is-active { background: rgba(var(--v-theme-primary), 0.12); color: rgb(var(--v-theme-primary)); font-weight: 700; }
</style>
