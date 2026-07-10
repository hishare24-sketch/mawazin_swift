<script setup lang="ts">
// بطاقة خبير في سوق الخبراء — مكوّن مستقلّ (بدل حيلة <template v-for="e in [item]">).
// يصدر request عند طلب الخدمة؛ الصفحة تفتح نافذة الطلب.
import { useI18n } from 'vue-i18n'
import type { MarketExpert, MarketExpertRole } from '@/stores/ExpertRolesStore'
import { EXPERT_TIER_META, MARKET_ROLE_META, expertTier } from '@/stores/ExpertRolesStore'
import { EXPERT_SPECIALTY_META } from '@/services/personas'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseAvatar from '@/components/ui/BaseAvatar.vue'
import { type BaseColor, mapVuetifyColor as tierColor } from '@/utils/vuetifyColor'

const props = defineProps<{ expert: MarketExpert }>()
const emit = defineEmits<{ request: [expert: MarketExpert] }>()
const { t } = useI18n()

function roleColor(role: MarketExpertRole): BaseColor {
  return ({ coach: 'brand', trainer: 'info', consultant: 'warning' } as Record<MarketExpertRole, BaseColor>)[role]
}
const tier = () => EXPERT_TIER_META[expertTier(props.expert.clients)]
</script>

<template>
  <BaseCard class="flex h-full flex-col">
    <div class="mb-2 flex items-center gap-3">
      <BaseAvatar :color="roleColor(expert.role)" :size="48" tonal>{{ expert.initial }}</BaseAvatar>
      <div class="flex-1">
        <div class="flex items-center gap-1">
          <span class="font-bold">{{ expert.name }}</span>
          <BaseIcon v-if="expert.verified" name="mdi-check-decagram" :size="16" style="color: rgb(var(--v-theme-primary))" />
        </div>
        <div class="text-xs text-muted">{{ expert.title }}</div>
      </div>
    </div>

    <div class="mb-2 flex flex-wrap gap-1">
      <BaseChip :color="roleColor(expert.role)"><BaseIcon :name="EXPERT_SPECIALTY_META[expert.specialtyKey].icon" :size="14" /> {{ EXPERT_SPECIALTY_META[expert.specialtyKey].label }}</BaseChip>
      <BaseChip :color="tierColor(tier().color)"><BaseIcon :name="tier().icon" :size="14" /> {{ tier().label }}</BaseChip>
    </div>

    <div class="mb-3 text-sm">{{ expert.specialty }}</div>

    <div class="mb-3 mt-auto flex items-center gap-3 text-xs text-muted">
      <span class="flex items-center gap-1"><BaseIcon name="mdi-star" :size="14" style="color: rgb(var(--v-theme-warning))" /> {{ expert.rating }}</span>
      <span class="flex items-center gap-1"><BaseIcon name="mdi-account-group-outline" :size="14" /> {{ t('discovery.experts.clients', { count: expert.clients }) }}</span>
      <span class="ms-auto font-bold" style="color: rgb(var(--v-theme-primary))">{{ t('discovery.experts.priceFrom', { price: expert.priceFrom, unit: expert.priceUnit }) }}</span>
    </div>

    <div class="flex gap-2">
      <BaseButton variant="outline" size="sm" :to="{ name: 'expert-profile', params: { slug: expert.slug } }">{{ t('discovery.experts.profile') }}</BaseButton>
      <BaseButton :variant="expert.role === 'consultant' ? 'accent' : expert.role === 'trainer' ? 'emerald' : 'brand'" size="sm" class="flex-1" @click="emit('request', expert)">
        <BaseIcon name="mdi-send" :size="16" /> {{ t('discovery.experts.request', { service: MARKET_ROLE_META[expert.role].service }) }}
      </BaseButton>
    </div>
  </BaseCard>
</template>
