<script setup lang="ts">
import { computed } from 'vue'
import { useGamificationStore } from '@/stores/GamificationStore'

const g = useGamificationStore()
const earnedBadges = computed(() => g.badges.filter(b => b.earned))
const lockedBadges = computed(() => g.badges.filter(b => !b.earned))
</script>

<template>
  <VCard class="pa-4">
    <div class="d-flex align-center ga-2 mb-3">
      <VIcon icon="mdi-trophy-outline" color="warning" />
      <h3 class="text-subtitle-1 font-weight-bold">إنجازاتي</h3>
      <VSpacer />
      <VChip size="small" label :style="{ backgroundColor: g.tier.color, color: '#fff' }">
        <VIcon icon="mdi-shield-star-outline" size="14" start /> {{ g.tier.name }}
      </VChip>
    </div>

    <!-- Points + tier progress -->
    <div class="d-flex align-center ga-4 mb-3">
      <div class="text-center flex-shrink-0">
        <div class="text-h4 font-weight-bold text-warning lh-1">{{ g.points }}</div>
        <div class="text-caption text-medium-emphasis">نقطة</div>
      </div>
      <div class="flex-grow-1">
        <div class="d-flex justify-space-between text-caption mb-1">
          <span class="text-medium-emphasis">التقدّم للمستوى التالي</span>
          <span v-if="g.nextTier" class="font-weight-bold">{{ g.pointsToNext }} نقطة لـ{{ g.nextTier.name }}</span>
          <span v-else class="font-weight-bold text-success">أعلى مستوى!</span>
        </div>
        <VProgressLinear :model-value="g.tierProgress" color="warning" height="8" rounded />
      </div>
      <div class="text-center flex-shrink-0">
        <div class="d-flex align-center ga-1">
          <VIcon icon="mdi-fire" color="error" />
          <span class="text-h6 font-weight-bold">{{ g.streak.count }}</span>
        </div>
        <div class="text-caption text-medium-emphasis">يوم متتابع</div>
      </div>
    </div>

    <VDivider class="mb-3" />

    <!-- Active challenges -->
    <div class="d-flex align-center justify-space-between mb-2">
      <span class="text-caption font-weight-bold"><VIcon icon="mdi-target" size="14" /> تحديات نشطة</span>
      <span class="text-caption text-medium-emphasis">{{ g.earnedCount }}/{{ g.badges.length }} شارة</span>
    </div>
    <div v-for="c in g.activeChallenges" :key="c.id" class="mb-2">
      <div class="d-flex justify-space-between text-caption mb-1">
        <span>{{ c.title }}</span>
        <span class="font-weight-bold">{{ c.progress }}/{{ c.target }} · +{{ c.reward }}</span>
      </div>
      <VProgressLinear :model-value="(c.progress / c.target) * 100" color="accent" height="6" rounded />
    </div>
    <div v-if="!g.activeChallenges.length" class="text-caption text-medium-emphasis text-center py-2">
      <VIcon icon="mdi-check-decagram" color="success" size="16" /> أنجزت كل التحديات الحالية!
    </div>

    <VDivider class="my-3" />

    <!-- Badges -->
    <div class="text-caption font-weight-bold mb-2"><VIcon icon="mdi-medal-outline" size="14" /> الشارات</div>
    <div class="d-flex flex-wrap ga-2">
      <VTooltip v-for="b in earnedBadges" :key="b.id" :text="b.desc" location="top">
        <template #activator="{ props }">
          <VChip v-bind="props" size="small" color="warning" variant="tonal" :prepend-icon="b.icon" label>{{ b.name }}</VChip>
        </template>
      </VTooltip>
      <VTooltip v-for="b in lockedBadges" :key="b.id" :text="`مقفلة: ${b.desc}`" location="top">
        <template #activator="{ props }">
          <VChip v-bind="props" size="small" variant="outlined" :prepend-icon="b.icon" label class="badge-locked">{{ b.name }}</VChip>
        </template>
      </VTooltip>
    </div>
  </VCard>
</template>

<style scoped>
.lh-1 {
  line-height: 1.1;
}
.badge-locked {
  opacity: 0.45;
}
</style>
