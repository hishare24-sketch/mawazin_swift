<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/AuthStore'
import { useApplicationsStore } from '@/stores/ApplicationsStore'
import { useSavedStore } from '@/stores/SavedStore'
import { useWishesStore } from '@/stores/WishesStore'
import { useCandidatesStore } from '@/stores/CandidatesStore'
import { usePostedOpportunitiesStore } from '@/stores/PostedOpportunitiesStore'
import { useTrustStore } from '@/stores/TrustStore'
import { useProfileStore } from '@/stores/ProfileStore'
import StatCard from '@/components/shared/StatCard.vue'
import OpportunityCard from '@/modules/opportunities/components/OpportunityCard.vue'
import { mockOpportunities } from '@/modules/opportunities/services/mockOpportunities'
import { LEVEL_META } from '@/stores/InterviewsStore'
import { ai } from '@/services/ai'

const { t } = useI18n()
const authStore = useAuthStore()
const applicationsStore = useApplicationsStore()
const savedStore = useSavedStore()
const wishesStore = useWishesStore()
const candidatesStore = useCandidatesStore()
const postedStore = usePostedOpportunitiesStore()
const trustStore = useTrustStore()
const profileStore = useProfileStore()

const userName = computed(() => authStore.authUser?.name ?? '')
const isCompany = computed(() => authStore.role === 'company')

const recommended = computed(() => [...mockOpportunities].sort((a, b) => b.matchRate - a.matchRate).slice(0, 5))
const topCandidates = computed(() => [...candidatesStore.candidates].sort((a, b) => b.matchRate - a.matchRate).slice(0, 5))

// — Seeker AI widgets —
const trustDelta = 5 // simulated weekly change
const pendingProofs = computed(() => profileStore.pendingProofRequests)
const recommendedInterview = computed(() => ai.recommendInterview(profileStore.unverifiedSkills))
const proactiveNudges = computed(() =>
  ai.proactiveNudges({
    trust: trustStore.score,
    trustDelta,
    pendingProofs: pendingProofs.value.length,
    unverifiedSkills: profileStore.unverifiedSkills,
  }),
)

const seekerStats = computed(() => [
  { title: 'طلباتي النشطة', value: applicationsStore.count, icon: 'mdi-file-send-outline', color: 'primary' },
  { title: t('dashboard.incomingWishes'), value: wishesStore.pendingCount, icon: 'mdi-hand-heart-outline', color: 'accent' },
  { title: 'الفرص المحفوظة', value: savedStore.count, icon: 'mdi-bookmark-outline', color: 'secondary' },
  { title: t('dashboard.completedAssessments'), value: 4, icon: 'mdi-clipboard-check-outline', color: 'success' },
])

const companyStats = computed(() => [
  { title: 'الفرص المنشورة', value: postedStore.publishedCount, icon: 'mdi-briefcase-outline', color: 'primary' },
  { title: 'ترشيحات جديدة', value: candidatesStore.newCount, icon: 'mdi-account-group-outline', color: 'accent' },
  { title: 'إجمالي المرشحين', value: candidatesStore.candidates.length, icon: 'mdi-account-multiple-outline', color: 'secondary' },
  { title: 'مقابلات مجدولة', value: candidatesStore.interviewCount, icon: 'mdi-calendar-clock-outline', color: 'success' },
])

const stats = computed(() => (isCompany.value ? companyStats.value : seekerStats.value))

const wishes = computed(() => wishesStore.wishes.slice(0, 3))
const wishStatusMeta: Record<string, { label: string, color: string }> = {
  new: { label: 'جديد', color: 'accent' },
  pending: { label: 'قيد الانتظار', color: 'warning' },
  accepted: { label: 'مقبول', color: 'success' },
  rejected: { label: 'مرفوض', color: 'error' },
}

const activities = [
  { icon: 'mdi-send-check-outline', text: 'تقدمت لفرصة "مطوّر واجهات أمامية"', time: 'قبل ساعة' },
  { icon: 'mdi-file-account-outline', text: 'أنشأت سيرة ذاتية جديدة (قالب حديث)', time: 'أمس' },
  { icon: 'mdi-clipboard-check-outline', text: 'أكملت اختبار "أساسيات JavaScript"', time: 'قبل 3 أيام' },
  { icon: 'mdi-account-star-outline', text: 'استلمت توصية من أحمد المنصور', time: 'قبل 4 أيام' },
]

const aiSuggestions = [
  'حلّل فرصي الحالية',
  'كيف أحسّن ملفي؟',
  'أنشئ لي سيرة ذاتية',
  'ما المهارات المطلوبة في مجالي؟',
]
</script>

<template>
  <div>
    <!-- AI greeting banner -->
    <VCard class="brand-gradient mb-6 pa-5" theme="darkTheme">
      <div class="d-flex align-center ga-4">
        <VAvatar color="rgba(255,255,255,0.15)" size="56" rounded="lg">
          <VIcon icon="mdi-robot-happy-outline" size="30" color="white" />
        </VAvatar>
        <div class="text-white">
          <div class="text-h6 font-weight-bold">
            {{ t('dashboard.welcome', { name: userName }) }}
          </div>
          <div class="text-body-2 opacity-90">
            {{ t('dashboard.aiGreeting', { opportunities: 3, wishes: 6, endorsements: 2 }) }}
          </div>
        </div>
      </div>
    </VCard>

    <!-- Proactive AI nudges (seeker) -->
    <div v-if="!isCompany && proactiveNudges.length" class="mb-4 d-flex flex-column ga-2">
      <VAlert
        v-for="(n, i) in proactiveNudges"
        :key="i"
        :type="n.tone"
        variant="tonal"
        density="compact"
        border="start"
      >
        <div class="d-flex align-center justify-space-between flex-wrap ga-2">
          <div class="d-flex align-center ga-2">
            <VIcon :icon="n.icon" size="20" />
            <span class="text-body-2">{{ n.text }}</span>
          </div>
          <VBtn v-if="n.action" size="x-small" variant="flat" :color="n.tone === 'warning' ? 'warning' : 'accent'" :to="{ name: n.action }">
            {{ n.actionLabel }}
          </VBtn>
        </div>
      </VAlert>
    </div>

    <!-- Stat cards -->
    <VRow class="mb-2">
      <VCol v-for="stat in stats" :key="stat.title" cols="12" sm="6" lg="3">
        <StatCard v-bind="stat" />
      </VCol>
    </VRow>

    <VRow>
      <!-- Main column -->
      <VCol cols="12" lg="8">
        <div class="d-flex align-center justify-space-between mb-3 mt-2">
          <h2 class="text-h6 font-weight-bold">
            {{ isCompany ? 'أحدث الترشيحات' : t('dashboard.recommendedOpportunities') }}
          </h2>
          <VBtn variant="text" color="secondary" :to="{ name: isCompany ? 'candidates' : 'opportunities' }" size="small">
            {{ t('dashboard.viewAll') }}
          </VBtn>
        </div>

        <!-- Company: latest candidates -->
        <VCard v-if="isCompany">
          <VList lines="two">
            <template v-for="(c, i) in topCandidates" :key="c.id">
              <VListItem @click="$router.push({ name: 'candidate-profile', params: { id: c.id } })">
                <template #prepend>
                  <VAvatar color="secondary"><span class="text-white font-weight-bold">{{ c.name.charAt(0) }}</span></VAvatar>
                </template>
                <VListItemTitle class="font-weight-bold">{{ c.name }}</VListItemTitle>
                <VListItemSubtitle>{{ c.title }} · تطابق {{ c.matchRate }}%</VListItemSubtitle>
                <template #append>
                  <VChip color="success" size="small" label>{{ c.matchRate }}%</VChip>
                </template>
              </VListItem>
              <VDivider v-if="i < topCandidates.length - 1" />
            </template>
          </VList>
        </VCard>

        <!-- Seeker: recommended opportunities -->
        <VRow v-else>
          <VCol v-for="opp in recommended" :key="opp.id" cols="12" md="6">
            <OpportunityCard :opportunity="opp" />
          </VCol>
        </VRow>

        <!-- Incoming wishes -->
        <h2 class="text-h6 font-weight-bold mb-3 mt-5">
          {{ isCompany ? 'الرغبات المرسلة' : t('dashboard.latestWishes') }}
        </h2>
        <VCard>
          <VList lines="two">
            <template v-for="(wish, i) in wishes" :key="i">
              <VListItem>
                <template #prepend>
                  <VAvatar color="secondary" variant="tonal" rounded="lg">
                    <VIcon icon="mdi-hand-heart-outline" />
                  </VAvatar>
                </template>
                <VListItemTitle class="font-weight-bold">
                  {{ wish.company }}
                </VListItemTitle>
                <VListItemSubtitle>
                  {{ wish.amount }} · {{ wish.duration }}
                </VListItemSubtitle>
                <template #append>
                  <VChip :color="wishStatusMeta[wish.status].color" size="small" label>
                    {{ wishStatusMeta[wish.status].label }}
                  </VChip>
                </template>
              </VListItem>
              <VDivider v-if="i < wishes.length - 1" />
            </template>
          </VList>
        </VCard>
      </VCol>

      <!-- Side column -->
      <VCol cols="12" lg="4">
        <!-- Trust summary (seeker) -->
        <VCard v-if="!isCompany" class="pa-4 mt-2 mb-4">
          <div class="d-flex align-center ga-4">
            <VProgressCircular :model-value="trustStore.score" :size="72" :width="8" :color="trustStore.level.color">
              <span class="text-subtitle-1 font-weight-bold">{{ trustStore.score }}</span>
            </VProgressCircular>
            <div class="flex-grow-1">
              <div class="d-flex align-center ga-2">
                <span class="text-subtitle-2 font-weight-bold">نسبة الثقة</span>
                <VChip :color="trustStore.level.color" size="x-small" label>{{ trustStore.level.label }}</VChip>
              </div>
              <div class="text-caption text-success d-flex align-center ga-1">
                <VIcon icon="mdi-trending-up" size="16" /> ارتفعت {{ trustDelta }}% هذا الأسبوع
              </div>
              <VBtn variant="text" color="primary" size="x-small" class="mt-1 px-0" :to="{ name: 'profile' }">عرض التفاصيل</VBtn>
            </div>
          </div>
        </VCard>

        <!-- Recommended interview (seeker) -->
        <VCard v-if="!isCompany && recommendedInterview" class="pa-4 mb-4" variant="tonal" color="accent">
          <div class="d-flex align-center ga-2 mb-2">
            <VIcon icon="mdi-account-tie-voice-outline" />
            <span class="text-subtitle-2 font-weight-bold">مقابلة موصى بها</span>
            <VChip size="x-small" color="success" label class="ms-auto">+{{ recommendedInterview.trustGain }}% ثقة</VChip>
          </div>
          <p class="text-body-2 mb-3">{{ recommendedInterview.reason }}</p>
          <VBtn color="accent" size="small" block prepend-icon="mdi-play" :to="{ name: 'interviews' }">
            ابدأ مقابلة {{ LEVEL_META[recommendedInterview.level].label }}
          </VBtn>
        </VCard>

        <!-- Pending proof requests (seeker) -->
        <VCard v-if="!isCompany && pendingProofs.length" class="pa-4 mb-4">
          <div class="d-flex align-center ga-2 mb-3">
            <VIcon icon="mdi-account-star-outline" color="secondary" />
            <span class="text-subtitle-1 font-weight-bold">إثباتات معلّقة ({{ pendingProofs.length }})</span>
          </div>
          <div v-for="req in pendingProofs" :key="req.id" class="d-flex align-center ga-2 mb-2">
            <VAvatar color="secondary" variant="tonal" size="36"><VIcon icon="mdi-account" /></VAvatar>
            <div class="flex-grow-1">
              <div class="text-body-2 font-weight-bold">{{ req.from }}</div>
              <div class="text-caption text-medium-emphasis">يطلب إثبات «{{ req.skill }}» · {{ req.date }}</div>
            </div>
            <VBtn icon="mdi-check" size="x-small" color="success" variant="tonal" @click="profileStore.resolveProofRequest(req.id, true)" />
            <VBtn icon="mdi-close" size="x-small" color="error" variant="text" @click="profileStore.resolveProofRequest(req.id, false)" />
          </div>
        </VCard>

        <!-- AI assistant mini -->
        <VCard class="pa-4 mt-2 mb-4">
          <div class="d-flex align-center ga-2 mb-3">
            <VIcon icon="mdi-robot-happy-outline" color="secondary" />
            <span class="text-subtitle-1 font-weight-bold">{{ t('nav.assistant') }}</span>
          </div>
          <div class="d-flex flex-column ga-2">
            <VBtn
              v-for="(s, i) in aiSuggestions"
              :key="i"
              variant="tonal"
              color="primary"
              size="small"
              class="justify-start text-none"
              prepend-icon="mdi-message-text-outline"
              :to="{ name: 'assistant' }"
            >
              {{ s }}
            </VBtn>
          </div>
        </VCard>

        <!-- Recent activity -->
        <VCard class="pa-4">
          <div class="text-subtitle-1 font-weight-bold mb-2">
            {{ t('dashboard.recentActivity') }}
          </div>
          <VTimeline side="end" density="compact" truncate-line="both" class="mt-2">
            <VTimelineItem
              v-for="(act, i) in activities"
              :key="i"
              :dot-color="'primary'"
              size="x-small"
            >
              <div class="d-flex align-center ga-2">
                <VIcon :icon="act.icon" size="18" color="primary" />
                <div>
                  <div class="text-body-2">
                    {{ act.text }}
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    {{ act.time }}
                  </div>
                </div>
              </div>
            </VTimelineItem>
          </VTimeline>
        </VCard>
      </VCol>
    </VRow>
  </div>
</template>
