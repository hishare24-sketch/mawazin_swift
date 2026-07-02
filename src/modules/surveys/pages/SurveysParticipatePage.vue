<script setup lang="ts">
import { useRouter } from 'vue-router'
import PageHeader from '@/components/shared/PageHeader.vue'
import EmptyState from '@/components/shared/EmptyState.vue'
import { QUESTION_TYPE_META, useSurveysStore } from '@/stores/SurveysStore'

// embedded: تُعرض داخل مركز الاستبيانات الموحّد بلا ترويسة مكررة
withDefaults(defineProps<{ embedded?: boolean }>(), { embedded: false })

const router = useRouter()
const store = useSurveysStore()

function participate(token: string) {
  router.push({ name: 'survey-answer', params: { token }, query: { src: 'in' } })
}
</script>

<template>
  <div>
    <PageHeader
      v-if="!embedded"
      title="استبيانات للمشاركة"
      subtitle="شارك برأيك في استبيانات الجهات داخل المنصة واكسب نقاطًا تحفيزية"
      icon="mdi-poll"
    />

    <VRow v-if="store.participatable.length">
      <VCol v-for="s in store.participatable" :key="s.id" cols="12" md="6" lg="4">
        <VCard class="pa-4 h-100 d-flex flex-column">
          <div class="d-flex align-center ga-3 mb-2">
            <VAvatar color="secondary" variant="tonal" rounded="lg">
              <VIcon icon="mdi-poll" />
            </VAvatar>
            <div class="flex-grow-1">
              <div class="text-subtitle-2 font-weight-bold">{{ s.title }}</div>
              <div class="text-caption text-medium-emphasis">{{ s.ownerName }} · {{ s.type }}</div>
            </div>
          </div>

          <div class="d-flex flex-wrap ga-1 mb-3">
            <VChip size="x-small" variant="tonal" label prepend-icon="mdi-help-circle-outline">
              {{ s.questions.length }} أسئلة
            </VChip>
            <VChip v-if="s.settings.rewardPoints > 0" size="x-small" color="accent" label prepend-icon="mdi-star-circle-outline">
              +{{ s.settings.rewardPoints }} نقطة
            </VChip>
            <VChip v-if="s.settings.anonymous" size="x-small" variant="tonal" color="info" label prepend-icon="mdi-incognito">
              مجهول الهوية
            </VChip>
          </div>

          <div class="d-flex flex-wrap ga-1 mb-3">
            <VChip v-for="t in [...new Set(s.questions.map(q => q.type))].slice(0, 4)" :key="t" size="x-small" variant="outlined" label>
              {{ QUESTION_TYPE_META[t].label }}
            </VChip>
          </div>

          <VSpacer />
          <VBtn
            v-if="!store.hasParticipated(s.id)"
            color="primary"
            block
            prepend-icon="mdi-play"
            @click="participate(s.token)"
          >
            شارك الآن
          </VBtn>
          <VBtn v-else color="success" variant="tonal" block prepend-icon="mdi-check-circle-outline" disabled>
            شاركت — شكرًا لك
          </VBtn>
        </VCard>
      </VCol>
    </VRow>

    <EmptyState
      v-else
      icon="mdi-poll"
      title="لا استبيانات متاحة حاليًا"
      description="ستظهر هنا استبيانات الجهات المنشورة داخل المنصة"
    />
  </div>
</template>
