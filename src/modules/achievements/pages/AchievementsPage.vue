<script setup lang="ts">
import { computed } from 'vue'
import PageHeader from '@/components/shared/PageHeader.vue'
import GamificationCard from '@/components/shared/GamificationCard.vue'
import { useGamificationStore } from '@/stores/GamificationStore'
import { useProfileStore } from '@/stores/ProfileStore'
import { useResumesStore } from '@/stores/ResumesStore'
import { useInterviewsStore } from '@/stores/InterviewsStore'
import { usePeerRequestsStore } from '@/stores/PeerRequestsStore'

const g = useGamificationStore()
const profile = useProfileStore()
const resumes = useResumesStore()
const interviews = useInterviewsStore()
const peer = usePeerRequestsStore()

// Leaderboard — peers have fixed totals, so earning points genuinely climbs
// the user past them (real progression, not a moving target).
const PEERS = [
  { name: 'ليان الحربي', initial: 'ل', points: 460 },
  { name: 'محمد القرني', initial: 'م', points: 330 },
  { name: 'سارة الزهراني', initial: 'س', points: 165 },
  { name: 'عبدالله المالكي', initial: 'ع', points: 90 },
  { name: 'نورة المطيري', initial: 'ن', points: 40 },
]
const leaderboard = computed(() => {
  const rows = [
    { name: 'أنت', initial: 'أ', points: g.points, you: true },
    ...PEERS.map(p => ({ name: p.name, initial: p.initial, points: p.points, you: false })),
  ]
  return rows.sort((a, b) => b.points - a.points).map((r, i) => ({ ...r, rank: i + 1 }))
})
const myRank = computed(() => leaderboard.value.find(r => r.you)?.rank ?? 0)

// First-week onboarding goals — completion derived from real app state
const goals = computed(() => [
  { key: 'profile', label: 'أكمل معلومات ملفك (العنوان والنبذة)', done: !!profile.headline && !!profile.summary, to: 'profile', icon: 'mdi-account-edit-outline' },
  { key: 'skills', label: 'أضف 3 مهارات على الأقل', done: profile.skills.length >= 3, to: 'profile', icon: 'mdi-star-plus-outline' },
  { key: 'resume', label: 'أنشئ سيرتك الذاتية', done: resumes.count > 0, to: 'resume-builder', icon: 'mdi-file-account-outline' },
  { key: 'interview', label: 'أجرِ أول مقابلة لتحديد مستواك', done: interviews.completed.length > 0, to: 'interviews', icon: 'mdi-account-tie-voice-outline' },
  { key: 'peer', label: 'اطلب توصية أو تقييمًا من زميل', done: peer.outgoing.length > 0, to: 'peer-requests', icon: 'mdi-swap-horizontal-circle-outline' },
])
const goalsDone = computed(() => goals.value.filter(g => g.done).length)
const onboardingPct = computed(() => Math.round((goalsDone.value / goals.value.length) * 100))
</script>

<template>
  <div>
    <PageHeader
      title="إنجازاتي"
      subtitle="تابع نقاطك ومستواك وشاراتك، وتسلّق لوحة الصدارة"
      icon="mdi-trophy-outline"
    />

    <VRow>
      <VCol cols="12" md="7">
        <GamificationCard :show-link="false" />

        <!-- Onboarding checklist -->
        <VCard class="pa-4 mt-4">
          <div class="d-flex align-center ga-2 mb-1">
            <VIcon icon="mdi-rocket-launch-outline" color="primary" />
            <h3 class="text-subtitle-1 font-weight-bold">رحلة البداية</h3>
            <VSpacer />
            <span class="text-caption font-weight-bold text-primary">{{ goalsDone }}/{{ goals.length }}</span>
          </div>
          <VProgressLinear :model-value="onboardingPct" color="primary" height="8" rounded class="mb-3" />
          <VList class="py-0">
            <VListItem
              v-for="goal in goals"
              :key="goal.key"
              :to="goal.done ? undefined : { name: goal.to }"
              class="px-2"
              :class="{ 'goal-done': goal.done }"
            >
              <template #prepend>
                <VAvatar :color="goal.done ? 'success' : 'surface-variant'" size="34" variant="tonal">
                  <VIcon :icon="goal.done ? 'mdi-check' : goal.icon" size="18" />
                </VAvatar>
              </template>
              <VListItemTitle :class="goal.done ? 'text-decoration-line-through text-medium-emphasis' : 'font-weight-medium'">
                {{ goal.label }}
              </VListItemTitle>
              <template #append>
                <VIcon v-if="!goal.done" icon="mdi-arrow-left" color="medium-emphasis" size="18" />
                <VChip v-else size="x-small" color="success" label>تم</VChip>
              </template>
            </VListItem>
          </VList>
        </VCard>
      </VCol>

      <!-- Leaderboard -->
      <VCol cols="12" md="5">
        <VCard class="pa-4">
          <div class="d-flex align-center ga-2 mb-1">
            <VIcon icon="mdi-podium" color="warning" />
            <h3 class="text-subtitle-1 font-weight-bold">لوحة الصدارة</h3>
          </div>
          <p class="text-caption text-medium-emphasis mb-3">ترتيبك الحالي: <span class="font-weight-bold text-warning">#{{ myRank }}</span> — اكسب نقاطًا لتتقدّم!</p>
          <VList class="py-0">
            <VListItem
              v-for="row in leaderboard"
              :key="row.name"
              class="px-2 rounded-lg mb-1"
              :class="{ 'leader-you': row.you }"
            >
              <template #prepend>
                <div class="leader-rank text-center me-2" :class="`rank-${row.rank}`">{{ row.rank }}</div>
                <VAvatar :color="row.you ? 'primary' : 'secondary'" size="34">
                  <span class="text-white font-weight-bold">{{ row.initial }}</span>
                </VAvatar>
              </template>
              <VListItemTitle :class="row.you ? 'font-weight-bold' : ''">
                {{ row.name }}
                <VIcon v-if="row.rank === 1" icon="mdi-crown" color="warning" size="16" />
              </VListItemTitle>
              <template #append>
                <span class="text-body-2 font-weight-bold">{{ row.points }}</span>
              </template>
            </VListItem>
          </VList>
        </VCard>
      </VCol>
    </VRow>
  </div>
</template>

<style scoped>
.leader-you {
  background: rgba(var(--v-theme-primary), 0.1);
}
.leader-rank {
  min-width: 22px;
  font-weight: 800;
  color: rgb(var(--v-theme-medium-emphasis));
}
.rank-1 {
  color: #f59e0b;
}
.rank-2 {
  color: #9ca3af;
}
.rank-3 {
  color: #cd7f32;
}
.goal-done {
  opacity: 0.85;
}
</style>
