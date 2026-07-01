<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useTrustStore } from '@/stores/TrustStore'
import { ai } from '@/services/ai'
import TrustRadar from './TrustRadar.vue'

const store = useTrustStore()
const router = useRouter()
const dialog = ref(false)
const refreshing = ref(false)
const motivation = ref('')

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
  <VCard class="pa-4">
    <div class="d-flex align-center ga-4">
      <VProgressCircular :model-value="store.score" :size="88" :width="9" :color="store.level.color">
        <span class="text-h6 font-weight-bold">{{ store.score }}</span>
      </VProgressCircular>
      <div class="flex-grow-1">
        <div class="d-flex align-center ga-2">
          <span class="text-subtitle-1 font-weight-bold">نسبة الثقة</span>
          <VChip :color="store.level.color" size="small" label>{{ store.level.label }}</VChip>
        </div>
        <p class="text-caption text-medium-emphasis mb-2">مؤشر مصداقية ملفك بناءً على 8 عوامل موضوعية</p>
        <div class="d-flex ga-2 flex-wrap">
          <VBtn variant="tonal" color="primary" size="small" prepend-icon="mdi-chart-timeline-variant" @click="dialog = true">
            عرض التفاصيل
          </VBtn>
          <VBtn variant="text" color="secondary" size="small" :loading="refreshing" prepend-icon="mdi-refresh" @click="refreshAnalysis">
            تحديث التحليل
          </VBtn>
        </div>
      </div>
    </div>

    <!-- Motivational AI nudge -->
    <VSnackbar :model-value="!!motivation" color="secondary" location="top" timeout="4500" @update:model-value="motivation = ''">
      <div class="d-flex align-center ga-2">
        <VIcon icon="mdi-robot-happy-outline" />
        <span>{{ motivation }}</span>
      </div>
    </VSnackbar>

    <!-- Breakdown dialog -->
    <VDialog v-model="dialog" max-width="640">
      <VCard class="pa-2">
        <VCardTitle class="d-flex justify-space-between align-center">
          <span>تحليل نسبة الثقة — {{ store.score }}/100</span>
          <VBtn icon="mdi-close" variant="text" size="small" @click="dialog = false" />
        </VCardTitle>
        <VCardText>
          <VRow>
            <VCol cols="12" md="5" class="d-flex justify-center align-center text-medium-emphasis">
              <TrustRadar :points="store.factors.map(f => ({ label: f.label.split(' ')[0], value: f.value }))" :size="240" />
            </VCol>
            <VCol cols="12" md="7">
              <div v-for="f in store.factors" :key="f.key" class="mb-2">
                <div class="d-flex justify-space-between text-caption mb-1">
                  <span>{{ f.label }} <span class="text-medium-emphasis">({{ f.weight }}%)</span></span>
                  <span class="font-weight-bold" :class="`text-${factorColor(f.value)}`">{{ f.value }}%</span>
                </div>
                <VProgressLinear :model-value="f.value" :color="factorColor(f.value)" height="6" rounded />
              </div>
            </VCol>
          </VRow>

          <VDivider class="my-3" />
          <div class="d-flex align-center ga-2 mb-2">
            <VIcon icon="mdi-robot-happy-outline" color="secondary" />
            <span class="text-subtitle-2 font-weight-bold">نصائح الذكاء الاصطناعي لرفع نسبتك</span>
          </div>
          <VCard v-for="(tip, i) in store.tips" :key="i" variant="tonal" color="secondary" class="pa-2 px-3 mb-2 d-flex align-center justify-space-between flex-wrap ga-2">
            <span class="text-body-2">
              {{ tip.text }}
              <VChip v-if="tip.gain" size="x-small" color="success" label class="ms-1">+{{ tip.gain }}%</VChip>
            </span>
            <VBtn v-if="tip.action" size="x-small" color="accent" variant="flat" @click="dialog = false; router.push({ name: tip.action })">
              {{ tip.actionLabel }}
            </VBtn>
          </VCard>
        </VCardText>
      </VCard>
    </VDialog>
  </VCard>
</template>
