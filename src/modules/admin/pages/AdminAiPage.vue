<script setup lang="ts">
defineProps<{ embedded?: boolean }>()
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
import BaseSlider from '@/components/ui/BaseSlider.vue'
import BaseSnackbar from '@/components/ui/BaseSnackbar.vue'
import BaseSwitch from '@/components/ui/BaseSwitch.vue'
import BaseTabs from '@/components/ui/BaseTabs.vue'
import BaseTagInput from '@/components/ui/BaseTagInput.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import BaseTooltip from '@/components/ui/BaseTooltip.vue'
import DonutChart from '@/components/charts/DonutChart.vue'
import { confirm } from '@/components/ui/confirm'
import { type AiCapability, type AiConfig, type AiKnowledgeEntry, type AiProvider, type AiQuota, type AiSettings, type AiStats, api } from '@/services/api'
import { useAuthStore } from '@/stores/AuthStore'
import { ASSISTANT_LEVELS, type AssistantLevel } from '@/modules/admin/constants/assistantLevels'

const { t } = useI18n()
const auth = useAuthStore()
const canManage = computed(() => auth.hasPermission('manage_ai'))

const loading = ref(true)
const settings = ref<AiSettings | null>(null)
const capabilities = ref<AiCapability[]>([])
const knowledge = ref<AiKnowledgeEntry[]>([])
const quotas = ref<AiQuota[]>([])
const docMaxReads = ref(3)
const stats = ref<AiStats | null>(null)

const snack = ref({ show: false, text: '', color: 'success' })
function toast(text: string, color = 'success') { snack.value = { show: true, text, color } }
function fail(e: unknown) { toast((e as { message?: string })?.message ?? t('admin.toast.failed'), 'error') }

async function loadConfig() {
  loading.value = true
  try {
    const cfg: AiConfig = await api.admin.aiConfig()
    settings.value = cfg.settings
    capabilities.value = cfg.capabilities
    knowledge.value = cfg.knowledge
    quotas.value = cfg.planQuotas.map(q => ({ ...q }))
    docMaxReads.value = cfg.settings.docMaxReads
  }
  catch (e) { fail(e) }
  finally { loading.value = false }
}
async function loadStats() { try { stats.value = await api.admin.aiStats() } catch { /* تجاهل */ } }
onMounted(() => { loadConfig(); loadStats() })

// ═══ التبويبات ═══
type Tab = 'general' | 'sections' | 'quotas' | 'knowledge'
const tab = ref<Tab>('general')
const tabs = computed(() => [
  { value: 'general' as Tab, label: t('admin.ai.tabGeneral'), icon: 'mdi-tune' },
  { value: 'sections' as Tab, label: t('admin.ai.tabSections'), icon: 'mdi-puzzle-outline' },
  { value: 'quotas' as Tab, label: t('admin.ai.tabQuotas'), icon: 'mdi-gauge' },
  { value: 'knowledge' as Tab, label: t('admin.ai.tabKnowledge'), icon: 'mdi-book-open-variant' },
])

const PROVIDERS = computed<{ value: AiProvider, title: string }[]>(() => [
  { value: 'simulation', title: t('admin.ai.providerSimulation') },
  { value: 'claude', title: t('admin.ai.providerClaude') },
  { value: 'openai', title: t('admin.ai.providerOpenai') },
  { value: 'custom', title: t('admin.ai.providerCustom') },
])
const LANGS = computed(() => [
  { value: 'ar', title: t('admin.ai.langAr') },
  { value: 'en', title: t('admin.ai.langEn') },
  { value: 'auto', title: t('admin.ai.langAuto') },
])
const providerLabel = computed(() => PROVIDERS.value.find(p => p.value === settings.value?.provider)?.title ?? settings.value?.provider ?? '—')
const enabledCaps = computed(() => capabilities.value.filter(c => c.enabled).length)
const activeKnowledge = computed(() => knowledge.value.filter(k => k.enabled).length)
const donutData = computed(() => stats.value?.distribution?.map(d => ({ label: d.label, value: d.value })) ?? [])
const usageMonthLabel = computed(() => (stats.value?.usageMonth ?? 0).toLocaleString())
const usageTodayLabel = computed(() => (stats.value?.usageToday ?? 0).toLocaleString())

// ═══ المفتاح الرئيسيّ ═══
async function toggleMaster() {
  if (!settings.value || !canManage.value)
    return
  try {
    settings.value = await api.admin.updateAiSettings({ enabled: !settings.value.enabled })
    toast(settings.value.enabled ? t('admin.ai.toastEnabled') : t('admin.ai.toastDisabled'), settings.value.enabled ? 'success' : 'warning')
    loadStats()
  }
  catch (e) { fail(e) }
}

// ═══ عام ═══
const DEFAULT_MODELS: Partial<Record<AiProvider, string>> = { claude: 'claude-opus-4-8', openai: 'gpt-4o-mini' }
function onProviderChange(p: AiProvider) {
  if (!settings.value)
    return
  settings.value.provider = p
  const def = DEFAULT_MODELS[p]
  const model = settings.value.model || ''
  const fitsClaude = model.startsWith('claude')
  const mismatch = (p === 'claude' && !fitsClaude) || (p === 'openai' && fitsClaude)
  if (def && (mismatch || !model))
    settings.value.model = def
}
function levelTokensOf(id: AssistantLevel): number {
  return settings.value?.levelTokens?.[String(id)] ?? ASSISTANT_LEVELS.find(l => l.id === id)!.defaultTokens
}
function setLevelTokens(id: AssistantLevel, v: number) {
  if (settings.value)
    settings.value.levelTokens = { ...settings.value.levelTokens, [String(id)]: v }
}

const savingGeneral = ref(false)
async function saveGeneral() {
  if (!settings.value)
    return
  savingGeneral.value = true
  const s = settings.value
  try {
    settings.value = await api.admin.updateAiSettings({
      enabled: s.enabled,
      provider: s.provider,
      model: s.model,
      api_key: s.apiKey,
      endpoint: s.endpoint,
      temperature: s.temperature,
      max_tokens: s.maxTokens,
      language: s.language,
      system_prompt: s.systemPrompt,
      assistant_level: s.assistantLevel,
      allow_user_level_override: s.allowUserLevelOverride,
      level_tokens: s.levelTokens,
    })
    toast(t('admin.ai.toastSettingsSaved'))
    loadStats()
  }
  catch (e) { fail(e) }
  finally { savingGeneral.value = false }
}

// ═══ الأقسام ═══
async function toggleCapability(c: AiCapability) {
  if (!canManage.value)
    return
  try {
    const updated = await api.admin.toggleAiCapability(c.id)
    const i = capabilities.value.findIndex(x => x.id === c.id)
    if (i !== -1)
      capabilities.value[i] = updated
    loadStats()
  }
  catch (e) { fail(e) }
}

// ═══ الحصص ═══
const QUOTA_FIELDS: { key: keyof AiQuota, label: string }[] = [
  { key: 'maxTokensPerRequest', label: 'admin.ai.quotaPerRequest' },
  { key: 'dailyTokens', label: 'admin.ai.quotaDaily' },
  { key: 'weeklyTokens', label: 'admin.ai.quotaWeekly' },
  { key: 'monthlyTokens', label: 'admin.ai.quotaMonthly' },
]
const savingQuotas = ref(false)
async function saveQuotas() {
  savingQuotas.value = true
  const map: Record<string, { maxTokensPerRequest: number, dailyTokens: number, weeklyTokens: number, monthlyTokens: number }> = {}
  for (const q of quotas.value) {
    map[q.key] = {
      maxTokensPerRequest: Math.max(0, Math.round(q.maxTokensPerRequest || 0)),
      dailyTokens: Math.max(0, Math.round(q.dailyTokens || 0)),
      weeklyTokens: Math.max(0, Math.round(q.weeklyTokens || 0)),
      monthlyTokens: Math.max(0, Math.round(q.monthlyTokens || 0)),
    }
  }
  try {
    const res = await api.admin.updateAiQuotas({ doc_max_reads: docMaxReads.value, quotas: map })
    quotas.value = res.planQuotas.map(q => ({ ...q }))
    docMaxReads.value = res.docMaxReads
    toast(t('admin.ai.toastQuotasSaved'))
    loadStats()
  }
  catch (e) { fail(e) }
  finally { savingQuotas.value = false }
}

// ═══ قاعدة المعرفة ═══
const editorOpen = ref(false)
const mode = ref<'create' | 'edit'>('create')
const target = ref<AiKnowledgeEntry | null>(null)
const form = ref<{ title: string, content: string, tags: string[], enabled: boolean }>({ title: '', content: '', tags: [], enabled: true })
const savingKnowledge = ref(false)

function openCreate() {
  mode.value = 'create'
  target.value = null
  form.value = { title: '', content: '', tags: [], enabled: true }
  editorOpen.value = true
}
function openEdit(k: AiKnowledgeEntry) {
  mode.value = 'edit'
  target.value = k
  form.value = { title: k.title, content: k.content, tags: [...k.tags], enabled: k.enabled }
  editorOpen.value = true
}
async function saveKnowledge() {
  savingKnowledge.value = true
  const payload = { title: form.value.title.trim(), content: form.value.content.trim(), tags: form.value.tags, enabled: form.value.enabled }
  try {
    if (mode.value === 'create') {
      const created = await api.admin.addAiKnowledge(payload)
      knowledge.value = [created, ...knowledge.value]
      toast(t('admin.ai.toastKnowledgeAdded'))
    }
    else if (target.value) {
      const updated = await api.admin.updateAiKnowledge(target.value.id, payload)
      const i = knowledge.value.findIndex(x => x.id === updated.id)
      if (i !== -1)
        knowledge.value[i] = updated
      toast(t('admin.ai.toastKnowledgeSaved'))
    }
    editorOpen.value = false
    loadStats()
  }
  catch (e) { fail(e) }
  finally { savingKnowledge.value = false }
}
async function toggleKnowledge(k: AiKnowledgeEntry) {
  try {
    const updated = await api.admin.updateAiKnowledge(k.id, { enabled: !k.enabled })
    const i = knowledge.value.findIndex(x => x.id === k.id)
    if (i !== -1)
      knowledge.value[i] = updated
    loadStats()
  }
  catch (e) { fail(e) }
}
async function removeKnowledge(k: AiKnowledgeEntry) {
  const ok = await confirm({
    title: t('admin.ai.confirmDeleteTitle'),
    message: t('admin.ai.confirmDeleteMsg', { title: k.title }),
    confirmText: t('admin.ai.delete'),
    tone: 'danger',
    icon: 'mdi-delete-outline',
  })
  if (!ok)
    return
  try {
    await api.admin.deleteAiKnowledge(k.id)
    knowledge.value = knowledge.value.filter(x => x.id !== k.id)
    toast(t('admin.ai.toastKnowledgeDeleted'))
    loadStats()
  }
  catch (e) { fail(e) }
}
</script>

<template>
  <div>
    <PageHeader v-if="!embedded" :title="t('admin.ai.title')" :subtitle="t('admin.ai.subtitle')" icon="mdi-robot-outline" />

    <!-- شريط الإحصاءات -->
    <div class="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div class="grid grid-cols-2 gap-3 lg:col-span-2">
        <StatCard icon="mdi-connection" :value="providerLabel" :title="t('admin.ai.statProvider')" color="primary" />
        <StatCard icon="mdi-brain" :value="settings?.model || '—'" :title="t('admin.ai.statModel')" color="info" />
        <StatCard icon="mdi-puzzle-outline" :value="`${enabledCaps}/${capabilities.length}`" :title="t('admin.ai.statSections')" color="accent" />
        <StatCard icon="mdi-book-open-variant" :value="`${activeKnowledge}/${knowledge.length}`" :title="t('admin.ai.statKnowledge')" color="success" />
        <StatCard
          icon="mdi-fire"
          class="col-span-2"
          :value="usageMonthLabel"
          :title="t('admin.ai.statUsageMonth')"
          :trend="`${usageTodayLabel} ${t('admin.ai.statUsageToday')} · ${stats?.usageUsers ?? 0} ${t('admin.ai.statUsageUsers')}`"
          color="warning"
        />
      </div>
      <BaseCard>
        <div class="mb-2 flex items-center gap-2">
          <BaseIcon name="mdi-chart-donut" :size="18" class="text-brand" />
          <h2 class="text-sm font-bold text-content">{{ t('admin.ai.chartMonthly') }}</h2>
        </div>
        <DonutChart v-if="donutData.length" :data="donutData" :size="150" :center-label="t('admin.ai.chartCenter')" />
        <p v-else class="py-6 text-center text-xs text-muted">{{ t('admin.ai.chartEmpty') }}</p>
      </BaseCard>
    </div>

    <!-- المفتاح الرئيسيّ -->
    <BaseCard v-if="settings" class="mb-5">
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="grid h-12 w-12 place-items-center rounded-ui text-2xl" :style="{ background: settings.enabled ? 'rgba(var(--v-theme-primary), 0.12)' : 'rgba(var(--v-theme-on-surface), 0.08)' }">🤖</div>
          <div>
            <div class="font-bold text-content">{{ t('admin.ai.masterTitle') }}</div>
            <div class="text-xs text-muted">
              {{ settings.enabled ? t('admin.ai.masterOn', { caps: enabledCaps, total: capabilities.length, kb: activeKnowledge }) : t('admin.ai.masterOff') }}
            </div>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <BaseChip :color="settings.enabled ? 'success' : 'neutral'">{{ settings.enabled ? t('admin.ai.statusOn') : t('admin.ai.statusOff') }}</BaseChip>
          <BaseSwitch :model-value="settings.enabled" :disabled="!canManage" @update:model-value="toggleMaster" />
        </div>
      </div>
    </BaseCard>

    <BaseTabs v-model="tab" :tabs="tabs" />

    <!-- ═══ عام ═══ -->
    <BaseCard v-if="settings && tab === 'general'" class="mt-4">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label class="mb-1 block text-sm font-medium text-muted">{{ t('admin.ai.fieldProvider') }}</label>
          <BaseSelect :model-value="settings.provider" :items="PROVIDERS" :disabled="!canManage" @update:model-value="v => onProviderChange(v as AiProvider)" />
        </div>
        <BaseInput v-model="settings.model" :label="t('admin.ai.fieldModel')" :disabled="!canManage" />
        <div v-if="settings.provider === 'claude' || settings.provider === 'openai'" class="sm:col-span-2">
          <label class="mb-1 block text-sm font-medium text-muted">{{ t('admin.ai.fieldApiKey') }}</label>
          <p class="rounded-ui border border-dashed border-ui px-3 py-2 text-xs text-muted">{{ t('admin.ai.keyNote', { env: settings.provider === 'openai' ? 'OPENAI_API_KEY' : 'ANTHROPIC_API_KEY' }) }}</p>
        </div>
        <BaseInput v-else v-model="settings.apiKey" type="password" :label="t('admin.ai.fieldApiKey')" placeholder="sk-..." :disabled="!canManage" />
        <BaseInput v-if="settings.provider === 'custom'" v-model="settings.endpoint" :label="t('admin.ai.fieldEndpoint')" placeholder="https://..." :disabled="!canManage" class="sm:col-span-2" />
        <div>
          <label class="mb-1 block text-sm font-medium text-muted">{{ t('admin.ai.fieldTemperature') }}: <b>{{ settings.temperature.toFixed(1) }}</b></label>
          <BaseSlider :model-value="settings.temperature" :min="0" :max="1" :step="0.1" @update:model-value="v => settings && (settings.temperature = v)" />
        </div>
        <BaseInput v-model.number="settings.maxTokens" type="number" :label="t('admin.ai.fieldMaxTokens')" :disabled="!canManage" />
        <div>
          <label class="mb-1 block text-sm font-medium text-muted">{{ t('admin.ai.fieldLanguage') }}</label>
          <BaseSelect :model-value="settings.language" :items="LANGS" :disabled="!canManage" @update:model-value="v => settings && (settings.language = (v as 'ar' | 'en' | 'auto'))" />
        </div>
      </div>

      <div class="mt-4">
        <BaseTextarea v-model="settings.systemPrompt as string" :label="t('admin.ai.fieldSystemPrompt')" :rows="4" :disabled="!canManage" />
      </div>

      <!-- مستويات المساعد -->
      <div class="mt-5">
        <label class="mb-2 block text-sm font-bold text-content">{{ t('admin.ai.levelsTitle') }}</label>
        <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div v-for="lv in ASSISTANT_LEVELS" :key="lv.id" class="rounded-ui border p-3 transition" :style="{ borderColor: settings.assistantLevel === lv.id ? 'rgb(var(--v-theme-primary))' : 'rgba(var(--v-theme-on-surface),0.15)' }">
            <button type="button" class="w-full text-start" :disabled="!canManage" @click="settings && (settings.assistantLevel = lv.id)">
              <div class="flex items-center gap-2">
                <span class="text-xl">{{ lv.icon }}</span>
                <span class="font-medium text-content">{{ t(lv.labelKey) }}</span>
                <BaseChip v-if="settings.assistantLevel === lv.id" color="brand" class="ms-auto">{{ t('admin.ai.levelDefault') }}</BaseChip>
              </div>
              <p class="mt-1 text-xs text-muted">{{ t(lv.hintKey) }}</p>
            </button>
            <div class="mt-2">
              <label class="mb-1 block text-[11px] text-muted">{{ t('admin.ai.density') }}: <b>{{ levelTokensOf(lv.id) }}</b> {{ t('admin.ai.tokenUnit') }}</label>
              <BaseSlider :model-value="levelTokensOf(lv.id)" :min="256" :max="4096" :step="128" @update:model-value="v => setLevelTokens(lv.id, v)" />
            </div>
          </div>
        </div>
        <div class="mt-3">
          <BaseSwitch v-model="settings.allowUserLevelOverride" :label="settings.allowUserLevelOverride ? t('admin.ai.overrideOn') : t('admin.ai.overrideOff')" :disabled="!canManage" />
        </div>
      </div>

      <div class="mt-5 flex items-center justify-end gap-2">
        <span v-if="settings.provider === 'simulation'" class="me-auto text-xs text-muted">{{ t('admin.ai.simNote') }}</span>
        <BaseButton variant="brand" :disabled="!canManage || savingGeneral" @click="saveGeneral">
          <BaseIcon name="mdi-content-save-outline" :size="18" />{{ t('admin.ai.saveSettings') }}
        </BaseButton>
      </div>
    </BaseCard>

    <!-- ═══ الأقسام ═══ -->
    <div v-else-if="tab === 'sections'" class="mt-4">
      <p class="mb-3 text-sm text-muted">{{ t('admin.ai.sectionsDesc') }}</p>
      <div v-if="settings && !settings.enabled" class="mb-3 rounded-ui border border-dashed border-ui px-3 py-2 text-xs text-muted">{{ t('admin.ai.masterOffNote') }}</div>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <BaseCard v-for="c in capabilities" :key="c.id" :class="{ 'opacity-60': !c.enabled || !settings?.enabled }">
          <div class="mb-2 flex items-start justify-between">
            <div class="grid h-10 w-10 place-items-center rounded-ui text-brand" style="background: rgba(var(--v-theme-primary),0.1)">
              <BaseIcon :name="c.icon || 'mdi-robot-outline'" :size="20" />
            </div>
            <BaseSwitch :model-value="c.enabled" :disabled="!canManage || !settings?.enabled" @update:model-value="toggleCapability(c)" />
          </div>
          <div class="font-medium text-content">{{ c.label }}</div>
          <p class="mt-0.5 text-xs text-muted">{{ c.hint }}</p>
        </BaseCard>
      </div>
    </div>

    <!-- ═══ الحصص ═══ -->
    <BaseCard v-else-if="tab === 'quotas'" class="mt-4">
      <p class="mb-3 text-sm text-muted">{{ t('admin.ai.quotaDesc') }}</p>

      <div class="mb-4 flex flex-col gap-2 rounded-ui border-ui p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div class="font-medium text-content">{{ t('admin.ai.docReadsLabel') }}</div>
          <div class="text-xs text-muted">{{ t('admin.ai.docReadsHint') }}</div>
        </div>
        <div class="flex items-center gap-3 sm:w-64">
          <BaseSlider :model-value="docMaxReads" :min="1" :max="10" :step="1" @update:model-value="v => docMaxReads = v" />
          <b class="w-6 text-center text-content">{{ docMaxReads }}</b>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-ui text-start text-muted">
              <th class="p-2 text-start font-medium">{{ t('admin.ai.colPlan') }}</th>
              <th v-for="f in QUOTA_FIELDS" :key="f.key" class="p-2 text-center font-medium">{{ t(f.label) }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="q in quotas" :key="q.key" class="border-b border-ui">
              <td class="whitespace-nowrap p-2 font-medium text-content">{{ q.name }}</td>
              <td v-for="f in QUOTA_FIELDS" :key="f.key" class="p-1.5">
                <input
                  v-model.number="(q[f.key] as number)"
                  type="number" min="0" step="1000" inputmode="numeric" :disabled="!canManage"
                  class="w-28 rounded-ui bg-surface px-2 py-1.5 text-center text-content outline-none"
                  style="border: 1px solid rgba(var(--v-theme-on-surface),0.15)"
                >
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="mt-2 text-xs text-muted">{{ t('admin.ai.quotaZeroNote') }}</p>

      <div class="mt-4 flex justify-end">
        <BaseButton variant="brand" :disabled="!canManage || savingQuotas" @click="saveQuotas">
          <BaseIcon name="mdi-content-save-outline" :size="18" />{{ t('admin.ai.saveQuotas') }}
        </BaseButton>
      </div>
    </BaseCard>

    <!-- ═══ قاعدة المعرفة ═══ -->
    <div v-else-if="tab === 'knowledge'" class="mt-4">
      <div class="mb-3 flex items-center justify-between">
        <p class="text-sm text-muted">{{ t('admin.ai.knowledgeDesc') }}</p>
        <BaseButton variant="brand" size="sm" :disabled="!canManage" @click="openCreate">
          <BaseIcon name="mdi-plus" :size="18" />{{ t('admin.ai.addKnowledge') }}
        </BaseButton>
      </div>

      <BaseCard v-if="!knowledge.length" class="py-8 text-center text-sm text-muted">{{ t('admin.ai.knowledgeEmpty') }}</BaseCard>
      <div v-else class="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <BaseCard v-for="k in knowledge" :key="k.id" :class="{ 'opacity-60': !k.enabled }">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-medium text-content">{{ k.title }}</span>
                <BaseChip :color="k.enabled ? 'success' : 'neutral'">{{ k.enabled ? t('admin.ai.statusOn') : t('admin.ai.statusOff') }}</BaseChip>
              </div>
              <p class="mt-1 line-clamp-3 text-xs text-muted">{{ k.content }}</p>
              <div v-if="k.tags.length" class="mt-2 flex flex-wrap gap-1">
                <span v-for="tag in k.tags" :key="tag" class="rounded-full px-2 py-0.5 text-[11px] text-brand" style="background: rgba(var(--v-theme-primary),0.1)">#{{ tag }}</span>
              </div>
            </div>
            <div class="flex shrink-0 items-center gap-1">
              <BaseSwitch :model-value="k.enabled" :disabled="!canManage" @update:model-value="toggleKnowledge(k)" />
              <BaseTooltip :text="t('admin.ai.edit')">
                <button class="row-act text-brand" :aria-label="t('admin.ai.edit')" :disabled="!canManage" @click="openEdit(k)"><BaseIcon name="mdi-pencil-outline" :size="18" /></button>
              </BaseTooltip>
              <BaseTooltip :text="t('admin.ai.delete')">
                <button class="row-act" style="color: rgb(var(--v-theme-error))" :aria-label="t('admin.ai.delete')" :disabled="!canManage" @click="removeKnowledge(k)"><BaseIcon name="mdi-delete-outline" :size="18" /></button>
              </BaseTooltip>
            </div>
          </div>
        </BaseCard>
      </div>
    </div>

    <!-- محرّر المعرفة -->
    <BaseModal v-model="editorOpen" :title="mode === 'create' ? t('admin.ai.newKnowledge') : t('admin.ai.editKnowledge')" :max-width="600">
      <div class="space-y-4">
        <BaseInput v-model="form.title" :label="t('admin.ai.fieldTitle')" />
        <BaseTextarea v-model="form.content" :label="t('admin.ai.fieldContent')" :rows="6" />
        <BaseTagInput v-model="form.tags" :label="t('admin.ai.fieldTags')" :placeholder="t('admin.ai.addTag')" />
        <BaseSwitch v-model="form.enabled" :label="form.enabled ? t('admin.ai.statusOn') : t('admin.ai.statusOff')" />
      </div>
      <template #actions>
        <BaseButton variant="ghost" @click="editorOpen = false">{{ t('admin.users.cancel') }}</BaseButton>
        <BaseButton variant="brand" :disabled="savingKnowledge || !form.title.trim() || !form.content.trim()" @click="saveKnowledge">
          <BaseIcon name="mdi-check" :size="18" />{{ mode === 'create' ? t('admin.ai.add') : t('admin.ai.save') }}
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
.row-act:hover:not(:disabled) {
  background: rgba(var(--v-theme-on-surface), 0.08);
}
.row-act:disabled {
  opacity: 0.4;
}
</style>
