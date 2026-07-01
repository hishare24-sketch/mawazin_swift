<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { AdaptiveQuestion, ProjectDivePayload } from '@/services/ai'

const props = defineProps<{ question: AdaptiveQuestion }>()
const answer = defineModel<string>('answer', { default: '' })
const payload = computed(() => props.question.payload as ProjectDivePayload)

const link = ref('')
const loaded = ref(false)
const description = ref('')

// AI-generated deep questions appear once the user "loads" their project
const deepQuestions = computed(() => [
  'ما القرار الأصعب الذي اتخذته في هذا المشروع ولماذا؟',
  'كيف قِست نجاح هذا العمل؟ اذكر رقمًا أو أثرًا ملموسًا.',
  'لو أعدت تنفيذه اليوم، ما الذي ستغيّره؟',
])

function loadProject() {
  if (link.value.trim() || description.value.trim())
    loaded.value = true
}

watch([link, description], () => {
  answer.value = `المشروع: ${link.value || '(وصف)'} — ${description.value}`
})
</script>

<template>
  <div>
    <VTextField
      v-model="link"
      label="رابط مشروعك (GitHub / Behance) أو اسمه"
      :placeholder="payload.placeholder"
      prepend-inner-icon="mdi-link-variant"
      class="mb-2"
    />
    <VBtn v-if="!loaded" size="small" color="primary" variant="tonal" prepend-icon="mdi-magnify-scan" :disabled="!link.trim() && !description.trim()" @click="loadProject">
      تحليل المشروع بالـ AI
    </VBtn>

    <VExpandTransition>
      <div v-if="loaded" class="mt-2">
        <VAlert color="secondary" variant="tonal" density="compact" class="mb-3" border="start">
          <template #prepend><VIcon icon="mdi-robot-happy-outline" size="18" /></template>
          <div class="text-caption font-weight-bold mb-1">قرأ الـ AI مشروعك — أجب عن أسئلة العمق (يصعب انتحالها):</div>
          <ol class="ps-4 text-caption">
            <li v-for="q in deepQuestions" :key="q">{{ q }}</li>
          </ol>
        </VAlert>
      </div>
    </VExpandTransition>

    <VTextarea
      v-model="description"
      label="أجب عن أسئلة العمق بقراراتك الفعلية"
      placeholder="تحدّث عن قراراتك الحقيقية وأثرها..."
      rows="5"
      auto-grow
    />
  </div>
</template>
