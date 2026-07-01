<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/shared/PageHeader.vue'
import {
  QUESTION_TYPE_META,
  TEST_SIZES,
  availableAssessments,
  challenges,
  completedAssessments,
  leaderboard,
  myPoints,
} from '../services/mockAssessments'

const router = useRouter()

// Size picker dialog
const sizeDialog = ref(false)
const pendingId = ref<number | null>(null)
function startTest(id: number) {
  pendingId.value = id
  sizeDialog.value = true
}
function confirmStart(size: number) {
  if (pendingId.value != null)
    router.push({ name: 'assessment-take', params: { id: pendingId.value }, query: { size } })
  sizeDialog.value = false
}

function viewResult(id: number, score: number, name: string) {
  router.push({ name: 'assessment-result', params: { id }, query: { score, name } })
}

const allTypes = Object.values(QUESTION_TYPE_META)
</script>

<template>
  <div>
    <PageHeader
      title="مركز التقييم والاختبارات"
      subtitle="اختبارات وألعاب ذكية بـ 10 أنماط أسئلة — تُولّد فريدة لكل محاولة"
      icon="mdi-clipboard-check-outline"
    >
      <template #actions>
        <VChip color="accent" size="large" label prepend-icon="mdi-star-four-points">{{ myPoints.toLocaleString('en-US') }} نقطة</VChip>
      </template>
    </PageHeader>

    <!-- Question-type variety -->
    <VCard variant="tonal" color="secondary" class="pa-3 mb-5">
      <div class="d-flex align-center flex-wrap ga-1">
        <VIcon icon="mdi-shape-outline" class="me-1" />
        <span class="text-caption font-weight-bold me-2">10 أنماط أسئلة:</span>
        <VChip v-for="t in allTypes" :key="t.label" size="x-small" variant="flat" color="surface" label :prepend-icon="t.icon">{{ t.label }}</VChip>
      </div>
    </VCard>

    <VRow>
      <VCol cols="12" lg="8">
        <h3 class="text-h6 font-weight-bold mb-3">الاختبارات المتاحة</h3>
        <VRow class="mb-2">
          <VCol v-for="test in availableAssessments" :key="test.id" cols="12" sm="6">
            <VCard class="pa-4 h-100 d-flex flex-column">
              <div class="d-flex align-center ga-3 mb-2">
                <VAvatar :color="test.color" variant="tonal" size="48" rounded="lg">
                  <VIcon :icon="test.icon" size="26" />
                </VAvatar>
                <div>
                  <div class="text-subtitle-2 font-weight-bold">{{ test.name }}</div>
                  <VChip size="x-small" label class="mt-1">{{ test.type }}</VChip>
                </div>
              </div>
              <div class="text-caption text-medium-emphasis mb-3 flex-grow-1">
                <VIcon icon="mdi-shape-outline" size="14" /> أنماط متعددة · حجم مرن (سريع/متوسط/شامل)
              </div>
              <VBtn color="accent" size="small" block prepend-icon="mdi-play" @click="startTest(test.id)">ابدأ الاختبار</VBtn>
            </VCard>
          </VCol>
        </VRow>

        <!-- Challenges -->
        <h3 class="text-h6 font-weight-bold mb-3 mt-5">التحديات</h3>
        <VRow>
          <VCol v-for="c in challenges" :key="c.id" cols="12" sm="6">
            <VCard class="pa-4">
              <div class="d-flex align-center ga-3 mb-2">
                <VAvatar :color="c.cadence === 'daily' ? 'primary' : 'accent'" variant="tonal" rounded="lg">
                  <VIcon :icon="c.icon" />
                </VAvatar>
                <div class="flex-grow-1">
                  <div class="text-body-2 font-weight-bold">{{ c.title }}</div>
                  <div class="text-caption text-medium-emphasis">{{ c.cadence === 'daily' ? 'تحدٍّ يومي' : 'تحدٍّ أسبوعي' }}</div>
                </div>
                <VChip color="success" size="small" label prepend-icon="mdi-star-four-points">+{{ c.reward }}</VChip>
              </div>
              <VProgressLinear :model-value="c.progress" :color="c.cadence === 'daily' ? 'primary' : 'accent'" height="6" rounded />
            </VCard>
          </VCol>
        </VRow>
      </VCol>

      <!-- Leaderboard -->
      <VCol cols="12" lg="4">
        <h3 class="text-h6 font-weight-bold mb-3">لوحة المتصدّرين</h3>
        <VCard class="pa-2 mb-5">
          <VList class="py-0">
            <VListItem
              v-for="row in leaderboard"
              :key="row.rank"
              :class="row.you ? 'bg-secondary-lighten' : ''"
            >
              <template #prepend>
                <VAvatar :color="row.rank <= 3 ? ['amber', 'blue-grey', 'brown'][row.rank - 1] : 'surface-variant'" size="34" class="me-1">
                  <span class="font-weight-bold text-caption">{{ row.rank }}</span>
                </VAvatar>
              </template>
              <VListItemTitle class="font-weight-bold" :class="{ 'text-secondary': row.you }">{{ row.name }}</VListItemTitle>
              <template #append>
                <span class="text-body-2 font-weight-bold">{{ row.points.toLocaleString('en-US') }}</span>
              </template>
            </VListItem>
          </VList>
        </VCard>

        <h3 class="text-h6 font-weight-bold mb-3">الاختبارات المنجزة</h3>
        <VCard>
          <VList lines="two">
            <template v-for="(test, i) in completedAssessments" :key="test.id">
              <VListItem>
                <template #prepend>
                  <VAvatar :color="test.score >= 85 ? 'success' : 'warning'" variant="tonal" rounded="lg">
                    <span class="font-weight-bold">{{ test.score }}</span>
                  </VAvatar>
                </template>
                <VListItemTitle class="font-weight-bold">{{ test.name }}</VListItemTitle>
                <VListItemSubtitle>{{ test.date }} · {{ test.level }}</VListItemSubtitle>
                <template #append>
                  <VBtn variant="tonal" color="primary" size="x-small" @click="viewResult(test.id, test.score, test.name)">التحليل</VBtn>
                </template>
              </VListItem>
              <VDivider v-if="i < completedAssessments.length - 1" />
            </template>
          </VList>
        </VCard>
      </VCol>
    </VRow>

    <!-- Test-size picker -->
    <VDialog v-model="sizeDialog" max-width="480">
      <VCard class="pa-2">
        <VCardTitle>اختر حجم الاختبار</VCardTitle>
        <VCardText>
          <VCard
            v-for="s in TEST_SIZES"
            :key="s.value"
            variant="outlined"
            class="pa-3 mb-2 cursor-pointer d-flex align-center ga-3"
            @click="confirmStart(s.value)"
          >
            <VAvatar color="accent" variant="tonal" rounded="lg"><VIcon icon="mdi-format-list-numbered" /></VAvatar>
            <div class="flex-grow-1">
              <div class="text-body-2 font-weight-bold">{{ s.label }} — {{ s.value }} سؤال</div>
              <div class="text-caption text-medium-emphasis">زمن تقديري ~{{ s.minutes }} دقيقة</div>
            </div>
            <VIcon icon="mdi-arrow-left-circle" color="accent" />
          </VCard>
        </VCardText>
      </VCard>
    </VDialog>
  </div>
</template>

<style scoped>
.bg-secondary-lighten {
  background: rgba(var(--v-theme-secondary), 0.1);
  border-radius: var(--ui-radius);
}
</style>
