<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useTrustStore } from '@/stores/TrustStore'
import { ai } from '@/services/ai'
import TrustRadar from './TrustRadar.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseProgressRing from '@/components/ui/BaseProgressRing.vue'
import BaseProgressBar from '@/components/ui/BaseProgressBar.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseSnackbar from '@/components/ui/BaseSnackbar.vue'

const store = useTrustStore()
const router = useRouter()
const dialog = ref(false)
const refreshing = ref(false)
const motivation = ref('')

type BaseColor = 'brand' | 'emerald' | 'accent' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
function mapColor(c?: string): BaseColor {
  return (({ primary: 'brand', secondary: 'emerald', 'medium-emphasis': 'neutral', 'surface-variant': 'neutral', grey: 'neutral', amber: 'warning' } as Record<string, BaseColor>)[c ?? ''] ?? c ?? 'brand') as BaseColor
}
function colorVar(c: string) {
  return `rgb(var(--v-theme-${c === 'amber' ? 'warning' : c}))`
}

// Motivational nudge whenever the score changes (live reaction to new proofs/interviews)
let prevScore = store.score
watch(() => store.score, (val) => {
  const delta = val - prevScore
  prevScore = val
  if (delta !== 0)
    motivation.value = ai.trustMotivation(delta, val)
})

// Manual re-analysis: recomputes are automatic, so this replays the AI pass with feedback
function refreshAnalysis() {
  refreshing.value = true
  setTimeout(() => {
    refreshing.value = false
    motivation.value = ai.trustMotivation(0, store.score)
  }, 700)
}

function factorColor(v: number) {
  if (v >= 70)
    return 'success'
  if (v >= 40)
    return 'warning'
  return 'error'
}
</script>

<template>
  <BaseCard>
    <div class="flex items-center gap-4">
      <BaseProgressRing :value="store.score" :size="88" :width="9" :color="store.level.color">
        <span class="text-lg font-bold text-content">{{ store.score }}</span>
      </BaseProgressRing>
      <div class="flex-1">
        <div class="flex items-center gap-2">
          <span class="text-base font-bold text-content">نسبة الثقة</span>
          <BaseChip :color="mapColor(store.level.color)">{{ store.level.label }}</BaseChip>
        </div>
        <p class="mb-2 text-xs text-muted">مؤشر مصداقية ملفك بناءً على 8 عوامل موضوعية</p>
        <div class="flex flex-wrap gap-2">
          <BaseButton variant="tonal-brand" size="sm" @click="dialog = true">
            <BaseIcon name="mdi-chart-timeline-variant" :size="16" />عرض التفاصيل
          </BaseButton>
          <BaseButton variant="ghost" size="sm" :loading="refreshing" @click="refreshAnalysis">
            <BaseIcon name="mdi-refresh" :size="16" :style="{ color: 'rgb(var(--v-theme-secondary))' }" />
            <span :style="{ color: 'rgb(var(--v-theme-secondary))' }">تحديث التحليل</span>
          </BaseButton>
        </div>
      </div>
    </div>

    <!-- Motivational AI nudge -->
    <BaseSnackbar :model-value="!!motivation" color="secondary" :timeout="4500" @update:model-value="motivation = ''">
      <BaseIcon name="mdi-robot-happy-outline" :size="20" />
      <span>{{ motivation }}</span>
    </BaseSnackbar>

    <!-- Breakdown dialog -->
    <BaseModal v-model="dialog" :max-width="640">
      <template #title>
        <span>تحليل نسبة الثقة — {{ store.score }}/100</span>
      </template>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-12">
        <div class="flex items-center justify-center text-muted md:col-span-5">
          <TrustRadar :points="store.factors.map(f => ({ label: f.label.split(' ')[0], value: f.value }))" :size="240" />
        </div>
        <div class="md:col-span-7">
          <div v-for="f in store.factors" :key="f.key" class="mb-2">
            <div class="mb-1 flex justify-between text-xs">
              <span>{{ f.label }} <span class="text-muted">({{ f.weight }}%)</span></span>
              <span class="font-bold" :style="{ color: colorVar(factorColor(f.value)) }">{{ f.value }}%</span>
            </div>
            <BaseProgressBar :value="f.value" :color="factorColor(f.value)" :height="6" />
          </div>
        </div>
      </div>

      <hr class="my-3 border-ui">
      <div class="mb-2 flex items-center gap-2">
        <BaseIcon name="mdi-robot-happy-outline" :size="20" :style="{ color: 'rgb(var(--v-theme-secondary))' }" />
        <span class="text-sm font-bold text-content">نصائح الذكاء الاصطناعي لرفع نسبتك</span>
      </div>
      <div
        v-for="(tip, i) in store.tips"
        :key="i"
        class="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-ui px-3 py-2"
        style="background: rgba(var(--v-theme-secondary), 0.16); color: rgb(var(--v-theme-secondary))"
      >
        <span class="text-sm">
          {{ tip.text }}
          <BaseChip v-if="tip.gain" color="success" class="ms-1">+{{ tip.gain }}%</BaseChip>
        </span>
        <BaseButton v-if="tip.action" variant="accent" size="sm" @click="dialog = false; router.push({ name: tip.action })">
          {{ tip.actionLabel }}
        </BaseButton>
      </div>
    </BaseModal>
  </BaseCard>
</template>
