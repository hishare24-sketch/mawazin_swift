<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHeader from '@/components/shared/PageHeader.vue'
import SurveysPage from './SurveysPage.vue'
import SurveysParticipatePage from './SurveysParticipatePage.vue'
import { useSurveysStore } from '@/stores/SurveysStore'
import BaseIcon from '@/components/ui/BaseIcon.vue'

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

    <div class="mb-4 flex flex-wrap gap-1">
      <button type="button" class="nav-tab flex-none" :class="{ 'is-active': tab === 'manage' }" @click="tab = 'manage'">
        <BaseIcon name="mdi-pencil-ruler" :size="18" />إنشاء وإدارة ({{ store.mySurveys.length }})
      </button>
      <button type="button" class="nav-tab flex-none" :class="{ 'is-active': tab === 'participate' }" @click="tab = 'participate'">
        <BaseIcon name="mdi-comment-quote-outline" :size="18" />للمشاركة
        <span v-if="participateCount" class="ms-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold" style="background: rgb(var(--v-theme-accent)); color: rgb(var(--v-theme-on-accent))">{{ participateCount }}</span>
      </button>
    </div>

    <SurveysPage v-if="tab === 'manage'" embedded />
    <SurveysParticipatePage v-else embedded />
  </div>
</template>
