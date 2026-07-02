<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/shared/PageHeader.vue'
import type { UserRole } from '@/interfaces/Auth'
import { useAuthStore } from '@/stores/AuthStore'
import { useExpertRolesStore } from '@/stores/ExpertRolesStore'
import { useGamificationStore } from '@/stores/GamificationStore'
import { useInterviewersStore } from '@/stores/InterviewersStore'
import { usePostedOpportunitiesStore } from '@/stores/PostedOpportunitiesStore'
import { usePublicProfileStore } from '@/stores/PublicProfileStore'
import { useSurveysStore } from '@/stores/SurveysStore'
import { useTrustStore } from '@/stores/TrustStore'
import { useUnifiedHubStore } from '@/stores/UnifiedHubStore'
import { useWalletStore } from '@/stores/WalletStore'

// ===== التحليلات الموحّدة — كل مؤشراتك عبر الأدوار في جدول واحد قابل للفلترة والفرز =====
const { t } = useI18n()
const auth = useAuthStore()
const hub = useUnifiedHubStore()
const wallet = useWalletStore()
const gamification = useGamificationStore()
const pub = usePublicProfileStore()
const surveys = useSurveysStore()
const trust = useTrustStore()
const interviewersStore = useInterviewersStore()
const expertStore = useExpertRolesStore()
const postedStore = usePostedOpportunitiesStore()

type Domain = 'مالية' | 'تفاعل' | 'أداء' | 'استبيانات' | 'سمعة'
interface MetricRow {
  domain: Domain
  role: UserRole | 'all'
  label: string
  value: number
  unit: string
  icon: string
  color: string
}

const DOMAIN_META: Record<Domain, { icon: string, color: string }> = {
  'مالية': { icon: 'mdi-cash-multiple', color: 'success' },
  'تفاعل': { icon: 'mdi-account-heart-outline', color: 'accent' },
  'أداء': { icon: 'mdi-chart-line', color: 'primary' },
  'استبيانات': { icon: 'mdi-poll', color: 'secondary' },
  'سمعة': { icon: 'mdi-shield-star-outline', color: 'warning' },
}

/** كل الصفوف تُشتق حيًّا من المخازن — الحساب أولًا ثم صفوف كل دور يملكه المستخدم */
const allRows = computed<MetricRow[]>(() => {
  const rows: MetricRow[] = [
    { domain: 'مالية', role: 'all', label: 'رصيد المحفظة المتاح', value: wallet.available, unit: '﷼', icon: 'mdi-wallet-outline', color: 'success' },
    { domain: 'مالية', role: 'all', label: 'أرباح معلقة قيد التسوية', value: wallet.pending, unit: '﷼', icon: 'mdi-cash-clock', color: 'warning' },
    { domain: 'مالية', role: 'all', label: 'أرباحي عبر الأدوار', value: hub.kpis.earnings, unit: '﷼', icon: 'mdi-cash-multiple', color: 'success' },
    { domain: 'مالية', role: 'all', label: 'قيمة معلقة بانتظار قراراتي', value: hub.kpis.pendingMoney, unit: '﷼', icon: 'mdi-gesture-tap-button', color: 'error' },
    { domain: 'سمعة', role: 'all', label: 'نقاط التحفيز', value: gamification.points, unit: 'نقطة', icon: 'mdi-star-circle-outline', color: 'warning' },
    { domain: 'تفاعل', role: 'all', label: 'مشاهدات صفحتي التعريفية', value: pub.state.views, unit: '', icon: 'mdi-eye-outline', color: 'primary' },
    { domain: 'تفاعل', role: 'all', label: 'متابعو صفحتي', value: pub.state.followersCount, unit: '', icon: 'mdi-account-group-outline', color: 'accent' },
    { domain: 'تفاعل', role: 'all', label: 'رسائل التواصل من صفحتي', value: pub.state.contacts, unit: '', icon: 'mdi-message-arrow-left-outline', color: 'info' },
    { domain: 'أداء', role: 'all', label: 'عناصر تنتظر قراري في المركز', value: hub.kpis.actionCount, unit: '', icon: 'mdi-inbox-full-outline', color: 'error' },
  ]

  // استبياناتي (لأي دور يملك استبيانات)
  const myResponses = surveys.mySurveys.reduce((sum, s) => sum + surveys.statsFor(s.id).responses, 0)
  const rewardsSpent = surveys.mySurveys.reduce((sum, s) => sum + s.rewardsSpent, 0)
  rows.push(
    { domain: 'استبيانات', role: 'all', label: 'استبياناتي المنشأة', value: surveys.mySurveys.length, unit: '', icon: 'mdi-poll', color: 'secondary' },
    { domain: 'استبيانات', role: 'all', label: 'استجابات على استبياناتي', value: myResponses, unit: '', icon: 'mdi-comment-check-outline', color: 'secondary' },
    { domain: 'استبيانات', role: 'all', label: 'نقاط صُرفت من مجمعات الحوافز', value: rewardsSpent, unit: 'نقطة', icon: 'mdi-gift-outline', color: 'warning' },
  )

  if (auth.ownsRole('seeker'))
    rows.push({ domain: 'سمعة', role: 'seeker', label: 'نسبة الثقة (كباحث)', value: trust.score, unit: '%', icon: 'mdi-shield-check-outline', color: 'primary' })
  if (auth.ownsRole('interviewer')) {
    const s = interviewersStore.interviewerStats
    rows.push(
      { domain: 'أداء', role: 'interviewer', label: 'جلسات تقييم منفّذة', value: s.sessions, unit: '', icon: 'mdi-account-tie-voice-outline', color: 'primary' },
      { domain: 'مالية', role: 'interviewer', label: 'أرباح المقيّم', value: s.earnings, unit: '﷼', icon: 'mdi-cash-plus', color: 'success' },
      { domain: 'سمعة', role: 'interviewer', label: 'متوسط تقييمي كمقيّم (من 5)', value: s.avgRating, unit: '★', icon: 'mdi-star-outline', color: 'warning' },
    )
  }
  if (auth.ownsRole('company')) {
    rows.push({ domain: 'أداء', role: 'company', label: 'فرص منشورة', value: postedStore.publishedCount, unit: '', icon: 'mdi-briefcase-plus-outline', color: 'info' })
  }
  if (auth.ownsRole('coach')) {
    const s = expertStore.coachStats
    rows.push(
      { domain: 'مالية', role: 'coach', label: 'اشتراكات الإرشاد الشهرية', value: s.monthlyRecurring, unit: '﷼', icon: 'mdi-compass-outline', color: 'success' },
      { domain: 'أداء', role: 'coach', label: 'عملاء الإرشاد', value: s.clients, unit: '', icon: 'mdi-account-multiple-outline', color: 'primary' },
    )
  }
  if (auth.ownsRole('trainer')) {
    const s = expertStore.trainerStats
    rows.push(
      { domain: 'مالية', role: 'trainer', label: 'إيراد التدريب', value: s.revenue, unit: '﷼', icon: 'mdi-school-outline', color: 'success' },
      { domain: 'أداء', role: 'trainer', label: 'متدربون مسجّلون', value: s.trainees, unit: '', icon: 'mdi-account-school-outline', color: 'primary' },
    )
  }
  if (auth.ownsRole('consultant')) {
    const s = expertStore.consultantStats
    rows.push({ domain: 'أداء', role: 'consultant', label: 'استشارات منجزة', value: s.done, unit: '', icon: 'mdi-lightbulb-on-outline', color: 'primary' })
  }
  return rows
})

// —— الفلترة والفرز ——
const roleFilter = ref<(UserRole | 'all')[]>([])
const domainFilter = ref<Domain[]>([])
const sortBy = ref<'value-desc' | 'value-asc' | 'domain'>('value-desc')
const query = ref('')

const roleOptions = computed(() => {
  const owned = [...new Set(allRows.value.map(r => r.role))]
  return owned.map(r => ({ value: r, title: r === 'all' ? 'الحساب (مشترك)' : t(`roles.${r}`) }))
})

const visibleRows = computed(() => {
  let rows = allRows.value
    .filter(r => !roleFilter.value.length || roleFilter.value.includes(r.role))
    .filter(r => !domainFilter.value.length || domainFilter.value.includes(r.domain))
    .filter(r => !query.value.trim() || r.label.includes(query.value.trim()))
  if (sortBy.value === 'value-desc')
    rows = [...rows].sort((a, b) => b.value - a.value)
  else if (sortBy.value === 'value-asc')
    rows = [...rows].sort((a, b) => a.value - b.value)
  else
    rows = [...rows].sort((a, b) => a.domain.localeCompare(b.domain, 'ar'))
  return rows
})

const domainSummary = computed(() =>
  (Object.keys(DOMAIN_META) as Domain[]).map(d => ({
    domain: d,
    ...DOMAIN_META[d],
    count: allRows.value.filter(r => r.domain === d).length,
  })),
)
</script>

<template>
  <div>
    <PageHeader
      title="التحليلات الموحّدة"
      subtitle="كل مؤشراتك — المال والتفاعل والأداء والسمعة — عبر كل أدوارك في شاشة واحدة"
      icon="mdi-chart-multiple"
    >
      <template #actions>
        <VBtn v-if="auth.ownsRole('interviewer')" variant="text" size="small" color="primary" prepend-icon="mdi-chart-box-outline" :to="{ name: 'interviewer-analytics' }">تحليلات المقيّم التفصيلية</VBtn>
        <VBtn v-if="auth.ownsRole('company')" variant="text" size="small" color="primary" prepend-icon="mdi-chart-box-outline" :to="{ name: 'analytics' }">تحليلات الشركة التفصيلية</VBtn>
      </template>
    </PageHeader>

    <!-- فلاتر المجالات -->
    <div class="d-flex flex-wrap ga-2 mb-4">
      <VChip
        v-for="d in domainSummary"
        :key="d.domain"
        :color="domainFilter.includes(d.domain) ? d.color : undefined"
        :variant="domainFilter.includes(d.domain) ? 'flat' : 'outlined'"
        label
        :prepend-icon="d.icon"
        @click="domainFilter = domainFilter.includes(d.domain) ? domainFilter.filter(x => x !== d.domain) : [...domainFilter, d.domain]"
      >
        {{ d.domain }} ({{ d.count }})
      </VChip>
    </div>

    <!-- شريط التحكم -->
    <VRow dense class="mb-3">
      <VCol cols="12" sm="4">
        <VTextField v-model="query" placeholder="بحث في المؤشرات..." prepend-inner-icon="mdi-magnify" density="compact" hide-details clearable />
      </VCol>
      <VCol cols="12" sm="5">
        <VSelect v-model="roleFilter" :items="roleOptions" label="الأدوار" multiple chips closable-chips clearable density="compact" hide-details />
      </VCol>
      <VCol cols="12" sm="3">
        <VSelect
          v-model="sortBy"
          :items="[
            { value: 'value-desc', title: 'القيمة: من الأعلى' },
            { value: 'value-asc', title: 'القيمة: من الأدنى' },
            { value: 'domain', title: 'حسب المجال' },
          ]"
          label="فرز"
          density="compact"
          hide-details
        />
      </VCol>
    </VRow>

    <!-- شبكة المؤشرات -->
    <VRow>
      <VCol v-for="r in visibleRows" :key="`${r.role}-${r.label}`" cols="12" sm="6" lg="4">
        <VCard class="pa-4 d-flex align-center ga-3">
          <VAvatar :color="r.color" variant="tonal" rounded="lg" size="44">
            <VIcon :icon="r.icon" size="22" />
          </VAvatar>
          <div class="flex-grow-1">
            <div class="text-h6 font-weight-bold">{{ r.value }}<span v-if="r.unit" class="text-body-2 text-medium-emphasis"> {{ r.unit }}</span></div>
            <div class="text-caption text-medium-emphasis">{{ r.label }}</div>
          </div>
          <div class="d-flex flex-column ga-1 align-end">
            <VChip size="x-small" variant="tonal" :color="DOMAIN_META[r.domain].color" label>{{ r.domain }}</VChip>
            <VChip size="x-small" variant="outlined" label>{{ r.role === 'all' ? 'الحساب' : t(`roles.${r.role}`) }}</VChip>
          </div>
        </VCard>
      </VCol>
    </VRow>

    <VCard v-if="!visibleRows.length" class="pa-10 text-center">
      <VIcon icon="mdi-chart-line-variant" size="48" color="medium-emphasis" />
      <p class="text-body-2 text-medium-emphasis mt-2 mb-0">لا مؤشرات مطابقة — وسّع الفلاتر.</p>
    </VCard>
  </div>
</template>
