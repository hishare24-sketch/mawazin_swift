<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/AuthStore'
import { usePersonaStore } from '@/stores/PersonaStore'
import { ORG_TYPES, ORG_TYPE_META, SEEKER_PERSONA_META } from '@/services/personas'
import { PROOF_META, skillConfidence, skillLevelLabel, useProfileStore } from '@/stores/ProfileStore'
import type { ProofType, Skill } from '@/stores/ProfileStore'
import { useResumesStore } from '@/stores/ResumesStore'
import { useTrustStore } from '@/stores/TrustStore'
import { ai } from '@/services/ai'
import CvImport from '@/modules/profile/components/CvImport.vue'
import TrustScoreCard from '@/components/shared/TrustScoreCard.vue'
import ReviewsPanel from '@/components/shared/ReviewsPanel.vue'
import { useReviewsStore } from '@/stores/ReviewsStore'
import { ALL_SKILLS, TAXONOMY, categorizeSkill, getCategory } from '@/services/taxonomy'
import { LEVEL_META, TYPE_META, useInterviewsStore } from '@/stores/InterviewsStore'
import { KIND_META, useInterviewersStore } from '@/stores/InterviewersStore'
import type { Booking } from '@/stores/InterviewersStore'
import { COMPANY_SIZES } from '@/interfaces/RoleProfiles'
import { OPPORTUNITY_TYPES, getSector } from '@/services/sectors'
import { useSectorContext } from '@/composables/useSectorContext'
import { useRoleProfilesStore } from '@/stores/RoleProfilesStore'
import type { UserRole } from '@/interfaces/Auth'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseAvatar from '@/components/ui/BaseAvatar.vue'
import BaseProgressBar from '@/components/ui/BaseProgressBar.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseSwitch from '@/components/ui/BaseSwitch.vue'
import BaseTagInput from '@/components/ui/BaseTagInput.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseSnackbar from '@/components/ui/BaseSnackbar.vue'
import BaseRating from '@/components/ui/BaseRating.vue'
import BaseDropdown from '@/components/ui/BaseDropdown.vue'

const { t } = useI18n()
const interviewsStore = useInterviewsStore()
const interviewersStore = useInterviewersStore()
const trust = useTrustStore()
const reviewsStore = useReviewsStore()
const reviewsCount = computed(() => reviewsStore.countFor('toCandidate', 'me'))

// —— تلوين مربوط بثيم Vuetify (بديل ألوان Vuetify) ——
type BaseColor = 'brand' | 'emerald' | 'accent' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
function mapColor(c?: string): BaseColor {
  return (({ primary: 'brand', secondary: 'emerald', 'medium-emphasis': 'neutral', 'surface-variant': 'neutral', grey: 'neutral', amber: 'warning' } as Record<string, BaseColor>)[c ?? ''] ?? c ?? 'brand') as BaseColor
}
// لون CSS من رمز ثيم (أو hex مباشر) — للأيقونات والنصوص
function colorVar(c?: string): string {
  if (!c)
    return 'rgb(var(--v-theme-on-surface))'
  if (c.startsWith('#'))
    return c
  if (c === 'medium-emphasis')
    return 'rgba(var(--v-theme-on-surface), 0.6)'
  const alias: Record<string, string> = { amber: 'warning' }
  return `rgb(var(--v-theme-${alias[c] ?? c}))`
}

// Certified-interviewer reports + digital certificate
const certifiedReports = computed(() => interviewersStore.completedReports)
const certificateDialog = ref(false)
const certificateReport = ref<Booking | null>(null)
function openCertificate(b: Booking) {
  certificateReport.value = b
  certificateDialog.value = true
}

const authStore = useAuthStore()
const profile = useProfileStore()
const resumesStore = useResumesStore()
const user = computed(() => authStore.authUser)
const tab = ref('skills')
const SEEKER_TABS = [
  { value: 'skills', label: 'المهارات', icon: 'mdi-star-outline' },
  { value: 'experience', label: 'الخبرات', icon: 'mdi-briefcase-outline' },
  { value: 'certificates', label: 'الشهادات', icon: 'mdi-certificate-outline' },
  { value: 'endorsements', label: 'التوصيات', icon: 'mdi-account-star-outline' },
  { value: 'resumes', label: 'السير الذاتية', icon: 'mdi-file-account-outline' },
  { value: 'interviews', label: 'المقابلات', icon: 'mdi-account-tie-voice-outline' },
  { value: 'reviews', label: 'التقييمات', icon: 'mdi-star-outline' },
  { value: 'prefs', label: 'التفضيلات', icon: 'mdi-tune' },
  { value: 'privacy', label: 'الخصوصية', icon: 'mdi-shield-lock-outline' },
]

// ===== Multi-role profile tabs (doc §3.4) =====
const roleProfiles = useRoleProfilesStore()
// أدوار لها ملف مخصص في هذه الصفحة (الأدوار الجديدة تدار من لوحاتها)
const PROFILE_TAB_ROLES: UserRole[] = ['seeker', 'interviewer', 'company']
const ownedProRoles = computed<UserRole[]>(() => PROFILE_TAB_ROLES.filter(r => authStore.ownsRole(r)))
// Open on the tab of the currently active role
const roleTab = ref<UserRole>(
  PROFILE_TAB_ROLES.includes(authStore.role as UserRole) ? authStore.role as UserRole : 'seeker',
)
const ROLE_TAB_META: Record<string, { icon: string, label: string }> = {
  seeker: { icon: 'mdi-account-search-outline', label: 'واجهة الباحث' },
  interviewer: { icon: 'mdi-star-check-outline', label: 'واجهة المقيّم' },
  company: { icon: 'mdi-office-building-outline', label: 'واجهة جهة التوظيف' },
}

// Seeker preferences (seeker_profiles columns)
const AVAILABILITY_OPTIONS = [
  { value: 'immediate', title: 'جاهز فورًا' },
  { value: 'within_month', title: 'خلال شهر' },
  { value: 'within_three_months', title: 'خلال 3 أشهر' },
  { value: 'not_available', title: 'غير متاح حاليًا' },
]
// أنواع العمل المفضّلة من المصدر المعتمد الموحّد (services/sectors.ts) — تُخزَّن بالمعرّف
const EMPLOYMENT_TYPES = OPPORTUNITY_TYPES.map(o => ({ value: o.id, title: o.label }))
function toggleEmploymentType(id: string) {
  const set = new Set(profile.prefs.preferred_employment_types)
  set.has(id) ? set.delete(id) : set.add(id)
  profile.prefs.preferred_employment_types = [...set]
}
const VISIBILITY_OPTIONS = [
  { value: 'public', title: 'عام' },
  { value: 'private', title: 'خاص' },
]
const COMPANY_SIZE_OPTIONS = COMPANY_SIZES.map(s => ({ value: s, title: s }))

// نغمة صلبة (نشط) أو حدّ خافت (غير نشط) للرقائق-كأزرار
function toggleStyle(active: boolean, color: string) {
  if (active) {
    return { background: `rgb(var(--v-theme-${color}))`, color: `rgb(var(--v-theme-on-${color}))`, borderColor: 'transparent' }
  }
  return { background: 'transparent', color: 'rgba(var(--v-theme-on-surface), 0.75)', borderColor: 'rgba(var(--v-theme-on-surface), 0.2)' }
}

// Add-skill dialog
const skillDialog = ref(false)
const newSkillName = ref('')
const newSkillLevel = ref(3)
const newSkillCategory = ref<string | undefined>(undefined)
const categoryOptions = TAXONOMY.map(c => ({ value: c.id, title: c.label }))
const categorySkillSuggestions = computed(() => getCategory(newSkillCategory.value)?.skills ?? ALL_SKILLS)
function saveSkill() {
  profile.addSkill(newSkillName.value, newSkillLevel.value, newSkillCategory.value)
  newSkillName.value = ''
  newSkillLevel.value = 3
  newSkillCategory.value = undefined
  skillDialog.value = false
}

// Group skills by taxonomy category (falling back to name-based classification)
const skillGroups = computed(() => {
  const map = new Map<string, Skill[]>()
  for (const s of profile.skills) {
    const catId = s.category ?? categorizeSkill(s.name) ?? 'other'
    if (!map.has(catId))
      map.set(catId, [])
    map.get(catId)!.push(s)
  }
  return [...map.entries()].map(([catId, list]) => ({ category: getCategory(catId), skills: list }))
})

// Skill helpers
function confidenceColor(v: number) {
  if (v >= 70)
    return 'success'
  if (v >= 40)
    return 'warning'
  return 'error'
}
function levelOf(skill: Skill) {
  return skillLevelLabel(skill)
}

// AI comparison insight across verified skills
const skillInsight = computed(() =>
  ai.skillInsight(profile.skills.map(s => ({ name: s.name, confidence: skillConfidence(s) }))),
)
// AI narrative rationale for the skill open in the detail dialog
const skillRationale = computed(() => {
  if (!detailSkill.value)
    return ''
  return ai.skillRationale(
    detailSkill.value.name,
    detailSkill.value.proofs.map(p => ({ type: p.type, weight: PROOF_META[p.type].weight })),
    skillConfidence(detailSkill.value),
  )
})

// Add-proof dialog
const proofDialog = ref(false)
const proofSkill = ref<Skill | null>(null)
const proofType = ref<ProofType>('project')
const proofLabel = ref('')
const proofTypeOptions = (Object.keys(PROOF_META) as ProofType[])
  .filter(t => t !== 'self')
  .map(value => ({ value, title: `${PROOF_META[value].label} (+${PROOF_META[value].weight})` }))

function openAddProof(skill: Skill) {
  proofSkill.value = skill
  proofType.value = 'project'
  proofLabel.value = ''
  proofDialog.value = true
}
function saveProof() {
  if (proofSkill.value && proofLabel.value.trim())
    profile.addProof(proofSkill.value.id, proofType.value, proofLabel.value.trim())
  proofDialog.value = false
}
function requestEndorsementProof(skill: Skill) {
  proofSnackbar.value = ai.suggestProofRequest(skill.name)
}
const proofSnackbar = ref('')

// Skill detail dialog
const detailDialog = ref(false)
const detailSkill = ref<Skill | null>(null)
function openDetail(skill: Skill) {
  detailSkill.value = skill
  detailDialog.value = true
}

// Add-experience dialog
const expDialog = ref(false)
const newExp = ref({ title: '', company: '', period: '', desc: '' })
function saveExp() {
  profile.addExperience({ ...newExp.value })
  newExp.value = { title: '', company: '', period: '', desc: '' }
  expDialog.value = false
}

// Add-certificate dialog
const certDialog = ref(false)
const newCert = ref({ name: '', issuer: '', date: '' })
function saveCert() {
  profile.addCertificate({ ...newCert.value })
  newCert.value = { name: '', issuer: '', date: '' }
  certDialog.value = false
}

// Edit profile (headline + summary) dialog
const editDialog = ref(false)
const editForm = ref({ headline: '', summary: '' })
function openEdit() {
  editForm.value = { headline: profile.headline, summary: profile.summary }
  editDialog.value = true
}
function saveEdit() {
  profile.headline = editForm.value.headline
  profile.summary = editForm.value.summary
  editDialog.value = false
  toast('تم تحديث ملفك الشخصي')
}

// Lightweight toast for resume/endorsement actions
const toastMsg = ref('')
function toast(msg: string) {
  toastMsg.value = msg
}
function requestEndorsement() {
  toast('أرسل الـ AI طلب توصية مهني نيابةً عنك.')
}
function exportResume(name: string, format: string) {
  toast(`جارٍ تصدير «${name}» بصيغة ${format}...`)
}
function shareResume(id: number) {
  const url = `${window.location.origin}${import.meta.env.BASE_URL}resume/${id}`
  navigator.clipboard?.writeText(url)
  toast('تم نسخ رابط مشاركة السيرة.')
}

const endorsements = [
  { name: 'أحمد المنصور', relation: 'مدير سابق', type: 'نص', trusted: true },
  { name: 'سارة العتيبي', relation: 'زميلة', type: 'فيديو', trusted: false },
]
const privacySettings = ref([
  { label: 'ظهور الملف الشخصي', value: 'public' },
  { label: 'ظهور التوصيات', value: 'companies' },
  { label: 'ظهور نتائج الاختبارات', value: 'private' },
  { label: 'ظهور الرغبات الواردة', value: 'private' },
  { label: 'ظهور السير الذاتية', value: 'public' },
  { label: 'ظهور المهارات', value: 'public' },
  { label: 'ظهور الإثباتات', value: 'companies' },
  { label: 'ظهور نسبة الثقة', value: 'public' },
  { label: 'ظهور تقارير المقابلات', value: 'companies' },
  { label: 'ظهور تسجيلات المقابلات', value: 'private' },
  { label: 'إشعارات التواصل', value: 'public' },
  { label: 'مشاركة البيانات للتحليل', value: 'public' },
])
const proofRequestEnabled = ref(true)
const interviewsForCompanies = ref(true)
const interviewerRequestsEnabled = ref(true)
const privacyOptions = [
  { value: 'public', title: 'عام' },
  { value: 'companies', title: 'لأصحاب العمل' },
  { value: 'private', title: 'خاص' },
]

const initials = computed(() => user.value?.name?.charAt(0).toUpperCase() ?? '?')
const roleLabel = computed(() => (authStore.role ? t(`roles.${authStore.role}`) : ''))
const personaStore = usePersonaStore()
const personaMeta = computed(() => SEEKER_PERSONA_META[personaStore.state.seekerPersona])

// بذر «المجالات المفضّلة» من سياق القطاع — اقتراح غير هادم: تسميات قطاعات المستخدم
// غير المضافة بعد، تُلحق بنقرة (يغلق حلقة interestedSectors → تفضيلات الباحث).
const sector = useSectorContext()
const sectorFieldSuggestions = computed(() =>
  sector.effective.value
    .map(id => getSector(id)?.label)
    .filter((l): l is string => !!l && !profile.prefs.preferred_fields.includes(l)),
)
function addPreferredField(label: string) {
  if (!profile.prefs.preferred_fields.includes(label))
    profile.prefs.preferred_fields = [...profile.prefs.preferred_fields, label]
}
const orgTypeItems = ORG_TYPES.map(t => ({ value: t, title: ORG_TYPE_META[t].label }))
const profileCompletion = computed(() => {
  let score = 40
  if (profile.skills.length >= 3)
    score += 20
  if (profile.experiences.length >= 1)
    score += 20
  if (profile.certificates.length >= 1)
    score += 20
  return Math.min(score, 100)
})

// At-a-glance metrics for the profile hero
const totalProofs = computed(() =>
  profile.skills.reduce((sum, s) => sum + s.proofs.length, 0),
)
const heroStats = computed(() => [
  { label: 'اكتمال الملف', value: `${profileCompletion.value}%`, icon: 'mdi-account-check-outline', color: 'primary' },
  { label: 'المهارات', value: profile.skills.length, icon: 'mdi-star-four-points-outline', color: 'accent' },
  { label: 'الإثباتات', value: totalProofs.value, icon: 'mdi-shield-check-outline', color: 'secondary' },
  { label: 'المقابلات', value: interviewsStore.completed.length, icon: 'mdi-account-tie-voice-outline', color: 'info' },
])
</script>

<template>
  <div>
    <!-- Header card -->
    <BaseCard :padded="false" class="profile-hero mb-5 overflow-hidden">
      <div class="brand-gradient profile-hero__banner" />
      <div class="px-5 pb-5">
        <!-- Avatar overlaps the banner; actions sit on the surface beside it -->
        <div class="profile-hero__row flex items-end justify-between gap-4">
          <span class="profile-hero__avatar inline-flex h-[104px] w-[104px] items-center justify-center rounded-full text-3xl font-bold" style="background: rgb(var(--v-theme-secondary)); color: rgb(var(--v-theme-on-secondary))">
            {{ initials }}
          </span>
          <div class="flex flex-wrap gap-2">
            <BaseButton variant="outline" :to="{ name: 'public-resume', params: { token: 'me' } }">
              <BaseIcon name="mdi-share-variant-outline" :size="18" />مشاركة الملف
            </BaseButton>
            <BaseButton variant="accent" @click="openEdit"><BaseIcon name="mdi-pencil" :size="18" />تعديل</BaseButton>
          </div>
        </div>

        <!-- Name & identity — on the card surface, clear of the banner -->
        <div class="mt-3">
          <div class="flex flex-wrap items-center gap-2">
            <h1 class="mb-0 text-xl font-bold text-content">{{ user?.name }}</h1>
            <BaseIcon name="mdi-check-decagram" :size="22" title="هوية موثّقة" :style="{ color: 'rgb(var(--v-theme-primary))' }" />
          </div>
          <div class="mt-1 text-sm text-muted">{{ profile.headline }}</div>
          <div class="mt-2 flex flex-wrap items-center gap-2">
            <BaseChip color="brand"><BaseIcon name="mdi-shield-account-outline" :size="13" />{{ roleLabel }}</BaseChip>
            <BaseChip color="emerald"><BaseIcon :name="personaMeta.icon" :size="13" />{{ personaMeta.label }}</BaseChip>
            <BaseChip :color="mapColor(trust.level.color)"><BaseIcon name="mdi-star-check-outline" :size="13" />ثقة {{ trust.score }}% · {{ trust.level.label }}</BaseChip>
          </div>
        </div>

        <p class="mb-0 mt-4 text-sm text-muted" style="max-width: 720px">{{ profile.summary }}</p>

        <!-- At-a-glance stat strip -->
        <div class="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div v-for="st in heroStats" :key="st.label" class="stat-tile flex items-center gap-3 p-3">
            <BaseAvatar :color="mapColor(st.color)" tonal :size="42" square>
              <BaseIcon :name="st.icon" :size="22" />
            </BaseAvatar>
            <div>
              <div class="text-lg font-bold leading-[1.15] text-content">{{ st.value }}</div>
              <div class="text-xs text-muted">{{ st.label }}</div>
            </div>
          </div>
        </div>

        <!-- Profile completion -->
        <div class="mt-4">
          <div class="mb-1 flex justify-between text-xs">
            <span class="text-muted">اكتمال الملف الشخصي</span>
            <span class="font-bold" :style="{ color: 'rgb(var(--v-theme-primary))' }">{{ profileCompletion }}%</span>
          </div>
          <BaseProgressBar :value="profileCompletion" :height="8" color="primary" />
        </div>
      </div>
    </BaseCard>

    <!-- Role profile tabs (multi-role accounts only) -->
    <div v-if="ownedProRoles.length > 1" class="mb-5 flex flex-wrap gap-1">
      <button
        v-for="r in ownedProRoles"
        :key="r"
        type="button"
        class="nav-tab"
        :class="{ 'is-active': roleTab === r }"
        @click="roleTab = r"
      >
        <BaseIcon :name="ROLE_TAB_META[r].icon" :size="18" />
        {{ ROLE_TAB_META[r].label }}
        <BaseChip v-if="authStore.roleStatus(r) === 'pending'" color="warning" class="ms-1">{{ t('roleSwitcher.pending') }}</BaseChip>
      </button>
    </div>

    <div v-show="roleTab === 'seeker'">
      <!-- Trust score -->
      <div class="mb-5">
        <TrustScoreCard />
      </div>

      <div class="mb-4 flex flex-wrap gap-1">
        <button
          v-for="tb in SEEKER_TABS"
          :key="tb.value"
          type="button"
          class="nav-tab flex-none"
          :class="{ 'is-active': tab === tb.value }"
          @click="tab = tb.value"
        >
          <BaseIcon :name="tb.icon" :size="18" />
          {{ tb.label }}
          <BaseChip v-if="tb.value === 'reviews' && reviewsCount" color="warning" class="ms-1">{{ reviewsCount }}</BaseChip>
        </button>
      </div>

      <!-- استيراد السيرة الذاتيّة بالذكاء -->
      <CvImport
        v-if="tab === 'skills'"
        class="mb-4"
        @applied="c => toast(`تمّ استيراد سيرتك: ${c}`)"
        @error="m => toast(m)"
      />

      <!-- Skills -->
      <BaseCard v-if="tab === 'skills'">
        <div class="mb-1 flex justify-between">
          <h3 class="text-base font-bold text-content">المهارات الموثّقة ({{ profile.skills.length }})</h3>
          <BaseButton variant="tonal-accent" size="sm" @click="skillDialog = true"><BaseIcon name="mdi-plus" :size="16" />إضافة مهارة</BaseButton>
        </div>
        <p class="mb-4 text-xs text-muted">كل مهارة مدعومة بإثباتات (اختبار، توصية، مشروع، شهادة) تحدّد نسبة الثقة والمستوى</p>

        <!-- AI skill-gap insight -->
        <div v-if="skillInsight" class="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-ui border-s-4 bg-surfalt p-3" :style="{ borderColor: 'rgb(var(--v-theme-secondary))' }">
          <span class="flex items-center gap-2 text-sm text-content">
            <BaseIcon name="mdi-robot-happy-outline" :size="20" :style="{ color: 'rgb(var(--v-theme-secondary))' }" />{{ skillInsight.message }}
          </span>
          <BaseButton size="sm" variant="accent" :to="{ name: 'interviews' }"><BaseIcon name="mdi-account-tie-voice-outline" :size="16" />أثبت الآن</BaseButton>
        </div>

        <template v-for="group in skillGroups" :key="group.category?.id ?? 'other'">
          <div class="mb-2 mt-3 flex items-center gap-2">
            <BaseIcon :name="group.category?.icon ?? 'mdi-shape-outline'" :size="20" :style="{ color: colorVar(group.category?.color) }" />
            <span class="text-sm font-bold text-content">{{ group.category?.label ?? 'أخرى' }}</span>
            <BaseChip color="neutral">{{ group.skills.length }}</BaseChip>
          </div>
          <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div v-for="skill in group.skills" :key="skill.id" class="rounded-ui-lg border-ui p-3">
              <div class="mb-2 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="font-bold text-content">{{ skill.name }}</span>
                  <BaseChip :color="confidenceColor(skillConfidence(skill))">{{ levelOf(skill) }}</BaseChip>
                </div>
                <div class="flex items-center gap-1">
                  <button class="icon-btn h-7 w-7" style="color: rgb(var(--v-theme-accent))" aria-label="إضافة إثبات" @click="openAddProof(skill)"><BaseIcon name="mdi-plus" :size="16" /></button>
                  <button class="icon-btn h-7 w-7" aria-label="تفاصيل" @click="openDetail(skill)"><BaseIcon name="mdi-information-outline" :size="16" /></button>
                  <button class="icon-btn h-7 w-7" style="color: rgb(var(--v-theme-error))" aria-label="حذف" @click="profile.removeSkill(skill.id)"><BaseIcon name="mdi-delete-outline" :size="16" /></button>
                </div>
              </div>

              <!-- Proof source icons -->
              <div class="mb-2 flex flex-wrap items-center gap-1">
                <BaseAvatar
                  v-for="p in skill.proofs"
                  :key="p.id"
                  :color="mapColor(PROOF_META[p.type].color)"
                  tonal
                  :size="26"
                  class="cursor-pointer"
                  :title="`${PROOF_META[p.type].label}: ${p.label}`"
                  @click="openDetail(skill)"
                >
                  <BaseIcon :name="PROOF_META[p.type].icon" :size="15" />
                </BaseAvatar>
                <button class="ms-1 inline-flex items-center gap-1 text-xs font-medium" style="color: rgb(var(--v-theme-secondary))" @click="requestEndorsementProof(skill)">
                  <BaseIcon name="mdi-account-star-outline" :size="15" />طلب إثبات
                </button>
              </div>

              <!-- Confidence bar -->
              <div class="mb-1 flex justify-between text-xs">
                <span class="text-muted">نسبة الثقة</span>
                <span class="font-bold" :style="{ color: colorVar(confidenceColor(skillConfidence(skill))) }">{{ skillConfidence(skill) }}%</span>
              </div>
              <BaseProgressBar :value="skillConfidence(skill)" :color="confidenceColor(skillConfidence(skill))" :height="8" />
            </div>
          </div>
        </template>
        <div v-if="!profile.skills.length" class="py-6 text-center text-muted">لا مهارات بعد — أضف أول مهارة</div>
      </BaseCard>

      <!-- Experience -->
      <BaseCard v-else-if="tab === 'experience'">
        <div class="mb-4 flex justify-between">
          <h3 class="text-base font-bold text-content">الخبرات العملية ({{ profile.experiences.length }})</h3>
          <BaseButton variant="tonal-accent" size="sm" @click="expDialog = true"><BaseIcon name="mdi-plus" :size="16" />إضافة خبرة</BaseButton>
        </div>
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div v-for="exp in profile.experiences" :key="exp.id" class="flex gap-3 rounded-ui-lg border-ui p-3">
            <BaseAvatar color="brand" tonal square class="shrink-0"><BaseIcon name="mdi-briefcase-outline" :size="20" /></BaseAvatar>
            <div class="flex-1">
              <div class="text-sm font-bold text-content">{{ exp.title }}</div>
              <div class="text-sm" :style="{ color: 'rgb(var(--v-theme-secondary))' }">{{ exp.company }} · {{ exp.period }}</div>
              <div class="mt-1 text-sm text-muted">{{ exp.desc }}</div>
            </div>
            <button class="icon-btn h-7 w-7 shrink-0" style="color: rgb(var(--v-theme-error))" aria-label="حذف" @click="profile.removeExperience(exp.id)"><BaseIcon name="mdi-delete-outline" :size="16" /></button>
          </div>
        </div>
        <div v-if="!profile.experiences.length" class="py-6 text-center text-muted">لا خبرات بعد — أضف أول خبرة</div>
      </BaseCard>

      <!-- Certificates -->
      <BaseCard v-else-if="tab === 'certificates'">
        <div class="mb-4 flex justify-between">
          <h3 class="text-base font-bold text-content">الشهادات والدورات ({{ profile.certificates.length }})</h3>
          <BaseButton variant="tonal-accent" size="sm" @click="certDialog = true"><BaseIcon name="mdi-plus" :size="16" />إضافة</BaseButton>
        </div>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div v-for="cert in profile.certificates" :key="cert.id" class="flex items-center gap-3 rounded-ui-lg border-ui p-3">
            <BaseAvatar color="success" tonal square><BaseIcon name="mdi-certificate-outline" :size="20" /></BaseAvatar>
            <div class="flex-1">
              <div class="text-sm font-bold text-content">{{ cert.name }}</div>
              <div class="text-xs text-muted">{{ cert.issuer }} · {{ cert.date }}</div>
            </div>
            <button class="icon-btn h-7 w-7" style="color: rgb(var(--v-theme-error))" aria-label="حذف" @click="profile.removeCertificate(cert.id)"><BaseIcon name="mdi-delete-outline" :size="16" /></button>
          </div>
        </div>
      </BaseCard>

      <!-- Endorsements -->
      <BaseCard v-else-if="tab === 'endorsements'">
        <div class="mb-4 flex justify-between">
          <h3 class="text-base font-bold text-content">التوصيات والتزكيات</h3>
          <BaseButton variant="tonal-accent" size="sm" @click="requestEndorsement"><BaseIcon name="mdi-plus" :size="16" />طلب توصية</BaseButton>
        </div>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div v-for="e in endorsements" :key="e.name" class="flex items-center gap-3 rounded-ui-lg border-ui p-3">
            <BaseAvatar color="emerald" tonal><BaseIcon name="mdi-account" :size="20" /></BaseAvatar>
            <div class="flex-1">
              <div class="flex items-center gap-1 text-sm font-bold text-content">
                {{ e.name }}
                <BaseIcon v-if="e.trusted" name="mdi-check-decagram" :size="16" :style="{ color: 'rgb(var(--v-theme-success))' }" />
              </div>
              <div class="text-xs text-muted">{{ e.relation }}</div>
            </div>
            <BaseChip color="neutral"><BaseIcon name="mdi-format-quote-close" :size="12" />{{ e.type }}</BaseChip>
          </div>
        </div>
      </BaseCard>

      <!-- Resumes -->
      <BaseCard v-else-if="tab === 'resumes'">
        <div class="mb-4 flex justify-between">
          <h3 class="text-base font-bold text-content">السير الذاتية المنشأة ({{ resumesStore.count }})</h3>
          <BaseButton variant="tonal-accent" size="sm" :to="{ name: 'resume-builder' }"><BaseIcon name="mdi-plus" :size="16" />إنشاء سيرة</BaseButton>
        </div>
        <div class="flex flex-col gap-1">
          <div v-for="r in resumesStore.resumes" :key="r.id" class="flex items-center gap-3 rounded-ui px-2 py-2 hover:bg-surfalt">
            <BaseAvatar :color="r.active ? 'success' : 'brand'" tonal square><BaseIcon name="mdi-file-account-outline" :size="20" /></BaseAvatar>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1 font-bold text-content">
                {{ r.name }}
                <BaseChip v-if="r.active" color="success">نشطة</BaseChip>
              </div>
              <div class="truncate text-xs text-muted">{{ r.template }} · {{ r.language }} · أُنشئت {{ r.createdAt }}</div>
            </div>
            <BaseButton v-if="!r.active" variant="tonal-emerald" size="sm" @click="resumesStore.setActive(r.id)">تعيين كنشطة</BaseButton>
            <BaseButton variant="ghost" size="sm" :to="{ name: 'public-resume', params: { token: String(r.id) } }"><BaseIcon name="mdi-open-in-new" :size="18" /></BaseButton>
            <BaseDropdown>
              <template #trigger="{ toggle }">
                <button class="icon-btn h-9 w-9" aria-label="خيارات" @click="toggle"><BaseIcon name="mdi-dots-vertical" :size="18" /></button>
              </template>
              <div class="min-w-[180px] py-1">
                <router-link class="menu-row" :to="{ name: 'resume-builder' }"><BaseIcon name="mdi-pencil" :size="18" />تعديل</router-link>
                <button class="menu-row" @click="exportResume(r.name, 'PDF')"><BaseIcon name="mdi-file-pdf-box" :size="18" />تصدير PDF</button>
                <button class="menu-row" @click="shareResume(r.id)"><BaseIcon name="mdi-share-variant" :size="18" />مشاركة الرابط</button>
                <button class="menu-row" style="color: rgb(var(--v-theme-error))" @click="resumesStore.remove(r.id)"><BaseIcon name="mdi-delete-outline" :size="18" />حذف</button>
              </div>
            </BaseDropdown>
          </div>
        </div>
        <div v-if="!resumesStore.count" class="py-6 text-center text-muted">لا سير ذاتية بعد — أنشئ أول سيرة</div>
      </BaseCard>

      <!-- Interviews -->
      <BaseCard v-else-if="tab === 'interviews'">
        <div class="mb-4 flex justify-between">
          <h3 class="text-base font-bold text-content">المقابلات المُنجزة ({{ interviewsStore.completed.length }})</h3>
          <BaseButton variant="tonal-accent" size="sm" :to="{ name: 'interviews' }"><BaseIcon name="mdi-plus" :size="16" />مقابلة جديدة</BaseButton>
        </div>
        <div v-if="interviewsStore.completed.length" class="flex flex-col gap-1">
          <router-link
            v-for="iv in interviewsStore.completed"
            :key="iv.id"
            class="flex items-center gap-3 rounded-ui px-2 py-2 hover:bg-surfalt"
            :to="{ name: 'interview-result', params: { id: iv.id } }"
          >
            <BaseAvatar color="success" tonal square><BaseIcon :name="TYPE_META[iv.type].icon" :size="20" /></BaseAvatar>
            <div class="min-w-0 flex-1">
              <div class="font-bold text-content">{{ TYPE_META[iv.type].label }} · {{ LEVEL_META[iv.level].label }}</div>
              <div class="truncate text-xs text-muted">{{ iv.date }} · النتيجة {{ iv.result?.score }}% ({{ iv.result?.level }})</div>
            </div>
            <BaseChip color="success">{{ iv.result?.score }}%</BaseChip>
          </router-link>
        </div>
        <div v-else class="py-6 text-center text-muted">
          لا مقابلات بعد — أجرِ مقابلة AI لتحديد مستواك ورفع نسبة ثقتك
        </div>

        <!-- Certified-interviewer reports -->
        <template v-if="certifiedReports.length">
          <hr class="my-4 border-ui">
          <div class="mb-3 flex items-center gap-2">
            <BaseIcon name="mdi-account-tie" :size="22" :style="{ color: 'rgb(var(--v-theme-secondary))' }" />
            <h3 class="text-base font-bold text-content">تقارير المقيّمين المعتمدين ({{ certifiedReports.length }})</h3>
          </div>
          <div v-for="b in certifiedReports" :key="b.id" class="mb-2 rounded-ui-lg border-ui p-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div class="text-sm font-bold text-content">{{ b.interviewerName }} · {{ KIND_META[b.kind].label }}</div>
                <div class="text-xs text-muted">{{ b.datetime }} · المستوى {{ b.report?.level }}</div>
              </div>
              <div class="flex items-center gap-2">
                <BaseChip color="success">{{ b.report?.overall }}%</BaseChip>
                <BaseButton variant="tonal-emerald" size="sm" @click="openCertificate(b)"><BaseIcon name="mdi-certificate-outline" :size="16" />الشهادة</BaseButton>
              </div>
            </div>
          </div>
        </template>
      </BaseCard>

      <!-- Reviews (about the candidate) -->
      <BaseCard v-else-if="tab === 'reviews'">
        <div class="mb-1 flex items-center gap-2">
          <BaseIcon name="mdi-star-check-outline" :size="22" :style="{ color: colorVar('amber') }" />
          <h3 class="text-base font-bold text-content">تقييمات المقيّمين عنك</h3>
        </div>
        <p class="mb-4 text-xs text-muted">تقييمات علنية موثّقة من المقيّمين المعتمدين — يمكنك الرد مرة واحدة على كل تقييم.</p>
        <ReviewsPanel direction="toCandidate" subject-id="me" subject-name="أنت" can-reply />
      </BaseCard>

      <!-- Seeker preferences (seeker_profiles) -->
      <BaseCard v-else-if="tab === 'prefs'">
        <h3 class="mb-1 text-base font-bold text-content">تفضيلات التوظيف والجاهزية</h3>
        <p class="mb-4 text-xs text-muted">تساعد هذه التفضيلات محرّك الترشيح الذكي على مطابقتك بالفرص الأنسب</p>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label class="mb-1 block text-sm font-medium text-muted">الجاهزية للعمل</label>
            <BaseSelect :model-value="profile.prefs.availability" :items="AVAILABILITY_OPTIONS" prefix-icon="mdi-calendar-clock-outline" @update:model-value="v => v && (profile.prefs.availability = v as typeof profile.prefs.availability)" />
          </div>
          <BaseInput v-model="profile.prefs.location" label="موقعك الحالي" prefix-icon="mdi-map-marker-outline" />
          <BaseInput v-model.number="profile.prefs.expected_salary" type="number" label="الراتب المتوقع (شهريًا)" prefix-icon="mdi-cash-multiple" />
          <div class="md:col-span-2">
            <label class="mb-1 block text-sm font-medium text-muted">أنواع العمل المفضّلة</label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="et in EMPLOYMENT_TYPES"
                :key="et.value"
                type="button"
                class="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition"
                :style="toggleStyle(profile.prefs.preferred_employment_types.includes(et.value), 'primary')"
                @click="toggleEmploymentType(et.value)"
              >{{ et.title }}</button>
            </div>
          </div>
          <BaseTagInput v-model="profile.prefs.preferred_fields" label="المجالات المفضّلة" placeholder="اكتب مجالًا واضغط Enter" />
          <div v-if="sectorFieldSuggestions.length" class="-mt-1 flex flex-wrap items-center gap-1.5">
            <span class="text-xs text-muted">أضف من قطاعاتك:</span>
            <button
              v-for="label in sectorFieldSuggestions"
              :key="label"
              type="button"
              class="btn-tonal-emerald inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
              @click="addPreferredField(label)"
            >
              <BaseIcon name="mdi-plus" :size="13" /> {{ label }}
            </button>
          </div>
          <BaseTagInput v-model="profile.prefs.preferred_locations" label="المواقع المفضّلة" placeholder="اكتب موقعًا واضغط Enter" />
        </div>
        <hr class="my-3 border-ui">
        <div class="flex items-center justify-between py-1">
          <div>
            <div class="text-sm font-bold text-content">العرض الذاتي</div>
            <div class="text-xs text-muted">اعرض نفسك للجهات كمرشح متاح دون انتظار فرصة منشورة</div>
          </div>
          <BaseSwitch v-model="profile.prefs.self_offer_active" />
        </div>
      </BaseCard>

      <!-- Privacy -->
      <BaseCard v-else-if="tab === 'privacy'">
        <h3 class="mb-4 text-base font-bold text-content">إعدادات الخصوصية</h3>
        <div v-for="(pv, i) in privacySettings" :key="i" class="flex flex-wrap items-center justify-between gap-2 py-2">
          <span class="text-sm text-content">{{ pv.label }}</span>
          <div class="seg">
            <button
              v-for="opt in privacyOptions"
              :key="opt.value"
              type="button"
              class="seg-btn"
              :class="{ 'is-active': pv.value === opt.value }"
              @click="pv.value = opt.value"
            >{{ opt.title }}</button>
          </div>
        </div>
        <hr class="my-2 border-ui">
        <BaseSwitch v-model="proofRequestEnabled" label="السماح للآخرين بطلب إثبات مهارة مني" />
        <BaseSwitch v-model="interviewsForCompanies" label="إتاحة نتائج مقابلاتي للجهات" />
        <BaseSwitch v-model="interviewerRequestsEnabled" label="السماح للمقيّمين بطلب إجراء مقابلة معي" />
      </BaseCard>
    </div>

    <!-- ===== Interviewer profile (interviewer_profiles) ===== -->
    <div v-if="roleTab === 'interviewer'">
      <BaseCard class="mb-5">
        <div class="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h3 class="text-base font-bold text-content">ملف المقيّم المعتمد</h3>
          <BaseChip v-if="roleProfiles.interviewer.is_approved || authStore.hasRole('interviewer')" color="success"><BaseIcon name="mdi-check-decagram" :size="13" />معتمد</BaseChip>
          <BaseChip v-else color="warning"><BaseIcon name="mdi-clock-outline" :size="13" />{{ t('roleSwitcher.pending') }}</BaseChip>
        </div>
        <div class="mb-1 mt-3 flex justify-between text-xs">
          <span class="text-muted">اكتمال ملف المقيّم</span>
          <span class="font-bold" :style="{ color: 'rgb(var(--v-theme-primary))' }">{{ roleProfiles.interviewerCompletion }}%</span>
        </div>
        <BaseProgressBar :value="roleProfiles.interviewerCompletion" :height="8" color="primary" class="mb-4" />
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
          <BaseTagInput v-model="roleProfiles.interviewer.specializations" label="التخصصات التي تقيّمها" placeholder="اكتب تخصصًا واضغط Enter" />
          <BaseInput v-model.number="roleProfiles.interviewer.hourly_rate" type="number" label="السعر لكل ساعة (ر.س)" prefix-icon="mdi-cash-multiple" />
          <BaseTagInput v-model="roleProfiles.interviewer.interview_types" label="أنواع المقابلات" placeholder="اكتب نوعًا واضغط Enter" />
          <BaseTagInput v-model="roleProfiles.interviewer.certificates" label="الشهادات والخبرات" placeholder="اكتب شهادة واضغط Enter" />
        </div>
        <div class="mt-3 grid grid-cols-3 gap-3">
          <div
            v-for="stat in [
              { label: 'مقابلات منفّذة', value: roleProfiles.interviewer.total_interviews, icon: 'mdi-account-tie-voice-outline', color: 'primary' },
              { label: 'متوسط التقييم', value: roleProfiles.interviewer.average_rating || '—', icon: 'mdi-star-outline', color: 'amber' },
              { label: 'إجمالي الأرباح', value: `${roleProfiles.interviewer.total_earnings} ر.س`, icon: 'mdi-wallet-outline', color: 'secondary' },
            ]"
            :key="stat.label"
            class="rounded-ui p-3 text-center"
            style="background: rgba(var(--v-theme-primary), 0.06)"
          >
            <BaseIcon :name="stat.icon" :size="20" class="mb-1" :style="{ color: colorVar(stat.color) }" />
            <div class="text-sm font-bold text-content">{{ stat.value }}</div>
            <div class="text-xs text-muted">{{ stat.label }}</div>
          </div>
        </div>
      </BaseCard>
      <BaseCard>
        <h3 class="mb-3 text-base font-bold text-content">خصوصية دور المقيّم</h3>
        <div class="flex flex-wrap items-center justify-between gap-2 py-2">
          <span class="text-sm text-content">ظهور ملف المقيّم في السوق</span>
          <div class="seg">
            <button v-for="opt in VISIBILITY_OPTIONS" :key="opt.value" type="button" class="seg-btn" :class="{ 'is-active': roleProfiles.interviewer.visibility === opt.value }" @click="roleProfiles.interviewer.visibility = opt.value as typeof roleProfiles.interviewer.visibility">{{ opt.title }}</button>
          </div>
        </div>
        <BaseSwitch v-model="roleProfiles.interviewer.notifications_enabled" label="إشعارات طلبات التقييم الجديدة" />
        <BaseSwitch v-model="roleProfiles.linkRolesPublicly" label="إظهار أدواري الأخرى في ملفي العام" />
      </BaseCard>
    </div>

    <!-- ===== Employer profile (employer_profiles) ===== -->
    <div v-if="roleTab === 'company'">
      <BaseCard class="mb-5">
        <div class="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h3 class="text-base font-bold text-content">ملف جهة التوظيف</h3>
          <div class="flex items-center gap-1">
            <BaseChip color="emerald"><BaseIcon :name="ORG_TYPE_META[personaStore.state.orgType].icon" :size="13" />{{ ORG_TYPE_META[personaStore.state.orgType].label }}</BaseChip>
            <BaseChip v-if="roleProfiles.employer.is_verified" color="success"><BaseIcon name="mdi-check-decagram" :size="13" />شركة موثّقة</BaseChip>
          </div>
        </div>
        <div class="mb-1 mt-3 flex justify-between text-xs">
          <span class="text-muted">اكتمال ملف الجهة</span>
          <span class="font-bold" :style="{ color: 'rgb(var(--v-theme-primary))' }">{{ roleProfiles.employerCompletion }}%</span>
        </div>
        <BaseProgressBar :value="roleProfiles.employerCompletion" :height="8" color="primary" class="mb-4" />
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
          <BaseInput v-model="roleProfiles.employer.company_name" label="اسم الجهة / الشركة" prefix-icon="mdi-office-building-outline" />
          <BaseInput v-model="roleProfiles.employer.industry" label="المجال" prefix-icon="mdi-tag-outline" />
          <div>
            <label class="mb-1 block text-sm font-medium text-muted">حجم الشركة</label>
            <BaseSelect :model-value="roleProfiles.employer.company_size" :items="COMPANY_SIZE_OPTIONS" prefix-icon="mdi-account-group-outline" @update:model-value="v => v && (roleProfiles.employer.company_size = v as typeof roleProfiles.employer.company_size)" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-muted">نوع المنشأة</label>
            <BaseSelect :model-value="personaStore.state.orgType" :items="orgTypeItems" prefix-icon="mdi-domain" @update:model-value="v => v && personaStore.setOrgType(v)" />
          </div>
          <BaseInput v-model="roleProfiles.employer.company_website" label="الموقع الإلكتروني" prefix-icon="mdi-web" dir="ltr" />
          <BaseTextarea v-model="roleProfiles.employer.company_description" label="نبذة عن الشركة" :rows="3" class="md:col-span-2" />
        </div>
      </BaseCard>
      <BaseCard>
        <h3 class="mb-3 text-base font-bold text-content">خصوصية دور جهة التوظيف</h3>
        <div class="flex flex-wrap items-center justify-between gap-2 py-2">
          <span class="text-sm text-content">ظهور الشركة للمرشحين ونتائج البحث</span>
          <div class="seg">
            <button v-for="opt in VISIBILITY_OPTIONS" :key="opt.value" type="button" class="seg-btn" :class="{ 'is-active': roleProfiles.employer.visibility === opt.value }" @click="roleProfiles.employer.visibility = opt.value as typeof roleProfiles.employer.visibility">{{ opt.title }}</button>
          </div>
        </div>
        <BaseSwitch v-model="roleProfiles.employer.notifications_enabled" label="إشعارات المتقدمين الجدد" />
        <BaseSwitch v-model="roleProfiles.linkRolesPublicly" label="إظهار أدواري الأخرى في ملفي العام" />
      </BaseCard>
    </div>

    <!-- Add skill dialog -->
    <BaseModal v-model="skillDialog" title="إضافة مهارة" :max-width="420">
      <div class="mb-3">
        <label class="mb-1 block text-sm font-medium text-muted">التصنيف</label>
        <BaseSelect :model-value="newSkillCategory ?? null" :items="categoryOptions" placeholder="—" clearable @update:model-value="v => newSkillCategory = v ?? undefined" />
      </div>
      <BaseInput v-model="newSkillName" label="اسم المهارة" list="skill-suggestions" class="mb-1" />
      <datalist id="skill-suggestions">
        <option v-for="opt in categorySkillSuggestions" :key="opt" :value="opt" />
      </datalist>
      <p class="mb-3 text-xs text-muted">{{ newSkillCategory ? 'اختر من الاقتراحات أو اكتب مهارة جديدة' : 'اختر تصنيفًا لاقتراح مهارات، أو اكتب مباشرة' }}</p>
      <div class="mb-1 text-sm text-content">المستوى</div>
      <BaseRating v-model="newSkillLevel" />
      <template #actions>
        <BaseButton variant="ghost" @click="skillDialog = false">إلغاء</BaseButton>
        <BaseButton variant="accent" :disabled="!newSkillName.trim()" @click="saveSkill">إضافة</BaseButton>
      </template>
    </BaseModal>

    <!-- Add proof dialog -->
    <BaseModal v-model="proofDialog" :title="`إضافة إثبات لمهارة «${proofSkill?.name}»`" :max-width="460">
      <div class="mb-2">
        <label class="mb-1 block text-sm font-medium text-muted">نوع الإثبات</label>
        <BaseSelect :model-value="proofType" :items="proofTypeOptions" @update:model-value="v => v && (proofType = v)" />
      </div>
      <BaseInput v-model="proofLabel" label="الوصف / المرجع" placeholder="مثال: اختبار Vue — 90% أو رابط مشروع" />
      <div class="mt-2 flex items-start gap-2 rounded-ui border-s-4 bg-surfalt p-2 text-xs text-content" :style="{ borderColor: 'rgb(var(--v-theme-info))' }">
        <BaseIcon name="mdi-information-outline" :size="16" :style="{ color: 'rgb(var(--v-theme-info))' }" />
        كل إثبات يرفع نسبة الثقة في المهارة حسب قوته.
      </div>
      <template #actions>
        <BaseButton variant="ghost" @click="proofDialog = false">إلغاء</BaseButton>
        <BaseButton variant="accent" :disabled="!proofLabel.trim()" @click="saveProof">إضافة الإثبات</BaseButton>
      </template>
    </BaseModal>

    <!-- Skill detail dialog -->
    <BaseModal v-model="detailDialog" :max-width="480">
      <template v-if="detailSkill" #title>
        <div class="flex items-center justify-between gap-2">
          <span>{{ detailSkill.name }}</span>
          <BaseChip :color="confidenceColor(skillConfidence(detailSkill))">{{ levelOf(detailSkill) }} · {{ skillConfidence(detailSkill) }}%</BaseChip>
        </div>
      </template>
      <template v-if="detailSkill">
        <!-- AI rationale for the confidence score -->
        <div class="mb-3 flex items-start gap-2 rounded-ui border-s-4 bg-surfalt p-2" :style="{ borderColor: 'rgb(var(--v-theme-secondary))' }">
          <BaseIcon name="mdi-robot-happy-outline" :size="20" :style="{ color: 'rgb(var(--v-theme-secondary))' }" />
          <span class="text-xs text-content">{{ skillRationale }}</span>
        </div>

        <div class="mb-2 text-sm font-bold text-content">مصادر الإثبات ({{ detailSkill.proofs.length }})</div>
        <div class="mb-4 flex flex-col gap-3">
          <div v-for="p in detailSkill.proofs" :key="p.id" class="flex items-start gap-2">
            <span class="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" :style="{ background: colorVar(PROOF_META[p.type].color) }" />
            <div class="flex flex-1 items-center justify-between gap-2">
              <div>
                <BaseChip :color="mapColor(PROOF_META[p.type].color)" class="mb-1"><BaseIcon :name="PROOF_META[p.type].icon" :size="12" />{{ PROOF_META[p.type].label }} (+{{ PROOF_META[p.type].weight }})</BaseChip>
                <div class="text-sm text-content">{{ p.label }}</div>
              </div>
              <span class="text-xs text-muted">{{ p.date }}</span>
            </div>
          </div>
        </div>
        <BaseButton variant="tonal-accent" size="sm" block @click="detailDialog = false; openAddProof(detailSkill)">
          <BaseIcon name="mdi-plus" :size="16" />إضافة إثبات جديد
        </BaseButton>
      </template>
    </BaseModal>

    <BaseSnackbar :model-value="!!proofSnackbar" color="secondary" :timeout="4000" @update:model-value="proofSnackbar = ''">
      {{ proofSnackbar }}
    </BaseSnackbar>

    <BaseSnackbar :model-value="!!toastMsg" color="primary" :timeout="3500" @update:model-value="toastMsg = ''">
      {{ toastMsg }}
    </BaseSnackbar>

    <!-- Edit profile dialog -->
    <BaseModal v-model="editDialog" title="تعديل الملف الشخصي" :max-width="520">
      <BaseInput v-model="editForm.headline" label="العنوان المهني" placeholder="مثال: مطوّر واجهات أمامية · الرياض" class="mb-3" />
      <BaseTextarea v-model="editForm.summary" label="النبذة التعريفية" :rows="4" />
      <template #actions>
        <BaseButton variant="ghost" @click="editDialog = false">إلغاء</BaseButton>
        <BaseButton variant="accent" @click="saveEdit"><BaseIcon name="mdi-content-save" :size="18" />حفظ</BaseButton>
      </template>
    </BaseModal>

    <!-- Digital certificate dialog -->
    <BaseModal v-model="certificateDialog" :max-width="560">
      <template v-if="certificateReport">
        <div class="brand-gradient -mx-4 -mt-4 mb-4 p-5 text-center" style="color: white">
          <BaseIcon name="mdi-certificate" :size="44" />
          <div class="mt-1 text-lg font-bold">شهادة اجتياز مقابلة تقييمية</div>
          <div class="text-xs" style="opacity: 0.85">منظومة التوظيف الذكية · موثّقة</div>
        </div>
        <div class="text-center">
          <div class="mb-1 text-sm text-muted">تشهد المنصة بأن</div>
          <div class="mb-3 text-lg font-bold text-content">{{ user?.name }}</div>
          <div class="mb-1 text-sm text-muted">اجتاز</div>
          <div class="text-base font-bold text-content">{{ KIND_META[certificateReport.kind].label }}</div>
          <div class="mb-3 text-sm text-content">بإشراف المقيّم المعتمد «{{ certificateReport.interviewerName }}»</div>

          <div class="my-4 flex justify-center gap-6">
            <div>
              <div class="text-2xl font-bold" :style="{ color: 'rgb(var(--v-theme-success))' }">{{ certificateReport.report?.overall }}%</div>
              <div class="text-xs text-muted">التقييم العام</div>
            </div>
            <div class="w-px self-stretch bg-[rgba(var(--v-theme-on-surface),0.14)]" />
            <div>
              <div class="text-2xl font-bold" :style="{ color: 'rgb(var(--v-theme-primary))' }">{{ certificateReport.report?.level }}</div>
              <div class="text-xs text-muted">المستوى المُحدَّد</div>
            </div>
            <div class="w-px self-stretch bg-[rgba(var(--v-theme-on-surface),0.14)]" />
            <div>
              <div class="text-2xl font-bold" :style="{ color: 'rgb(var(--v-theme-accent))' }">+{{ certificateReport.report?.trustGain }}%</div>
              <div class="text-xs text-muted">أثر الثقة</div>
            </div>
          </div>

          <div class="flex items-center justify-center gap-1 text-xs text-muted">
            <BaseIcon name="mdi-shield-check" :size="14" :style="{ color: 'rgb(var(--v-theme-success))' }" /> رقم التوثيق: SR-{{ certificateReport.id }}-{{ certificateReport.report?.overall }} · {{ certificateReport.datetime }}
          </div>
        </div>
      </template>
      <template #actions>
        <BaseButton variant="ghost" @click="certificateDialog = false">إغلاق</BaseButton>
        <BaseButton variant="accent" @click="toast('جارٍ تنزيل الشهادة الرقمية...')"><BaseIcon name="mdi-download" :size="18" />تنزيل الشهادة</BaseButton>
      </template>
    </BaseModal>

    <!-- Add experience dialog -->
    <BaseModal v-model="expDialog" title="إضافة خبرة" :max-width="480">
      <BaseInput v-model="newExp.title" label="المسمى الوظيفي" class="mb-2" />
      <BaseInput v-model="newExp.company" label="الشركة" class="mb-2" />
      <BaseInput v-model="newExp.period" label="الفترة" placeholder="مثال: 2020 - 2023" class="mb-2" />
      <BaseTextarea v-model="newExp.desc" label="الوصف" :rows="2" />
      <template #actions>
        <BaseButton variant="ghost" @click="expDialog = false">إلغاء</BaseButton>
        <BaseButton variant="accent" :disabled="!newExp.title.trim()" @click="saveExp">إضافة</BaseButton>
      </template>
    </BaseModal>

    <!-- Add certificate dialog -->
    <BaseModal v-model="certDialog" title="إضافة شهادة" :max-width="440">
      <BaseInput v-model="newCert.name" label="اسم الشهادة" class="mb-2" />
      <BaseInput v-model="newCert.issuer" label="الجهة المانحة" class="mb-2" />
      <BaseInput v-model="newCert.date" label="السنة" placeholder="مثال: 2024" />
      <template #actions>
        <BaseButton variant="ghost" @click="certDialog = false">إلغاء</BaseButton>
        <BaseButton variant="accent" :disabled="!newCert.name.trim()" @click="saveCert">إضافة</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.profile-hero__banner {
  height: 148px;
}
.profile-hero__row {
  margin-top: -52px;
}
/* Avatar cut cleanly into the banner — ring adapts to the theme surface */
.profile-hero__avatar {
  border: 4px solid rgb(var(--v-theme-surface));
  box-shadow: 0 8px 22px rgba(6, 20, 12, 0.28);
}
/* At-a-glance metric tiles — opaque theme bg so it repaints on live theme switch */
.stat-tile {
  border: 1px solid rgba(140, 163, 150, 0.18);
  border-radius: var(--ui-radius);
  background-color: rgb(var(--v-theme-surface-variant));
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.stat-tile:hover {
  border-color: rgba(var(--v-theme-primary), 0.45);
  box-shadow: 0 4px 14px rgba(6, 20, 12, 0.12);
}
</style>
