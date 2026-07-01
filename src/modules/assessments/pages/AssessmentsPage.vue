<script setup lang="ts">
import { useRouter } from 'vue-router'
import PageHeader from '@/components/shared/PageHeader.vue'
import { availableAssessments, completedAssessments } from '../services/mockAssessments'

const router = useRouter()

function startTest(id: number) {
  router.push({ name: 'assessment-take', params: { id } })
}

function viewResult(id: number, score: number, name: string) {
  router.push({ name: 'assessment-result', params: { id }, query: { score, name } })
}
</script>

<template>
  <div>
    <PageHeader
      title="مركز التقييم والاختبارات"
      subtitle="أثبت مهاراتك عبر اختبارات وألعاب ذكية"
      icon="mdi-clipboard-check-outline"
    />

    <h3 class="text-h6 font-weight-bold mb-3">الاختبارات المتاحة</h3>
    <VRow class="mb-4">
      <VCol v-for="test in availableAssessments" :key="test.id" cols="12" sm="6" lg="3">
        <VCard class="pa-4 text-center" height="100%">
          <VAvatar :color="test.color" variant="tonal" size="56" rounded="lg" class="mb-3">
            <VIcon :icon="test.icon" size="30" />
          </VAvatar>
          <div class="text-subtitle-2 font-weight-bold">{{ test.name }}</div>
          <VChip size="x-small" label class="my-2">{{ test.type }}</VChip>
          <div class="text-caption text-medium-emphasis mb-3">
            <VIcon icon="mdi-clock-outline" size="14" /> {{ test.duration }} ·
            {{ test.questionsCount }} أسئلة
          </div>
          <VBtn color="accent" size="small" block @click="startTest(test.id)">ابدأ الاختبار</VBtn>
        </VCard>
      </VCol>
    </VRow>

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
            <VListItemSubtitle>{{ test.date }} · المستوى: {{ test.level }}</VListItemSubtitle>
            <template #append>
              <VBtn variant="tonal" color="primary" size="small" @click="viewResult(test.id, test.score, test.name)">
                عرض التحليل
              </VBtn>
            </template>
          </VListItem>
          <VDivider v-if="i < completedAssessments.length - 1" />
        </template>
      </VList>
    </VCard>
  </div>
</template>
