<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHeader from '@/components/shared/PageHeader.vue'
import SurveysPage from './SurveysPage.vue'
import SurveysParticipatePage from './SurveysParticipatePage.vue'
import { useSurveysStore } from '@/stores/SurveysStore'

// ===== مركز الاستبيانات الموحّد — الإنشاء والإدارة والمشاركة من مكان واحد =====
const store = useSurveysStore()
const tab = ref<'manage' | 'participate'>('manage')

const participateCount = computed(() =>
  store.participatable.filter(s => !store.hasParticipated(s.id)).length,
)
</script>

<template>
  <div>
    <PageHeader
      title="الاستبيانات"
      subtitle="أنشئ وأدر استبياناتك وشارك في استبيانات الآخرين — كل ذلك من مكان واحد"
      icon="mdi-poll"
    />

    <VTabs v-model="tab" color="primary" class="mb-4">
      <VTab value="manage" prepend-icon="mdi-pencil-ruler">
        إنشاء وإدارة ({{ store.mySurveys.length }})
      </VTab>
      <VTab value="participate" prepend-icon="mdi-comment-quote-outline">
        للمشاركة
        <VBadge v-if="participateCount" color="accent" :content="participateCount" inline class="ms-1" />
      </VTab>
    </VTabs>

    <VWindow v-model="tab">
      <VWindowItem value="manage">
        <SurveysPage embedded />
      </VWindowItem>
      <VWindowItem value="participate">
        <SurveysParticipatePage embedded />
      </VWindowItem>
    </VWindow>
  </div>
</template>
