<script setup lang="ts">
import { useRouter } from 'vue-router'
import PageHeader from '@/components/shared/PageHeader.vue'
import EmptyState from '@/components/shared/EmptyState.vue'
import { QUESTION_TYPE_META, useSurveysStore } from '@/stores/SurveysStore'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseAvatar from '@/components/ui/BaseAvatar.vue'

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

    <div v-if="store.participatable.length" class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      <BaseCard v-for="s in store.participatable" :key="s.id" class="flex h-full flex-col">
        <div class="mb-2 flex items-center gap-3">
          <BaseAvatar color="emerald" tonal square>
            <BaseIcon name="mdi-poll" :size="20" />
          </BaseAvatar>
          <div class="min-w-0 flex-1">
            <div class="text-sm font-bold text-content">{{ s.title }}</div>
            <div class="truncate text-xs text-muted">{{ s.ownerName }} · {{ s.type }}</div>
          </div>
        </div>

        <div class="mb-3 flex flex-wrap gap-1">
          <BaseChip color="neutral"><BaseIcon name="mdi-help-circle-outline" :size="12" />{{ s.questions.length }} أسئلة</BaseChip>
          <BaseChip v-if="s.settings.rewardPoints > 0" color="accent"><BaseIcon name="mdi-star-circle-outline" :size="12" />+{{ s.settings.rewardPoints }} نقطة</BaseChip>
          <BaseChip v-if="s.settings.anonymous" color="info"><BaseIcon name="mdi-incognito" :size="12" />مجهول الهوية</BaseChip>
        </div>

        <div class="mb-3 flex flex-wrap gap-1">
          <span v-for="t in [...new Set(s.questions.map(q => q.type))].slice(0, 4)" :key="t" class="rounded-full border border-ui px-2 py-0.5 text-[10px] text-muted">
            {{ QUESTION_TYPE_META[t].label }}
          </span>
        </div>

        <BaseButton
          v-if="!store.hasParticipated(s.id)"
          variant="brand"
          block
          class="mt-auto"
          @click="participate(s.token)"
        >
          <BaseIcon name="mdi-play" :size="16" />شارك الآن
        </BaseButton>
        <BaseButton v-else variant="tonal-emerald" block class="mt-auto" disabled>
          <BaseIcon name="mdi-check-circle-outline" :size="16" />شاركت — شكرًا لك
        </BaseButton>
      </BaseCard>
    </div>

    <EmptyState
      v-else
      icon="mdi-poll"
      title="لا استبيانات متاحة حاليًا"
      description="ستظهر هنا استبيانات الجهات المنشورة داخل المنصة"
    />
  </div>
</template>
