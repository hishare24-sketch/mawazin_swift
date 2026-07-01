<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { INTERVIEWER_TYPE_META, KIND_META, useInterviewersStore } from '@/stores/InterviewersStore'
import type { MarketInterviewKind } from '@/stores/InterviewersStore'
import { useProfileStore } from '@/stores/ProfileStore'

const route = useRoute()
const router = useRouter()
const store = useInterviewersStore()
const profile = useProfileStore()

const interviewer = computed(() => store.getById(Number(route.params.id)))
const candidate = computed(() => ({ field: 'تطوير الويب', skills: profile.skills.map(s => s.name) }))
const match = computed(() => (interviewer.value ? store.matchFor(candidate.value, interviewer.value.id) : 0))

const kinds = Object.keys(KIND_META) as MarketInterviewKind[]

// Booking dialog
const bookDialog = ref(false)
const chosenKind = ref<MarketInterviewKind>('level')
const chosenSlot = ref('')
const bookedSnackbar = ref(false)

const price = computed(() => {
  if (!interviewer.value)
    return 0
  // scale within the interviewer's range by interview kind weight
  const weight: Record<MarketInterviewKind, number> = { level: 0.2, behavioral: 0.4, skills: 0.6, leadership: 0.85, comprehensive: 1 }
  const { priceMin, priceMax } = interviewer.value
  return Math.round((priceMin + (priceMax - priceMin) * weight[chosenKind.value]) / 5) * 5
})

function confirmBooking() {
  if (interviewer.value)
    store.book(interviewer.value, chosenKind.value, chosenSlot.value || interviewer.value.availability[0], price.value)
  bookDialog.value = false
  bookedSnackbar.value = true
}
</script>

<template>
  <div v-if="interviewer">
    <VBtn variant="text" prepend-icon="mdi-arrow-right" class="mb-3" @click="router.back()">رجوع</VBtn>

    <VRow>
      <!-- Main -->
      <VCol cols="12" md="8">
        <VCard class="pa-5 mb-4">
          <div class="d-flex align-start ga-4 mb-3">
            <VAvatar :color="INTERVIEWER_TYPE_META[interviewer.type].color" size="72">
              <span class="text-h4 text-white font-weight-bold">{{ interviewer.initial }}</span>
            </VAvatar>
            <div class="flex-grow-1">
              <div class="d-flex align-center ga-2 flex-wrap">
                <h1 class="text-h5 font-weight-bold">{{ interviewer.name }}</h1>
                <VIcon v-if="interviewer.verified" icon="mdi-check-decagram" color="primary" />
              </div>
              <div class="text-body-2 text-medium-emphasis">{{ interviewer.title }}</div>
              <div class="d-flex align-center ga-3 mt-1">
                <span class="d-flex align-center text-body-2"><VIcon icon="mdi-star" color="warning" size="18" class="me-1" />{{ interviewer.rating }} ({{ interviewer.reviewsCount }} تقييم)</span>
                <span class="text-body-2 text-medium-emphasis">{{ interviewer.sessionsCount }} مقابلة</span>
              </div>
            </div>
          </div>

          <div class="d-flex flex-wrap ga-2 mb-4">
            <VChip :color="INTERVIEWER_TYPE_META[interviewer.type].color" variant="tonal" :prepend-icon="INTERVIEWER_TYPE_META[interviewer.type].icon">
              {{ INTERVIEWER_TYPE_META[interviewer.type].label }}
            </VChip>
            <VChip variant="tonal" prepend-icon="mdi-translate">{{ interviewer.languages.join(' · ') }}</VChip>
            <VChip variant="tonal" prepend-icon="mdi-calendar-check">{{ interviewer.availability.join(' · ') }}</VChip>
          </div>

          <VDivider class="mb-4" />
          <h3 class="text-subtitle-1 font-weight-bold mb-2">نبذة</h3>
          <p class="text-body-2 text-medium-emphasis mb-4">{{ interviewer.bio }}</p>

          <h3 class="text-subtitle-1 font-weight-bold mb-2">مجالات الخبرة</h3>
          <div class="d-flex flex-wrap ga-2">
            <VChip v-for="s in interviewer.specialties" :key="s" color="secondary" variant="tonal" size="small">{{ s }}</VChip>
          </div>
        </VCard>

        <!-- Interview kinds -->
        <VCard class="pa-5">
          <h3 class="text-subtitle-1 font-weight-bold mb-3">أنواع المقابلات المتاحة</h3>
          <VRow>
            <VCol v-for="k in kinds" :key="k" cols="12" sm="6">
              <VCard variant="outlined" class="pa-3 h-100">
                <div class="text-body-2 font-weight-bold mb-1">{{ KIND_META[k].label }}</div>
                <div class="text-caption text-medium-emphasis mb-2">{{ KIND_META[k].desc }} · {{ KIND_META[k].minutes }}</div>
                <VBtn size="x-small" color="accent" variant="tonal" @click="chosenKind = k; bookDialog = true">احجز هذا النوع</VBtn>
              </VCard>
            </VCol>
          </VRow>
        </VCard>
      </VCol>

      <!-- Sidebar -->
      <VCol cols="12" md="4">
        <VCard class="pa-5 mb-4">
          <div class="text-center mb-3">
            <VProgressCircular :model-value="match" :size="110" :width="10" color="success">
              <span class="text-h5 font-weight-bold">{{ match }}%</span>
            </VProgressCircular>
            <div class="text-body-2 text-medium-emphasis mt-2">نسبة توافقك مع المقيّم</div>
          </div>
          <div class="text-center text-h6 font-weight-bold mb-1">{{ interviewer.priceMin }}–{{ interviewer.priceMax }} ريال</div>
          <div class="text-center text-caption text-medium-emphasis mb-3">حسب نوع المقابلة</div>
          <VBtn color="accent" size="large" block prepend-icon="mdi-calendar-plus" @click="bookDialog = true">احجز مقابلة</VBtn>
          <VAlert type="info" variant="tonal" density="compact" class="mt-3 text-caption">
            <VIcon icon="mdi-shield-check-outline" size="16" class="me-1" />تقرير المقابلة يُضاف لملفك ويرفع نسبة ثقتك تلقائيًا.
          </VAlert>
        </VCard>
      </VCol>
    </VRow>

    <!-- Booking dialog -->
    <VDialog v-model="bookDialog" max-width="520">
      <VCard class="pa-2">
        <VCardTitle class="d-flex justify-space-between align-center">
          <span>حجز مقابلة مع {{ interviewer.name }}</span>
          <VBtn icon="mdi-close" variant="text" size="small" @click="bookDialog = false" />
        </VCardTitle>
        <VCardText>
          <VSelect
            v-model="chosenKind"
            :items="kinds.map(k => ({ value: k, title: KIND_META[k].label }))"
            label="نوع المقابلة"
            class="mb-3"
          />
          <VSelect
            v-model="chosenSlot"
            :items="interviewer.availability"
            label="اليوم المتاح"
            :placeholder="interviewer.availability[0]"
            class="mb-2"
          />
          <VAlert color="accent" variant="tonal" density="compact" class="text-body-2">
            <div class="d-flex justify-space-between align-center">
              <span>{{ KIND_META[chosenKind].label }} · {{ KIND_META[chosenKind].minutes }}</span>
              <span class="font-weight-bold">{{ price }} ريال</span>
            </div>
          </VAlert>
        </VCardText>
        <VCardActions class="justify-end">
          <VBtn variant="text" @click="bookDialog = false">إلغاء</VBtn>
          <VBtn color="accent" prepend-icon="mdi-check" @click="confirmBooking">تأكيد الحجز والدفع</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VSnackbar v-model="bookedSnackbar" color="success" timeout="4500">
      تم إرسال طلب الحجز للمقيّم — ستصلك تأكيد الموعد قريبًا.
      <template #actions>
        <VBtn variant="text" @click="router.push({ name: 'interviewers' })">حجوزاتي</VBtn>
      </template>
    </VSnackbar>
  </div>

  <VCard v-else class="pa-12 text-center">
    <VIcon icon="mdi-alert-circle-outline" size="64" color="error" />
    <div class="text-h6 mt-3">المقيّم غير موجود</div>
    <VBtn color="primary" class="mt-3" :to="{ name: 'interviewers' }">العودة للسوق</VBtn>
  </VCard>
</template>
