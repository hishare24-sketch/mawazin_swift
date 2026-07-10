<script setup lang="ts">
// بطاقة مقيّم في سوق المقيّمين — مكوّن مستقلّ (بدل حيلة <template v-for="iv in [item]">).
// نسبة التطابق تُمرَّر من الصفحة (تعتمد سياق المستخدم)؛ يصدر select عند التفعيل.
import { useI18n } from 'vue-i18n'
import type { Interviewer } from '@/stores/InterviewersStore'
import { INTERVIEWER_TIER_META, INTERVIEWER_TYPE_META, interviewerTier } from '@/stores/InterviewersStore'
import MatchBadge from '@/components/shared/MatchBadge.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseAvatar from '@/components/ui/BaseAvatar.vue'
import { mapVuetifyColor as mapColor } from '@/utils/vuetifyColor'

defineProps<{ interviewer: Interviewer, match: number }>()
const emit = defineEmits<{ select: [interviewer: Interviewer] }>()
const { t } = useI18n()

</script>

<template>
  <BaseCard
    hover class="flex cursor-pointer flex-col" role="button" tabindex="0"
    @click="emit('select', interviewer)"
    @keydown.enter="emit('select', interviewer)"
    @keydown.space.prevent="emit('select', interviewer)"
  >
    <div class="mb-2 flex items-start gap-3">
      <BaseAvatar :color="mapColor(INTERVIEWER_TYPE_META[interviewer.type].color)" :size="52">
        <span class="text-lg font-bold">{{ interviewer.initial }}</span>
      </BaseAvatar>
      <div class="flex-1">
        <div class="flex items-center gap-1">
          <span class="font-bold text-content">{{ interviewer.name }}</span>
          <BaseIcon v-if="interviewer.verified" name="mdi-check-decagram" :size="16" style="color: rgb(var(--v-theme-primary))" />
        </div>
        <div class="text-xs text-muted">{{ interviewer.title }}</div>
      </div>
      <MatchBadge :value="match" variant="chip" />
    </div>

    <div class="mb-2 flex flex-wrap items-center gap-2">
      <BaseChip :color="mapColor(INTERVIEWER_TYPE_META[interviewer.type].color)">
        <BaseIcon :name="INTERVIEWER_TYPE_META[interviewer.type].icon" :size="12" /> {{ INTERVIEWER_TYPE_META[interviewer.type].label }}
      </BaseChip>
      <BaseChip :color="mapColor(INTERVIEWER_TIER_META[interviewerTier(interviewer)].color)">
        <BaseIcon :name="INTERVIEWER_TIER_META[interviewerTier(interviewer)].icon" :size="12" /> {{ INTERVIEWER_TIER_META[interviewerTier(interviewer)].label }}
      </BaseChip>
      <div class="flex items-center gap-1 text-xs text-muted">
        <BaseIcon name="mdi-star" :size="14" style="color: rgb(var(--v-theme-warning))" />{{ interviewer.rating }} ({{ interviewer.reviewsCount }})
      </div>
    </div>

    <div class="mb-3 flex flex-1 flex-wrap gap-1">
      <BaseChip v-for="s in interviewer.specialties.slice(0, 3)" :key="s" color="neutral">{{ s }}</BaseChip>
    </div>

    <div class="flex items-center justify-between">
      <span class="text-xs text-muted">{{ t('discovery.interviewers.sessions', { count: interviewer.sessionsCount }) }}</span>
      <span class="font-bold text-content">{{ interviewer.priceMin }}–{{ interviewer.priceMax }} {{ t('common.currency') }}</span>
    </div>
  </BaseCard>
</template>
