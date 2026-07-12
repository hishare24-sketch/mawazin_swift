<script setup lang="ts">
import { ref } from 'vue'
import { api, type CvExtractionData } from '@/services/api'
import { useProfileStore } from '@/stores/ProfileStore'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'

const emit = defineEmits<{ (e: 'applied', summary: string): void, (e: 'error', message: string): void }>()

const profile = useProfileStore()
const fileInput = ref<HTMLInputElement | null>(null)
const loading = ref(false)
const result = ref<CvExtractionData | null>(null)
const live = ref(false)
const providerLabel = ref('')
const fileName = ref('')

const ACCEPT = 'image/png,image/jpeg,image/webp,application/pdf'
const MAX_BYTES = 10 * 1024 * 1024 // 10MB

function pick() {
  fileInput.value?.click()
}

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result)
      resolve(dataUrl.slice(dataUrl.indexOf(',') + 1)) // إزالة بادئة data:...;base64,
    }
    reader.onerror = () => reject(new Error('تعذّرت قراءة الملف'))
    reader.readAsDataURL(file)
  })
}

async function onFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file)
    return
  if (file.size > MAX_BYTES) {
    emit('error', 'حجم الملف يتجاوز 10 ميجابايت')
    return
  }
  fileName.value = file.name
  result.value = null
  loading.value = true
  try {
    const base64 = await readAsBase64(file)
    const res = await api.assistant.extractCv(base64, file.type)
    live.value = res.live
    result.value = res.data
    providerLabel.value = res.meta?.provider ? `${res.meta.provider}${res.meta.model ? ` · ${res.meta.model}` : ''}` : ''
    if (!res.live)
      emit('error', 'الاستخراج التلقائيّ يتطلّب تفعيل مزوّد ذكاء (Claude/OpenAI) من حوكمة الذكاء.')
  }
  catch (err) {
    emit('error', (err as { message?: string })?.message ?? 'تعذّر استخراج السيرة الذاتيّة')
  }
  finally {
    loading.value = false
    if (fileInput.value)
      fileInput.value.value = ''
  }
}

function apply() {
  const d = result.value
  if (!d)
    return
  if (d.headline)
    profile.headline = d.headline
  if (d.summary)
    profile.summary = d.summary
  for (const s of d.skills)
    profile.addSkill(s.name, s.level)
  for (const ex of d.experiences)
    profile.addExperience({ title: ex.title, company: ex.org ?? '', period: ex.years ? `${ex.years} سنوات` : '', desc: ex.summary ?? '' })
  for (const c of d.certificates)
    profile.addCertificate({ name: c.name, issuer: c.issuer ?? '', date: c.year ? String(c.year) : '' })

  const counts = `${d.skills.length} مهارة · ${d.experiences.length} خبرة · ${d.certificates.length} شهادة`
  result.value = null
  emit('applied', counts)
}

function dismiss() {
  result.value = null
}
</script>

<template>
  <BaseCard>
    <div class="flex items-start justify-between gap-3">
      <div class="flex items-start gap-3">
        <div class="rounded-ui bg-brand/10 p-2">
          <BaseIcon name="mdi-file-account-outline" :size="22" class="text-brand" />
        </div>
        <div>
          <h3 class="text-sm font-bold text-content">استيراد من السيرة الذاتيّة</h3>
          <p class="mt-0.5 text-xs text-muted">ارفع سيرتك (PDF أو صورة) ليملأ الذكاء ملفّك تلقائيًّا — مهارات وخبرات وشهادات.</p>
        </div>
      </div>
      <BaseButton variant="brand" size="sm" :disabled="loading" @click="pick">
        <BaseIcon :name="loading ? 'mdi-loading' : 'mdi-upload-outline'" :size="16" :class="loading ? 'animate-spin' : ''" />
        {{ loading ? 'جارٍ التحليل…' : 'رفع السيرة' }}
      </BaseButton>
      <input ref="fileInput" type="file" :accept="ACCEPT" class="hidden" @change="onFile">
    </div>

    <!-- معاينة النتيجة -->
    <div v-if="result && (result.confidence > 0 || result.skills.length)" class="mt-4 space-y-3 border-t border-ui pt-4">
      <div class="flex flex-wrap items-center gap-2">
        <BaseChip :color="live ? 'success' : 'neutral'">
          <BaseIcon :name="live ? 'mdi-robot-happy-outline' : 'mdi-robot-off-outline'" :size="14" />
          {{ live ? 'استخراج حيّ' : 'محاكاة' }}
        </BaseChip>
        <BaseChip v-if="providerLabel" color="info">{{ providerLabel }}</BaseChip>
        <BaseChip color="accent">الثقة: {{ result.confidence }}%</BaseChip>
        <span class="text-xs text-muted" dir="ltr">{{ fileName }}</span>
      </div>

      <div v-if="result.headline" class="text-sm"><span class="text-muted">المسمّى: </span><span class="font-medium text-content">{{ result.headline }}</span></div>
      <p v-if="result.summary" class="text-sm text-muted">{{ result.summary }}</p>

      <div v-if="result.skills.length">
        <div class="mb-1 text-xs font-bold text-muted">المهارات ({{ result.skills.length }})</div>
        <div class="flex flex-wrap gap-1.5">
          <BaseChip v-for="s in result.skills" :key="s.name" color="brand">{{ s.name }} · {{ s.level }}/5</BaseChip>
        </div>
      </div>
      <div v-if="result.experiences.length" class="text-xs text-muted">الخبرات: {{ result.experiences.map(e => e.title).join('، ') }}</div>
      <div v-if="result.certificates.length" class="text-xs text-muted">الشهادات: {{ result.certificates.map(c => c.name).join('، ') }}</div>

      <div class="flex justify-end gap-2">
        <BaseButton variant="ghost" size="sm" @click="dismiss">تجاهل</BaseButton>
        <BaseButton variant="brand" size="sm" @click="apply">
          <BaseIcon name="mdi-check" :size="16" />تطبيق على ملفّي
        </BaseButton>
      </div>
    </div>
  </BaseCard>
</template>
