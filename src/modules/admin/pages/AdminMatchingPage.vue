<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import PageHeader from '@/components/shared/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseSlider from '@/components/ui/BaseSlider.vue'
import BaseSnackbar from '@/components/ui/BaseSnackbar.vue'
import BaseSwitch from '@/components/ui/BaseSwitch.vue'
import { type MatchExplain, type MatchSettings, type MatchShortlist, type PipelineOpportunity, api } from '@/services/api'
import { useAuthStore } from '@/stores/AuthStore'

const { t } = useI18n()
const auth = useAuthStore()
const canManage = computed(() => auth.hasPermission('manage_matching'))

const snack = ref({ show: false, text: '', color: 'success' })
function toast(text: string, color = 'success') { snack.value = { show: true, text, color } }
function fail(e: unknown) { toast((e as { message?: string })?.message ?? t('admin.toast.failed'), 'error') }

const opportunities = ref<PipelineOpportunity[]>([])
const selectedOpp = ref<number | null>(null)
const settings = ref<MatchSettings | null>(null)
const aiActive = ref(false)
const result = ref<MatchShortlist | null>(null)
const loading = ref(false)

const oppItems = computed(() => opportunities.value.map(o => ({ value: o.id, title: `${o.title}${o.company ? ` — ${o.company}` : ''} (${o.applications})` })))

async function loadInit() {
  try {
    opportunities.value = await api.admin.pipelineOpportunities()
    const s = await api.admin.matchingSettings()
    settings.value = s.settings
    aiActive.value = s.aiActive
    if (opportunities.value.length) {
      selectedOpp.value = opportunities.value[0].id
      loadShortlist()
    }
  }
  catch (e) { fail(e) }
}
async function loadShortlist() {
  if (!selectedOpp.value)
    return
  loading.value = true
  try { result.value = await api.admin.matchingShortlist(selectedOpp.value) }
  catch (e) { fail(e) }
  finally { loading.value = false }
}
function onOppChange(v: number | null) { selectedOpp.value = v; explanations.value = {}; loadShortlist() }

// تفسير الترشيح بالذكاء (عند الطلب، لكلّ مرشّح على حدة)
const explanations = ref<Record<number, MatchExplain>>({})
const explaining = ref<Record<number, boolean>>({})
async function explainRow(applicationId: number) {
  if (!selectedOpp.value)
    return
  explaining.value = { ...explaining.value, [applicationId]: true }
  try { explanations.value = { ...explanations.value, [applicationId]: await api.admin.explainMatch(selectedOpp.value, applicationId) } }
  catch (e) { fail(e) }
  finally { explaining.value = { ...explaining.value, [applicationId]: false } }
}

const saving = ref(false)
async function saveSettings() {
  if (!settings.value)
    return
  saving.value = true
  try {
    settings.value = await api.admin.updateMatchingSettings({
      skills_weight: settings.value.skillsWeight,
      experience_weight: settings.value.experienceWeight,
      category_weight: settings.value.categoryWeight,
      threshold: settings.value.threshold,
      ai_boost: settings.value.aiBoost,
    })
    toast(t('admin.matching.saved'))
    loadShortlist()
  }
  catch (e) { fail(e) }
  finally { saving.value = false }
}

function scoreColor(score: number) {
  const th = result.value?.threshold ?? 50
  return score >= th + 20 ? 'success' : (score >= th ? 'warning' : 'error')
}
const stageLabel = (k: string) => t(`admin.pipeline.stage_${k}`)

onMounted(loadInit)
</script>

<template>
  <div>
    <PageHeader :title="t('admin.matching.title')" :subtitle="t('admin.matching.subtitle')" icon="mdi-target-account">
      <template #actions>
        <div class="w-72"><BaseSelect :model-value="selectedOpp ?? undefined" :items="oppItems" @update:model-value="v => onOppChange(v as number)" /></div>
      </template>
    </PageHeader>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <!-- أوزان المطابقة -->
      <BaseCard v-if="settings" class="lg:col-span-1">
        <div class="mb-3 flex items-center justify-between">
          <div class="flex items-center gap-2"><BaseIcon name="mdi-tune-variant" :size="20" class="text-brand" /><h2 class="font-bold text-content">{{ t('admin.matching.weights') }}</h2></div>
          <BaseChip :color="aiActive ? 'success' : 'neutral'">{{ aiActive ? t('admin.matching.aiOn') : t('admin.matching.aiOff') }}</BaseChip>
        </div>

        <div class="space-y-3">
          <div>
            <label class="mb-1 flex justify-between text-sm"><span class="text-muted">{{ t('admin.matching.wSkills') }}</span><b class="text-content">{{ settings.skillsWeight }}</b></label>
            <BaseSlider :model-value="settings.skillsWeight" :min="0" :max="100" :step="5" :disabled="!canManage" @update:model-value="v => settings && (settings.skillsWeight = v)" />
          </div>
          <div>
            <label class="mb-1 flex justify-between text-sm"><span class="text-muted">{{ t('admin.matching.wExperience') }}</span><b class="text-content">{{ settings.experienceWeight }}</b></label>
            <BaseSlider :model-value="settings.experienceWeight" :min="0" :max="100" :step="5" :disabled="!canManage" @update:model-value="v => settings && (settings.experienceWeight = v)" />
          </div>
          <div>
            <label class="mb-1 flex justify-between text-sm"><span class="text-muted">{{ t('admin.matching.wCategory') }}</span><b class="text-content">{{ settings.categoryWeight }}</b></label>
            <BaseSlider :model-value="settings.categoryWeight" :min="0" :max="100" :step="5" :disabled="!canManage" @update:model-value="v => settings && (settings.categoryWeight = v)" />
          </div>
          <div class="border-t border-ui pt-2">
            <label class="mb-1 flex justify-between text-sm"><span class="text-muted">{{ t('admin.matching.threshold') }}</span><b class="text-content">{{ settings.threshold }}%</b></label>
            <BaseSlider :model-value="settings.threshold" :min="0" :max="100" :step="5" :disabled="!canManage" @update:model-value="v => settings && (settings.threshold = v)" />
          </div>
          <BaseSwitch v-model="settings.aiBoost" :label="t('admin.matching.aiBoost')" :disabled="!canManage" />
          <p class="flex items-center gap-1 text-[11px] text-muted">
            <BaseIcon name="mdi-information-outline" :size="13" />{{ t('admin.matching.aiBoostNote') }}
            <RouterLink :to="{ name: 'admin-ai' }" class="text-brand hover:underline">{{ t('admin.matching.aiLink') }}</RouterLink>
          </p>
          <BaseButton variant="brand" size="sm" :disabled="!canManage || saving" @click="saveSettings"><BaseIcon name="mdi-content-save-outline" :size="16" />{{ t('admin.matching.save') }}</BaseButton>
        </div>
      </BaseCard>

      <!-- القائمة المختصرة -->
      <BaseCard v-if="result" class="lg:col-span-2">
        <div class="mb-3 flex items-center justify-between">
          <div class="flex items-center gap-2"><BaseIcon name="mdi-format-list-numbered" :size="20" class="text-brand" /><h2 class="font-bold text-content">{{ t('admin.matching.shortlist') }}</h2></div>
          <div class="flex flex-wrap gap-1">
            <span class="text-xs text-muted">{{ t('admin.matching.requiredSkills') }}:</span>
            <BaseChip v-for="sk in result.opportunity.skills" :key="sk" color="info">{{ sk }}</BaseChip>
          </div>
        </div>

        <div class="space-y-2">
          <div v-for="(row, i) in result.shortlist" :key="row.applicationId" class="rounded-ui border-ui p-2.5">
            <div class="flex items-center gap-3">
              <div class="grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold" :style="{ background: `rgba(var(--v-theme-${scoreColor(row.score)}),0.15)`, color: `rgb(var(--v-theme-${scoreColor(row.score)}))` }">{{ i + 1 }}</div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span class="truncate font-medium text-content">{{ row.candidate }}</span>
                  <BaseChip color="neutral">{{ stageLabel(row.stage) }}</BaseChip>
                </div>
                <div class="mt-1 h-2 w-full overflow-hidden rounded-full" style="background: rgba(var(--v-theme-on-surface),0.06)">
                  <div class="h-full rounded-full" :style="{ width: `${row.score}%`, background: `rgb(var(--v-theme-${scoreColor(row.score)}))` }" />
                </div>
                <div class="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-muted">
                  <span>{{ t('admin.matching.bSkills') }} {{ row.breakdown.skills }}%</span>·
                  <span>{{ t('admin.matching.bExp') }} {{ row.breakdown.experience }}%</span>·
                  <span>{{ t('admin.matching.bCat') }} {{ row.breakdown.category }}%</span>
                  <BaseChip v-if="row.breakdown.aiBoost" color="brand">{{ t('admin.matching.boosted') }}</BaseChip>
                  <span v-for="ms in row.matchedSkills" :key="ms" class="rounded-full px-1.5 py-0.5 text-[10px] text-success" style="background: rgba(var(--v-theme-success),0.12)">{{ ms }}</span>
                </div>
              </div>
              <div class="shrink-0 text-end">
                <div class="text-lg font-bold" :style="{ color: `rgb(var(--v-theme-${scoreColor(row.score)}))` }">{{ row.score }}</div>
                <div class="text-[10px] text-muted">{{ t('admin.matching.score') }}</div>
              </div>
            </div>

            <!-- تفسير الترشيح بالذكاء -->
            <div class="mt-2 flex justify-end">
              <BaseButton variant="ghost" size="sm" :loading="explaining[row.applicationId]" @click="explainRow(row.applicationId)">
                <BaseIcon name="mdi-brain" :size="15" />{{ explanations[row.applicationId] ? t('admin.matching.reanalyze') : t('admin.matching.analyze') }}
              </BaseButton>
            </div>

            <div v-if="explanations[row.applicationId]" class="mt-1 rounded-ui border-ui bg-surface-2 p-3 text-sm">
              <div class="mb-2 flex flex-wrap items-center gap-2">
                <BaseChip :color="scoreColor(explanations[row.applicationId].score)">{{ explanations[row.applicationId].verdict }} · {{ explanations[row.applicationId].score }}</BaseChip>
                <BaseChip :color="explanations[row.applicationId].live ? 'brand' : 'neutral'">
                  <BaseIcon :name="explanations[row.applicationId].live ? 'mdi-check-decagram' : 'mdi-flask-outline'" :size="13" />
                  {{ explanations[row.applicationId].live ? t('admin.matching.live') : t('admin.matching.heuristic') }}
                </BaseChip>
              </div>
              <p v-if="explanations[row.applicationId].summary" class="mb-2 text-content">{{ explanations[row.applicationId].summary }}</p>
              <ul v-if="explanations[row.applicationId].reasons.length" class="space-y-1">
                <li v-for="(r, ri) in explanations[row.applicationId].reasons" :key="`r${ri}`" class="flex items-start gap-1.5 text-muted">
                  <BaseIcon name="mdi-check-circle-outline" :size="15" class="mt-0.5 shrink-0 text-success" /><span>{{ r }}</span>
                </li>
              </ul>
              <ul v-if="explanations[row.applicationId].redFlags.length" class="mt-1 space-y-1">
                <li v-for="(f, fi) in explanations[row.applicationId].redFlags" :key="`f${fi}`" class="flex items-start gap-1.5 text-muted">
                  <BaseIcon name="mdi-alert-outline" :size="15" class="mt-0.5 shrink-0 text-warning" /><span>{{ f }}</span>
                </li>
              </ul>
            </div>
          </div>
          <p v-if="!result.shortlist.length && !loading" class="py-8 text-center text-sm text-muted">{{ t('admin.matching.noApplicants') }}</p>
        </div>
      </BaseCard>
    </div>

    <BaseSnackbar v-model="snack.show" :color="snack.color">{{ snack.text }}</BaseSnackbar>
  </div>
</template>
