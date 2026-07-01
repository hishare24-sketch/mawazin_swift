<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getCandidateById } from '../services/mockCandidates'

const route = useRoute()
const router = useRouter()
const candidate = computed(() => getCandidateById(Number(route.params.id)))

const matchBreakdown = [
  { label: 'المهارات', value: 90 },
  { label: 'الخبرات', value: 85 },
  { label: 'التعليم', value: 95 },
  { label: 'الموقع', value: 100 },
]

const endorsements = [
  { name: 'محمد العلي', relation: 'مدير سابق', type: 'فيديو', trusted: true },
  { name: 'لينا سعد', relation: 'زميلة', type: 'نص', trusted: false },
]
</script>

<template>
  <div v-if="candidate">
    <VBtn variant="text" prepend-icon="mdi-arrow-right" class="mb-3" @click="router.back()">
      رجوع للترشيحات
    </VBtn>

    <VRow>
      <VCol cols="12" md="8">
        <VCard class="pa-5 mb-4">
          <div class="d-flex align-center ga-4 mb-4">
            <VAvatar color="secondary" size="72">
              <span class="text-h4 text-white font-weight-bold">{{ candidate.name.charAt(0) }}</span>
            </VAvatar>
            <div>
              <h1 class="text-h5 font-weight-bold">{{ candidate.name }}</h1>
              <div class="text-body-1 text-medium-emphasis">{{ candidate.title }} · {{ candidate.location }}</div>
              <VChip size="x-small" label class="mt-1">{{ candidate.level }} · {{ candidate.experienceYears }} سنوات خبرة</VChip>
            </div>
          </div>
          <p class="text-body-2 text-medium-emphasis">{{ candidate.summary }}</p>

          <VDivider class="my-4" />
          <h3 class="text-subtitle-1 font-weight-bold mb-2">المهارات</h3>
          <div class="d-flex flex-wrap ga-2 mb-4">
            <VChip v-for="s in candidate.skills" :key="s" color="primary" variant="tonal" size="small">{{ s }}</VChip>
          </div>

          <h3 class="text-subtitle-1 font-weight-bold mb-2">التوصيات</h3>
          <VRow>
            <VCol v-for="e in endorsements" :key="e.name" cols="12" sm="6">
              <VCard variant="outlined" class="pa-3 d-flex align-center ga-3">
                <VAvatar color="secondary" variant="tonal"><VIcon icon="mdi-account" /></VAvatar>
                <div class="flex-grow-1">
                  <div class="text-body-2 font-weight-bold">
                    {{ e.name }}
                    <VIcon v-if="e.trusted" icon="mdi-check-decagram" color="success" size="16" />
                  </div>
                  <div class="text-caption text-medium-emphasis">{{ e.relation }}</div>
                </div>
                <VChip size="x-small" label>{{ e.type }}</VChip>
              </VCard>
            </VCol>
          </VRow>
        </VCard>
      </VCol>

      <VCol cols="12" md="4">
        <VCard class="pa-5 mb-4 text-center">
          <VProgressCircular :model-value="candidate.matchRate" :size="110" :width="10" color="success">
            <span class="text-h5 font-weight-bold">{{ candidate.matchRate }}%</span>
          </VProgressCircular>
          <div class="text-body-2 text-medium-emphasis mt-2 mb-4">تطابق مع: {{ candidate.appliedFor }}</div>

          <VBtn color="accent" block class="mb-2" prepend-icon="mdi-hand-heart-outline">إبداء رغبة</VBtn>
          <VBtn color="primary" variant="tonal" block class="mb-2" prepend-icon="mdi-calendar-clock-outline">جدولة مقابلة</VBtn>
          <VBtn color="secondary" variant="outlined" block class="mb-2" prepend-icon="mdi-message-outline" :to="{ name: 'messages' }">إرسال رسالة</VBtn>
          <VBtn color="error" variant="text" block prepend-icon="mdi-close">رفض الترشيح</VBtn>
        </VCard>

        <VCard class="pa-5">
          <div class="text-subtitle-1 font-weight-bold mb-3">تحليل التطابق</div>
          <div v-for="item in matchBreakdown" :key="item.label" class="mb-3">
            <div class="d-flex justify-space-between text-body-2 mb-1">
              <span>{{ item.label }}</span>
              <span class="font-weight-bold">{{ item.value }}%</span>
            </div>
            <VProgressLinear :model-value="item.value" color="primary" height="6" rounded />
          </div>
        </VCard>
      </VCol>
    </VRow>
  </div>

  <VCard v-else class="pa-12 text-center">
    <VIcon icon="mdi-account-alert-outline" size="64" color="error" />
    <div class="text-h6 mt-3">المرشح غير موجود</div>
    <VBtn color="primary" class="mt-3" :to="{ name: 'candidates' }">العودة للترشيحات</VBtn>
  </VCard>
</template>
