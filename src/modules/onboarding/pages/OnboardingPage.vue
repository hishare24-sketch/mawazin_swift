<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const steps = [
  { icon: 'mdi-account-edit-outline', title: 'أضف معلوماتك الأساسية', desc: 'أكمل ملفك الشخصي بصورة ونبذة تعريفية لتبرز أمام الجهات.' },
  { icon: 'mdi-star-plus-outline', title: 'أضف مهاراتك وخبراتك', desc: 'سجّل مهاراتك وخبراتك العملية لنرشّح لك الفرص الأنسب.' },
  { icon: 'mdi-account-star-outline', title: 'اطلب توصيات (اختياري)', desc: 'توصيات موثّقة من زملائك ترفع مصداقية ملفك.' },
  { icon: 'mdi-tune', title: 'اختر رغباتك المهنية', desc: 'حدّد نوع الوظائف والمجالات والمناطق المفضّلة لديك.' },
  { icon: 'mdi-file-account-outline', title: 'أنشئ سيرتك الذاتية الأولى', desc: 'استخدم المنشئ الذكي لإنشاء سيرة احترافية في دقائق.' },
  { icon: 'mdi-briefcase-search-outline', title: 'ابدأ باستكشاف الفرص', desc: 'تصفّح الفرص الموصى بها وتقدّم بنقرة واحدة.' },
]

const step = ref(0)
const isLast = computed(() => step.value === steps.length - 1)

function next() {
  if (isLast.value)
    finish()
  else step.value++
}
function skip() {
  finish()
}
function finish() {
  localStorage.setItem('onboardingDone', '1')
  router.push({ name: 'dashboard' })
}
</script>

<template>
  <VContainer class="fill-height" style="min-height: 100vh">
    <VRow justify="center" class="w-100">
      <VCol cols="12" sm="9" md="6" lg="5">
        <VCard class="pa-8 text-center">
          <div class="d-flex justify-center ga-1 mb-6">
            <div
              v-for="(_, i) in steps"
              :key="i"
              class="rounded-pill"
              :style="{ height: '6px', width: i === step ? '28px' : '10px', background: i <= step ? 'rgb(var(--v-theme-accent))' : 'rgb(var(--v-theme-surface-variant))', transition: 'all .3s' }"
            />
          </div>

          <VAvatar color="primary" variant="tonal" size="88" rounded="xl" class="mb-5">
            <VIcon :icon="steps[step].icon" size="46" />
          </VAvatar>

          <h1 class="text-h5 font-weight-bold mb-2">{{ steps[step].title }}</h1>
          <p class="text-body-1 text-medium-emphasis mb-8">{{ steps[step].desc }}</p>

          <VBtn color="accent" size="large" block :append-icon="isLast ? 'mdi-check' : 'mdi-arrow-left'" @click="next">
            {{ isLast ? 'ابدأ الآن' : 'التالي' }}
          </VBtn>
          <VBtn variant="text" class="mt-2" @click="skip">تخطّي</VBtn>

          <div class="text-caption text-medium-emphasis mt-4">
            الخطوة {{ step + 1 }} من {{ steps.length }}
          </div>
        </VCard>
      </VCol>
    </VRow>
  </VContainer>
</template>
