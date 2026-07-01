<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { AdaptiveQuestion, PressurePayload } from '@/services/ai'

const props = defineProps<{ question: AdaptiveQuestion }>()
const answer = defineModel<string>('answer', { default: '' })
const payload = computed(() => props.question.payload as PressurePayload)

const phase = ref<'reading' | 'answering'>('reading')
const readLeft = ref(payload.value.flashSeconds)
const recording = ref(false)
let timerId: ReturnType<typeof setInterval> | undefined

const readPct = computed(() => (readLeft.value / payload.value.flashSeconds) * 100)

function beginAnswering() {
  clearInterval(timerId)
  phase.value = 'answering'
}

onMounted(() => {
  timerId = setInterval(() => {
    if (readLeft.value > 0)
      readLeft.value--
    else beginAnswering()
  }, 1000)
})
onBeforeUnmount(() => clearInterval(timerId))
</script>

<template>
  <div>
    <!-- Reading phase: scenario flashes then disappears -->
    <template v-if="phase === 'reading'">
      <div class="flash pa-5 rounded-lg text-center">
        <div class="d-flex align-center justify-center ga-2 mb-3">
          <VProgressCircular :model-value="readPct" :size="46" :width="4" color="error">
            <span class="text-caption font-weight-bold">{{ readLeft }}</span>
          </VProgressCircular>
          <span class="text-caption text-medium-emphasis">احفظ التفاصيل — سيختفي السيناريو</span>
        </div>
        <div class="text-h6 font-weight-bold">{{ payload.scenario }}</div>
      </div>
      <VBtn variant="text" color="medium-emphasis" size="small" class="mt-2" prepend-icon="mdi-fast-forward" @click="beginAnswering">
        حفظت التفاصيل — ابدأ الإجابة
      </VBtn>
    </template>

    <!-- Answering phase: scenario hidden, answer from memory -->
    <template v-else>
      <VAlert type="warning" variant="tonal" density="compact" class="mb-3">
        <VIcon icon="mdi-eye-off-outline" size="16" class="me-1" />اختفى السيناريو — أجب من ذاكرتك: ماذا كان فيه؟ وكيف ستتصرف الآن؟
      </VAlert>

      <div class="d-flex align-center ga-2 mb-2">
        <VBtn
          :color="recording ? 'error' : 'primary'"
          :variant="recording ? 'flat' : 'tonal'"
          size="small"
          :prepend-icon="recording ? 'mdi-stop' : 'mdi-microphone'"
          @click="recording = !recording"
        >
          {{ recording ? 'إيقاف التسجيل' : 'تسجيل صوتي' }}
        </VBtn>
        <span v-if="recording" class="d-flex align-center text-caption text-error">
          <VIcon icon="mdi-record-circle" size="14" class="pulse me-1" />يحلّل الـ AI نبرتك وثقتك...
        </span>
      </div>

      <VTextarea
        v-model="answer"
        label="إجابتك (من الذاكرة)"
        placeholder="لخّص ما تذكّرته ثم اطرح خطتك بثقة..."
        rows="4"
        auto-grow
      />
    </template>
  </div>
</template>

<style scoped>
.flash {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(249, 115, 22, 0.08));
  border: 1px dashed rgba(239, 68, 68, 0.5);
}
.pulse { animation: pulse 1s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
</style>
