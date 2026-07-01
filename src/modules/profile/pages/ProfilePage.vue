<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/AuthStore'
import { PROOF_META, skillConfidence, skillLevelLabel, useProfileStore } from '@/stores/ProfileStore'
import type { ProofType, Skill } from '@/stores/ProfileStore'
import { useResumesStore } from '@/stores/ResumesStore'
import { useTrustStore } from '@/stores/TrustStore'
import { ai } from '@/services/ai'
import TrustScoreCard from '@/components/shared/TrustScoreCard.vue'
import ReviewsPanel from '@/components/shared/ReviewsPanel.vue'
import { useReviewsStore } from '@/stores/ReviewsStore'
import { ALL_SKILLS, TAXONOMY, categorizeSkill, getCategory } from '@/services/taxonomy'
import { LEVEL_META, TYPE_META, useInterviewsStore } from '@/stores/InterviewsStore'
import { KIND_META, useInterviewersStore } from '@/stores/InterviewersStore'
import type { Booking } from '@/stores/InterviewersStore'

const { t } = useI18n()
const interviewsStore = useInterviewsStore()
const interviewersStore = useInterviewersStore()
const trust = useTrustStore()
const reviewsStore = useReviewsStore()
const reviewsCount = computed(() => reviewsStore.countFor('toCandidate', 'me'))

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
    <VCard class="mb-5 overflow-hidden profile-hero">
      <div class="brand-gradient profile-hero__banner" />
      <VCardText class="pt-0">
        <!-- Avatar overlaps the banner; actions sit on the surface beside it -->
        <div class="d-flex align-end justify-space-between ga-4 profile-hero__row">
          <VAvatar color="secondary" size="104" class="profile-hero__avatar">
            <span class="text-h4 text-white font-weight-bold">{{ initials }}</span>
          </VAvatar>
          <div class="d-flex ga-2 flex-wrap">
            <VBtn color="primary" variant="outlined" prepend-icon="mdi-share-variant-outline" :to="{ name: 'public-resume', params: { token: 'me' } }">
              مشاركة الملف
            </VBtn>
            <VBtn color="accent" prepend-icon="mdi-pencil" @click="openEdit">تعديل</VBtn>
          </div>
        </div>

        <!-- Name & identity — on the card surface, clear of the banner -->
        <div class="mt-3">
          <div class="d-flex align-center ga-2 flex-wrap">
            <h1 class="text-h5 font-weight-bold mb-0">{{ user?.name }}</h1>
            <VTooltip text="هوية موثّقة" location="top">
              <template #activator="{ props }">
                <VIcon v-bind="props" icon="mdi-check-decagram" color="primary" size="22" />
              </template>
            </VTooltip>
          </div>
          <div class="text-body-2 text-medium-emphasis mt-1">{{ profile.headline }}</div>
          <div class="d-flex align-center ga-2 mt-2 flex-wrap">
            <VChip size="small" color="primary" variant="tonal" prepend-icon="mdi-shield-account-outline" label>{{ roleLabel }}</VChip>
            <VChip size="small" :color="trust.level.color" variant="tonal" prepend-icon="mdi-star-check-outline" label>
              ثقة {{ trust.score }}% · {{ trust.level.label }}
            </VChip>
          </div>
        </div>

        <p class="text-body-2 text-medium-emphasis mt-4 mb-0" style="max-width: 720px">{{ profile.summary }}</p>

        <!-- At-a-glance stat strip -->
        <VRow class="mt-4" dense>
          <VCol v-for="s in heroStats" :key="s.label" cols="6" md="3">
            <div class="stat-tile d-flex align-center ga-3 pa-3">
              <VAvatar :color="s.color" variant="tonal" size="42" rounded="lg">
                <VIcon :icon="s.icon" size="22" />
              </VAvatar>
              <div>
                <div class="text-h6 font-weight-bold lh-1">{{ s.value }}</div>
                <div class="text-caption text-medium-emphasis">{{ s.label }}</div>
              </div>
            </div>
          </VCol>
        </VRow>

        <!-- Profile completion -->
        <div class="mt-4">
          <div class="d-flex justify-space-between text-caption mb-1">
            <span class="text-medium-emphasis">اكتمال الملف الشخصي</span>
            <span class="font-weight-bold text-primary">{{ profileCompletion }}%</span>
          </div>
          <VProgressLinear :model-value="profileCompletion" color="primary" bg-color="surface-variant" height="8" rounded />
        </div>
      </VCardText>
    </VCard>

    <!-- Trust score -->
    <div class="mb-5">
      <TrustScoreCard />
    </div>

    <VTabs v-model="tab" color="primary" class="mb-4" show-arrows>
      <VTab value="skills" prepend-icon="mdi-star-outline">المهارات</VTab>
      <VTab value="experience" prepend-icon="mdi-briefcase-outline">الخبرات</VTab>
      <VTab value="certificates" prepend-icon="mdi-certificate-outline">الشهادات</VTab>
      <VTab value="endorsements" prepend-icon="mdi-account-star-outline">التوصيات</VTab>
      <VTab value="resumes" prepend-icon="mdi-file-account-outline">السير الذاتية</VTab>
      <VTab value="interviews" prepend-icon="mdi-account-tie-voice-outline">المقابلات</VTab>
      <VTab value="reviews" prepend-icon="mdi-star-outline">
        التقييمات
        <VChip v-if="reviewsCount" size="x-small" color="amber" class="ms-1" label>{{ reviewsCount }}</VChip>
      </VTab>
      <VTab value="privacy" prepend-icon="mdi-shield-lock-outline">الخصوصية</VTab>
    </VTabs>

    <VWindow v-model="tab">
      <!-- Skills -->
      <VWindowItem value="skills">
        <VCard class="pa-5">
          <div class="d-flex justify-space-between mb-1">
            <h3 class="text-subtitle-1 font-weight-bold">المهارات الموثّقة ({{ profile.skills.length }})</h3>
            <VBtn color="accent" size="small" prepend-icon="mdi-plus" @click="skillDialog = true">إضافة مهارة</VBtn>
          </div>
          <p class="text-caption text-medium-emphasis mb-4">كل مهارة مدعومة بإثباتات (اختبار، توصية، مشروع، شهادة) تحدّد نسبة الثقة والمستوى</p>

          <!-- AI skill-gap insight -->
          <VAlert v-if="skillInsight" color="secondary" variant="tonal" density="comfortable" class="mb-4" border="start">
            <template #prepend>
              <VIcon icon="mdi-robot-happy-outline" />
            </template>
            <div class="d-flex align-center justify-space-between flex-wrap ga-2">
              <span class="text-body-2">{{ skillInsight.message }}</span>
              <VBtn size="x-small" color="accent" variant="flat" prepend-icon="mdi-account-tie-voice-outline" :to="{ name: 'interviews' }">
                أثبت الآن
              </VBtn>
            </div>
          </VAlert>

          <template v-for="group in skillGroups" :key="group.category?.id ?? 'other'">
            <div class="d-flex align-center ga-2 mt-3 mb-2">
              <VIcon :icon="group.category?.icon ?? 'mdi-shape-outline'" :color="group.category?.color ?? 'medium-emphasis'" size="20" />
              <span class="text-subtitle-2 font-weight-bold">{{ group.category?.label ?? 'أخرى' }}</span>
              <VChip size="x-small" variant="tonal" label>{{ group.skills.length }}</VChip>
            </div>
            <VRow dense>
              <VCol v-for="skill in group.skills" :key="skill.id" cols="12" md="6">
                <VCard variant="outlined" class="pa-3 h-100">
                  <div class="d-flex justify-space-between align-center mb-2">
                    <div class="d-flex align-center ga-2">
                      <span class="text-body-1 font-weight-bold">{{ skill.name }}</span>
                      <VChip size="x-small" :color="confidenceColor(skillConfidence(skill))" label>{{ levelOf(skill) }}</VChip>
                    </div>
                    <div class="d-flex align-center ga-1">
                      <VBtn icon="mdi-plus" variant="text" size="x-small" color="accent" @click="openAddProof(skill)" />
                      <VBtn icon="mdi-information-outline" variant="text" size="x-small" @click="openDetail(skill)" />
                      <VBtn icon="mdi-delete-outline" variant="text" size="x-small" color="error" @click="profile.removeSkill(skill.id)" />
                    </div>
                  </div>

                  <!-- Proof source icons -->
                  <div class="d-flex align-center ga-1 mb-2 flex-wrap">
                    <VTooltip v-for="p in skill.proofs" :key="p.id" :text="`${PROOF_META[p.type].label}: ${p.label}`" location="top">
                      <template #activator="{ props }">
                        <VAvatar v-bind="props" :color="PROOF_META[p.type].color" variant="tonal" size="26" class="cursor-pointer" @click="openDetail(skill)">
                          <VIcon :icon="PROOF_META[p.type].icon" size="15" />
                        </VAvatar>
                      </template>
                    </VTooltip>
                    <VBtn variant="text" size="x-small" color="secondary" prepend-icon="mdi-account-star-outline" class="ms-1" @click="requestEndorsementProof(skill)">
                      طلب إثبات
                    </VBtn>
                  </div>

                  <!-- Confidence bar -->
                  <div class="d-flex justify-space-between text-caption mb-1">
                    <span class="text-medium-emphasis">نسبة الثقة</span>
                    <span class="font-weight-bold" :class="`text-${confidenceColor(skillConfidence(skill))}`">{{ skillConfidence(skill) }}%</span>
                  </div>
                  <VProgressLinear :model-value="skillConfidence(skill)" :color="confidenceColor(skillConfidence(skill))" height="8" rounded />
                </VCard>
              </VCol>
            </VRow>
          </template>
          <div v-if="!profile.skills.length" class="text-center text-medium-emphasis py-6">لا مهارات بعد — أضف أول مهارة</div>
        </VCard>
      </VWindowItem>

      <!-- Experience -->
      <VWindowItem value="experience">
        <VCard class="pa-5">
          <div class="d-flex justify-space-between mb-4">
            <h3 class="text-subtitle-1 font-weight-bold">الخبرات العملية ({{ profile.experiences.length }})</h3>
            <VBtn color="accent" size="small" prepend-icon="mdi-plus" @click="expDialog = true">إضافة خبرة</VBtn>
          </div>
          <VRow dense>
            <VCol v-for="exp in profile.experiences" :key="exp.id" cols="12" md="6">
              <VCard variant="outlined" class="pa-3 h-100 d-flex">
                <VAvatar color="primary" variant="tonal" rounded="lg" class="me-3 flex-shrink-0"><VIcon icon="mdi-briefcase-outline" /></VAvatar>
                <div class="flex-grow-1">
                  <div class="text-subtitle-2 font-weight-bold">{{ exp.title }}</div>
                  <div class="text-body-2 text-secondary">{{ exp.company }} · {{ exp.period }}</div>
                  <div class="text-body-2 text-medium-emphasis mt-1">{{ exp.desc }}</div>
                </div>
                <VBtn icon="mdi-delete-outline" variant="text" size="x-small" color="error" class="flex-shrink-0" @click="profile.removeExperience(exp.id)" />
              </VCard>
            </VCol>
          </VRow>
          <div v-if="!profile.experiences.length" class="text-center text-medium-emphasis py-6">لا خبرات بعد — أضف أول خبرة</div>
        </VCard>
      </VWindowItem>

      <!-- Certificates -->
      <VWindowItem value="certificates">
        <VCard class="pa-5">
          <div class="d-flex justify-space-between mb-4">
            <h3 class="text-subtitle-1 font-weight-bold">الشهادات والدورات ({{ profile.certificates.length }})</h3>
            <VBtn color="accent" size="small" prepend-icon="mdi-plus" @click="certDialog = true">إضافة</VBtn>
          </div>
          <VRow>
            <VCol v-for="cert in profile.certificates" :key="cert.id" cols="12" sm="6">
              <VCard variant="outlined" class="pa-3 d-flex align-center ga-3">
                <VAvatar color="success" variant="tonal" rounded="lg"><VIcon icon="mdi-certificate-outline" /></VAvatar>
                <div class="flex-grow-1">
                  <div class="text-body-2 font-weight-bold">{{ cert.name }}</div>
                  <div class="text-caption text-medium-emphasis">{{ cert.issuer }} · {{ cert.date }}</div>
                </div>
                <VBtn icon="mdi-delete-outline" variant="text" size="x-small" color="error" @click="profile.removeCertificate(cert.id)" />
              </VCard>
            </VCol>
          </VRow>
        </VCard>
      </VWindowItem>

      <!-- Endorsements -->
      <VWindowItem value="endorsements">
        <VCard class="pa-5">
          <div class="d-flex justify-space-between mb-4">
            <h3 class="text-subtitle-1 font-weight-bold">التوصيات والتزكيات</h3>
            <VBtn color="accent" size="small" prepend-icon="mdi-plus" @click="requestEndorsement">طلب توصية</VBtn>
          </div>
          <VRow>
            <VCol v-for="e in endorsements" :key="e.name" cols="12" sm="6">
              <VCard variant="outlined" class="pa-3">
                <div class="d-flex align-center ga-3">
                  <VAvatar color="secondary" variant="tonal"><VIcon icon="mdi-account" /></VAvatar>
                  <div class="flex-grow-1">
                    <div class="text-body-2 font-weight-bold">
                      {{ e.name }}
                      <VIcon v-if="e.trusted" icon="mdi-check-decagram" color="success" size="16" />
                    </div>
                    <div class="text-caption text-medium-emphasis">{{ e.relation }}</div>
                  </div>
                  <VChip size="x-small" label prepend-icon="mdi-format-quote-close">{{ e.type }}</VChip>
                </div>
              </VCard>
            </VCol>
          </VRow>
        </VCard>
      </VWindowItem>

      <!-- Resumes -->
      <VWindowItem value="resumes">
        <VCard class="pa-5">
          <div class="d-flex justify-space-between mb-4">
            <h3 class="text-subtitle-1 font-weight-bold">السير الذاتية المنشأة ({{ resumesStore.count }})</h3>
            <VBtn color="accent" size="small" prepend-icon="mdi-plus" :to="{ name: 'resume-builder' }">إنشاء سيرة</VBtn>
          </div>
          <VList>
            <VListItem v-for="r in resumesStore.resumes" :key="r.id" class="px-2">
              <template #prepend>
                <VAvatar :color="r.active ? 'success' : 'primary'" variant="tonal" rounded="lg"><VIcon icon="mdi-file-account-outline" /></VAvatar>
              </template>
              <VListItemTitle class="font-weight-bold">
                {{ r.name }}
                <VChip v-if="r.active" color="success" size="x-small" label class="ms-1">نشطة</VChip>
              </VListItemTitle>
              <VListItemSubtitle>{{ r.template }} · {{ r.language }} · أُنشئت {{ r.createdAt }}</VListItemSubtitle>
              <template #append>
                <VBtn v-if="!r.active" variant="tonal" color="success" size="x-small" class="me-1" @click="resumesStore.setActive(r.id)">تعيين كنشطة</VBtn>
                <VBtn icon="mdi-open-in-new" variant="text" size="small" :to="{ name: 'public-resume', params: { token: String(r.id) } }" />
                <VMenu>
                  <template #activator="{ props }">
                    <VBtn v-bind="props" icon="mdi-dots-vertical" variant="text" size="small" />
                  </template>
                  <VList density="compact">
                    <VListItem prepend-icon="mdi-pencil" title="تعديل" :to="{ name: 'resume-builder' }" />
                    <VListItem prepend-icon="mdi-file-pdf-box" title="تصدير PDF" @click="exportResume(r.name, 'PDF')" />
                    <VListItem prepend-icon="mdi-share-variant" title="مشاركة الرابط" @click="shareResume(r.id)" />
                    <VListItem prepend-icon="mdi-delete-outline" title="حذف" base-color="error" @click="resumesStore.remove(r.id)" />
                  </VList>
                </VMenu>
              </template>
            </VListItem>
          </VList>
          <div v-if="!resumesStore.count" class="text-center text-medium-emphasis py-6">لا سير ذاتية بعد — أنشئ أول سيرة</div>
        </VCard>
      </VWindowItem>

      <!-- Interviews -->
      <VWindowItem value="interviews">
        <VCard class="pa-5">
          <div class="d-flex justify-space-between mb-4">
            <h3 class="text-subtitle-1 font-weight-bold">المقابلات المُنجزة ({{ interviewsStore.completed.length }})</h3>
            <VBtn color="accent" size="small" prepend-icon="mdi-plus" :to="{ name: 'interviews' }">مقابلة جديدة</VBtn>
          </div>
          <VList v-if="interviewsStore.completed.length" lines="two" class="py-0">
            <VListItem v-for="iv in interviewsStore.completed" :key="iv.id" :to="{ name: 'interview-result', params: { id: iv.id } }">
              <template #prepend>
                <VAvatar color="success" variant="tonal" rounded="lg"><VIcon :icon="TYPE_META[iv.type].icon" /></VAvatar>
              </template>
              <VListItemTitle class="font-weight-bold">{{ TYPE_META[iv.type].label }} · {{ LEVEL_META[iv.level].label }}</VListItemTitle>
              <VListItemSubtitle>{{ iv.date }} · النتيجة {{ iv.result?.score }}% ({{ iv.result?.level }})</VListItemSubtitle>
              <template #append>
                <VChip color="success" size="small" label>{{ iv.result?.score }}%</VChip>
              </template>
            </VListItem>
          </VList>
          <div v-else class="text-center text-medium-emphasis py-6">
            لا مقابلات بعد — أجرِ مقابلة AI لتحديد مستواك ورفع نسبة ثقتك
          </div>

          <!-- Certified-interviewer reports -->
          <template v-if="certifiedReports.length">
            <VDivider class="my-4" />
            <div class="d-flex align-center ga-2 mb-3">
              <VIcon icon="mdi-account-tie" color="secondary" />
              <h3 class="text-subtitle-1 font-weight-bold">تقارير المقيّمين المعتمدين ({{ certifiedReports.length }})</h3>
            </div>
            <VCard v-for="b in certifiedReports" :key="b.id" variant="outlined" class="pa-3 mb-2">
              <div class="d-flex align-center justify-space-between flex-wrap ga-2">
                <div>
                  <div class="text-body-2 font-weight-bold">{{ b.interviewerName }} · {{ KIND_META[b.kind].label }}</div>
                  <div class="text-caption text-medium-emphasis">{{ b.datetime }} · المستوى {{ b.report?.level }}</div>
                </div>
                <div class="d-flex align-center ga-2">
                  <VChip color="success" size="small" label>{{ b.report?.overall }}%</VChip>
                  <VBtn size="x-small" color="secondary" variant="tonal" prepend-icon="mdi-certificate-outline" @click="openCertificate(b)">الشهادة</VBtn>
                </div>
              </div>
            </VCard>
          </template>
        </VCard>
      </VWindowItem>

      <!-- Reviews (about the candidate) -->
      <VWindowItem value="reviews">
        <VCard class="pa-5">
          <div class="d-flex align-center ga-2 mb-1">
            <VIcon icon="mdi-star-check-outline" color="amber" />
            <h3 class="text-subtitle-1 font-weight-bold">تقييمات المقيّمين عنك</h3>
          </div>
          <p class="text-caption text-medium-emphasis mb-4">تقييمات علنية موثّقة من المقيّمين المعتمدين — يمكنك الرد مرة واحدة على كل تقييم.</p>
          <ReviewsPanel direction="toCandidate" subject-id="me" subject-name="أنت" can-reply />
        </VCard>
      </VWindowItem>

      <!-- Privacy -->
      <VWindowItem value="privacy">
        <VCard class="pa-5">
          <h3 class="text-subtitle-1 font-weight-bold mb-4">إعدادات الخصوصية</h3>
          <div v-for="(s, i) in privacySettings" :key="i" class="d-flex align-center justify-space-between flex-wrap ga-2 py-2">
            <span class="text-body-2">{{ s.label }}</span>
            <VBtnToggle v-model="s.value" mandatory density="compact" color="primary" variant="outlined">
              <VBtn v-for="opt in privacyOptions" :key="opt.value" :value="opt.value" size="small">{{ opt.title }}</VBtn>
            </VBtnToggle>
          </div>
          <VDivider class="my-2" />
          <div class="d-flex align-center justify-space-between py-1">
            <span class="text-body-2">السماح للآخرين بطلب إثبات مهارة مني</span>
            <VSwitch v-model="proofRequestEnabled" color="secondary" hide-details density="compact" />
          </div>
          <div class="d-flex align-center justify-space-between py-1">
            <span class="text-body-2">إتاحة نتائج مقابلاتي للجهات</span>
            <VSwitch v-model="interviewsForCompanies" color="secondary" hide-details density="compact" />
          </div>
          <div class="d-flex align-center justify-space-between py-1">
            <span class="text-body-2">السماح للمقيّمين بطلب إجراء مقابلة معي</span>
            <VSwitch v-model="interviewerRequestsEnabled" color="secondary" hide-details density="compact" />
          </div>
        </VCard>
      </VWindowItem>
    </VWindow>

    <!-- Add skill dialog -->
    <VDialog v-model="skillDialog" max-width="420">
      <VCard class="pa-2">
        <VCardTitle>إضافة مهارة</VCardTitle>
        <VCardText>
          <VSelect v-model="newSkillCategory" :items="categoryOptions" label="التصنيف" clearable class="mb-3" />
          <VCombobox
            v-model="newSkillName"
            :items="categorySkillSuggestions"
            label="اسم المهارة"
            :hint="newSkillCategory ? 'اختر من الاقتراحات أو اكتب مهارة جديدة' : 'اختر تصنيفًا لاقتراح مهارات، أو اكتب مباشرة'"
            persistent-hint
            class="mb-3"
          />
          <div class="text-body-2 mb-1">المستوى</div>
          <VRating v-model="newSkillLevel" color="accent" />
        </VCardText>
        <VCardActions class="justify-end">
          <VBtn variant="text" @click="skillDialog = false">إلغاء</VBtn>
          <VBtn color="accent" :disabled="!newSkillName.trim()" @click="saveSkill">إضافة</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Add proof dialog -->
    <VDialog v-model="proofDialog" max-width="460">
      <VCard class="pa-2">
        <VCardTitle>إضافة إثبات لمهارة «{{ proofSkill?.name }}»</VCardTitle>
        <VCardText>
          <VSelect v-model="proofType" :items="proofTypeOptions" label="نوع الإثبات" class="mb-2" />
          <VTextField v-model="proofLabel" label="الوصف / المرجع" placeholder="مثال: اختبار Vue — 90% أو رابط مشروع" />
          <VAlert type="info" variant="tonal" density="compact" class="mt-2 text-caption">
            كل إثبات يرفع نسبة الثقة في المهارة حسب قوته.
          </VAlert>
        </VCardText>
        <VCardActions class="justify-end">
          <VBtn variant="text" @click="proofDialog = false">إلغاء</VBtn>
          <VBtn color="accent" :disabled="!proofLabel.trim()" @click="saveProof">إضافة الإثبات</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Skill detail dialog -->
    <VDialog v-model="detailDialog" max-width="480">
      <VCard v-if="detailSkill" class="pa-2">
        <VCardTitle class="d-flex justify-space-between align-center">
          <span>{{ detailSkill.name }}</span>
          <VChip size="small" :color="confidenceColor(skillConfidence(detailSkill))" label>
            {{ levelOf(detailSkill) }} · {{ skillConfidence(detailSkill) }}%
          </VChip>
        </VCardTitle>
        <VCardText>
          <!-- AI rationale for the confidence score -->
          <VAlert color="secondary" variant="tonal" density="compact" class="mb-3" border="start">
            <template #prepend>
              <VIcon icon="mdi-robot-happy-outline" size="20" />
            </template>
            <span class="text-caption">{{ skillRationale }}</span>
          </VAlert>

          <div class="text-body-2 font-weight-bold mb-2">مصادر الإثبات ({{ detailSkill.proofs.length }})</div>
          <VTimeline side="end" density="compact" align="start">
            <VTimelineItem v-for="p in detailSkill.proofs" :key="p.id" :dot-color="PROOF_META[p.type].color" size="x-small">
              <div class="d-flex align-center justify-space-between">
                <div>
                  <VChip size="x-small" :color="PROOF_META[p.type].color" variant="tonal" :prepend-icon="PROOF_META[p.type].icon" class="mb-1">
                    {{ PROOF_META[p.type].label }} (+{{ PROOF_META[p.type].weight }})
                  </VChip>
                  <div class="text-body-2">{{ p.label }}</div>
                </div>
                <span class="text-caption text-medium-emphasis">{{ p.date }}</span>
              </div>
            </VTimelineItem>
          </VTimeline>
          <VBtn color="accent" variant="tonal" size="small" block prepend-icon="mdi-plus" @click="detailDialog = false; openAddProof(detailSkill)">
            إضافة إثبات جديد
          </VBtn>
        </VCardText>
      </VCard>
    </VDialog>

    <VSnackbar :model-value="!!proofSnackbar" color="secondary" timeout="4000" @update:model-value="proofSnackbar = ''">
      {{ proofSnackbar }}
    </VSnackbar>

    <VSnackbar :model-value="!!toastMsg" color="primary" location="top" timeout="3500" @update:model-value="toastMsg = ''">
      {{ toastMsg }}
    </VSnackbar>

    <!-- Edit profile dialog -->
    <VDialog v-model="editDialog" max-width="520">
      <VCard class="pa-2">
        <VCardTitle class="d-flex justify-space-between align-center">
          <span>تعديل الملف الشخصي</span>
          <VBtn icon="mdi-close" variant="text" size="small" @click="editDialog = false" />
        </VCardTitle>
        <VCardText>
          <VTextField v-model="editForm.headline" label="العنوان المهني" placeholder="مثال: مطوّر واجهات أمامية · الرياض" class="mb-3" />
          <VTextarea v-model="editForm.summary" label="النبذة التعريفية" rows="4" auto-grow />
        </VCardText>
        <VCardActions class="justify-end">
          <VBtn variant="text" @click="editDialog = false">إلغاء</VBtn>
          <VBtn color="accent" prepend-icon="mdi-content-save" @click="saveEdit">حفظ</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Digital certificate dialog -->
    <VDialog v-model="certificateDialog" max-width="560">
      <VCard v-if="certificateReport" class="pa-0 overflow-hidden">
        <div class="brand-gradient pa-5 text-center" style="color: white">
          <VIcon icon="mdi-certificate" size="44" />
          <div class="text-h6 font-weight-bold mt-1">شهادة اجتياز مقابلة تقييمية</div>
          <div class="text-caption" style="opacity: 0.85">منظومة التوظيف الذكية · موثّقة</div>
        </div>
        <VCardText class="text-center pt-5">
          <div class="text-body-2 text-medium-emphasis mb-1">تشهد المنصة بأن</div>
          <div class="text-h6 font-weight-bold mb-3">{{ user?.name }}</div>
          <div class="text-body-2 text-medium-emphasis mb-1">اجتاز</div>
          <div class="text-subtitle-1 font-weight-bold">{{ KIND_META[certificateReport.kind].label }}</div>
          <div class="text-body-2 mb-3">بإشراف المقيّم المعتمد «{{ certificateReport.interviewerName }}»</div>

          <div class="d-flex justify-center ga-6 my-4">
            <div>
              <div class="text-h5 font-weight-bold text-success">{{ certificateReport.report?.overall }}%</div>
              <div class="text-caption text-medium-emphasis">التقييم العام</div>
            </div>
            <VDivider vertical />
            <div>
              <div class="text-h5 font-weight-bold text-primary">{{ certificateReport.report?.level }}</div>
              <div class="text-caption text-medium-emphasis">المستوى المُحدَّد</div>
            </div>
            <VDivider vertical />
            <div>
              <div class="text-h5 font-weight-bold text-accent">+{{ certificateReport.report?.trustGain }}%</div>
              <div class="text-caption text-medium-emphasis">أثر الثقة</div>
            </div>
          </div>

          <div class="text-caption text-medium-emphasis">
            <VIcon icon="mdi-shield-check" size="14" color="success" /> رقم التوثيق: SR-{{ certificateReport.id }}-{{ certificateReport.report?.overall }} · {{ certificateReport.datetime }}
          </div>
        </VCardText>
        <VCardActions class="justify-end px-4 pb-3">
          <VBtn variant="text" @click="certificateDialog = false">إغلاق</VBtn>
          <VBtn color="accent" prepend-icon="mdi-download" @click="toast('جارٍ تنزيل الشهادة الرقمية...')">تنزيل الشهادة</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Add experience dialog -->
    <VDialog v-model="expDialog" max-width="480">
      <VCard class="pa-2">
        <VCardTitle>إضافة خبرة</VCardTitle>
        <VCardText>
          <VTextField v-model="newExp.title" label="المسمى الوظيفي" class="mb-2" />
          <VTextField v-model="newExp.company" label="الشركة" class="mb-2" />
          <VTextField v-model="newExp.period" label="الفترة" placeholder="مثال: 2020 - 2023" class="mb-2" />
          <VTextarea v-model="newExp.desc" label="الوصف" rows="2" />
        </VCardText>
        <VCardActions class="justify-end">
          <VBtn variant="text" @click="expDialog = false">إلغاء</VBtn>
          <VBtn color="accent" :disabled="!newExp.title.trim()" @click="saveExp">إضافة</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Add certificate dialog -->
    <VDialog v-model="certDialog" max-width="440">
      <VCard class="pa-2">
        <VCardTitle>إضافة شهادة</VCardTitle>
        <VCardText>
          <VTextField v-model="newCert.name" label="اسم الشهادة" class="mb-2" />
          <VTextField v-model="newCert.issuer" label="الجهة المانحة" class="mb-2" />
          <VTextField v-model="newCert.date" label="السنة" placeholder="مثال: 2024" />
        </VCardText>
        <VCardActions class="justify-end">
          <VBtn variant="text" @click="certDialog = false">إلغاء</VBtn>
          <VBtn color="accent" :disabled="!newCert.name.trim()" @click="saveCert">إضافة</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
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
.lh-1 {
  line-height: 1.15;
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
