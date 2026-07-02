<script setup lang="ts">
import { ref } from 'vue'
import PageHeader from '@/components/shared/PageHeader.vue'
import StatCard from '@/components/shared/StatCard.vue'
import EmptyState from '@/components/shared/EmptyState.vue'
import { useExpertRolesStore } from '@/stores/ExpertRolesStore'
import type { TraineeReferral } from '@/stores/ExpertRolesStore'

// لوحة المدرب التقني — حلقة متكاملة: تقييم → تدريب → توظيف
const store = useExpertRolesStore()
const snackbar = ref('')

const courseDialog = ref(false)
const newCourse = ref({ title: '', skill: '', kind: 'ورشة عمل' as 'دورة مكثفة' | 'ورشة عمل', price: 200, seats: 15 })
function saveCourse() {
  if (!newCourse.value.title.trim())
    return
  store.addCourse({ ...newCourse.value, title: newCourse.value.title.trim() })
  courseDialog.value = false
  snackbar.value = 'أُنشئت الدورة وفُتح التسجيل'
}

const enrollDialog = ref(false)
const enrolling = ref<TraineeReferral | null>(null)
const chosenCourseId = ref<number | null>(null)
function openEnroll(t: TraineeReferral) {
  enrolling.value = t
  chosenCourseId.value = store.state.courses.find(c => c.status === 'open')?.id ?? null
  enrollDialog.value = true
}
function doEnroll() {
  if (enrolling.value && chosenCourseId.value !== null && store.enrollTrainee(enrolling.value.id, chosenCourseId.value))
    snackbar.value = `سُجّل ${enrolling.value.name} — الرسوم أُودعت محفظتك (معلقة حتى التسوية)`
  enrollDialog.value = false
}

const STATUS: Record<string, { label: string, color: string }> = {
  open: { label: 'التسجيل مفتوح', color: 'success' },
  running: { label: 'جارية', color: 'info' },
  done: { label: 'منتهية', color: 'surface-variant' },
}
</script>

<template>
  <div>
    <PageHeader title="لوحة المدرب التقني" subtitle="دورات وورش تعالج فجوات نتائج التقييم" icon="mdi-school-outline" />

    <VRow class="mb-2">
      <VCol cols="6" md="3"><StatCard title="دوراتي" :value="store.trainerStats.courses" icon="mdi-book-open-variant" color="primary" /></VCol>
      <VCol cols="6" md="3"><StatCard title="متدربون" :value="store.trainerStats.trainees" icon="mdi-account-group-outline" color="secondary" /></VCol>
      <VCol cols="6" md="3"><StatCard title="إيرادات الدورات" :value="`${store.trainerStats.revenue} ر.س`" icon="mdi-cash-multiple" color="success" /></VCol>
      <VCol cols="6" md="3"><StatCard title="إحالات جديدة" :value="store.trainerStats.newReferrals" icon="mdi-account-arrow-left-outline" color="accent" /></VCol>
    </VRow>

    <VRow>
      <!-- إحالات من نتائج التقييم -->
      <VCol cols="12" md="5">
        <VCard class="pa-5">
          <h2 class="text-subtitle-1 font-weight-bold mb-1">مرشحون بحاجة لتدريب</h2>
          <p class="text-caption text-medium-emphasis mb-3">إحالات آلية من نتائج مركز التقييم وتقارير المقيّمين — هذه ميزتك التنافسية.</p>
          <template v-if="store.state.trainees.filter(t => t.status === 'new').length">
            <VCard v-for="t in store.state.trainees.filter(x => x.status === 'new')" :key="t.id" variant="outlined" class="pa-3 mb-2">
              <div class="d-flex align-center ga-2 mb-1">
                <VAvatar color="accent" variant="tonal" size="34"><span class="font-weight-bold">{{ t.initial }}</span></VAvatar>
                <div class="flex-grow-1">
                  <div class="text-body-2 font-weight-bold">{{ t.name }}</div>
                  <div class="text-caption text-medium-emphasis">{{ t.source }}</div>
                </div>
              </div>
              <p class="text-caption mb-2"><VIcon icon="mdi-target" size="12" color="warning" /> {{ t.gap }}</p>
              <VBtn size="small" color="accent" block prepend-icon="mdi-school-outline" @click="openEnroll(t)">سجّله في دورة</VBtn>
            </VCard>
          </template>
          <EmptyState v-else icon="mdi-account-check-outline" title="لا إحالات جديدة" description="ستصلك إحالات تلقائية من نتائج التقييم" />
        </VCard>
      </VCol>

      <!-- دوراتي -->
      <VCol cols="12" md="7">
        <VCard class="pa-5">
          <div class="d-flex align-center justify-space-between mb-3">
            <h2 class="text-subtitle-1 font-weight-bold">دوراتي وورشي</h2>
            <VBtn size="small" color="accent" variant="tonal" prepend-icon="mdi-plus" @click="courseDialog = true">دورة جديدة</VBtn>
          </div>
          <VCard v-for="c in store.state.courses" :key="c.id" variant="outlined" class="pa-3 mb-2">
            <div class="d-flex align-center ga-2 flex-wrap mb-1">
              <span class="text-body-2 font-weight-bold flex-grow-1">{{ c.title }}</span>
              <VChip size="x-small" :color="STATUS[c.status].color" label>{{ STATUS[c.status].label }}</VChip>
            </div>
            <div class="text-caption text-medium-emphasis mb-2">{{ c.kind }} · {{ c.skill }} · {{ c.price }} ر.س</div>
            <div class="d-flex align-center ga-2">
              <VProgressLinear :model-value="(c.enrolled / c.seats) * 100" color="secondary" height="8" rounded class="flex-grow-1" />
              <span class="text-caption">{{ c.enrolled }}/{{ c.seats }} مقعدًا</span>
            </div>
          </VCard>
        </VCard>
      </VCol>
    </VRow>

    <!-- دورة جديدة -->
    <VDialog v-model="courseDialog" max-width="440">
      <VCard class="pa-2">
        <VCardTitle>دورة / ورشة جديدة</VCardTitle>
        <VCardText>
          <VTextField v-model="newCourse.title" label="العنوان" class="mb-3" />
          <VTextField v-model="newCourse.skill" label="المهارة المستهدفة" class="mb-3" />
          <VBtnToggle v-model="newCourse.kind" mandatory color="accent" variant="outlined" divided class="mb-3 w-100">
            <VBtn value="ورشة عمل" class="flex-grow-1">ورشة عمل</VBtn>
            <VBtn value="دورة مكثفة" class="flex-grow-1">دورة مكثفة</VBtn>
          </VBtnToggle>
          <div class="d-flex ga-2">
            <VTextField v-model.number="newCourse.price" type="number" label="السعر (ر.س)" />
            <VTextField v-model.number="newCourse.seats" type="number" label="المقاعد" />
          </div>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="courseDialog = false">إلغاء</VBtn>
          <VBtn color="accent" variant="flat" :disabled="!newCourse.title.trim()" @click="saveCourse">إنشاء</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- تسجيل متدرب -->
    <VDialog v-model="enrollDialog" max-width="420">
      <VCard class="pa-2">
        <VCardTitle>تسجيل {{ enrolling?.name }}</VCardTitle>
        <VCardText>
          <VSelect
            v-model="chosenCourseId"
            :items="store.state.courses.filter(c => c.status === 'open' && c.enrolled < c.seats).map(c => ({ value: c.id, title: `${c.title} (${c.price} ر.س)` }))"
            label="اختر الدورة"
          />
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="enrollDialog = false">إلغاء</VBtn>
          <VBtn color="accent" variant="flat" :disabled="chosenCourseId === null" @click="doEnroll">تسجيل</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VSnackbar :model-value="!!snackbar" color="success" location="top" timeout="3000" @update:model-value="snackbar = ''">
      {{ snackbar }}
    </VSnackbar>
  </div>
</template>
