import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { EmployerProfile, InterviewerProfile } from '@/interfaces/RoleProfiles'

const INTERVIEWER_KEY = 'interviewerProfile'
const EMPLOYER_KEY = 'employerProfile'
const LINK_KEY = 'linkRolesPublicly'

const interviewerSeed: InterviewerProfile = {
  specializations: [],
  hourly_rate: 0,
  interview_types: [],
  total_interviews: 0,
  average_rating: 0,
  total_earnings: 0,
  certificates: [],
  endorsements: [],
  is_approved: false,
  visibility: 'public',
  notifications_enabled: true,
}

const employerSeed: EmployerProfile = {
  company_name: '',
  company_logo: '',
  company_website: '',
  industry: '',
  company_size: '',
  company_description: '',
  is_verified: false,
  total_opportunities: 0,
  average_rating: 0,
  visibility: 'public',
  notifications_enabled: true,
}

function load<T>(key: string, seed: T): T {
  const raw = localStorage.getItem(key)
  if (!raw)
    return structuredClone(seed)
  try {
    // Merge over the seed so drafts (e.g. the role-switcher's employer form)
    // and older shapes pick up any newly added fields
    return { ...structuredClone(seed), ...JSON.parse(raw) } as T
  }
  catch {
    return structuredClone(seed)
  }
}

/**
 * ملفات الأدوار المهنية (المقيّم/الجهة) — تقابل interviewer_profiles
 * وemployer_profiles في المخطط الخلفي. ملف الباحث يبقى في ProfileStore.
 */
export const useRoleProfilesStore = defineStore('roleProfiles', () => {
  const interviewer = ref<InterviewerProfile>(load(INTERVIEWER_KEY, interviewerSeed))
  const employer = ref<EmployerProfile>(load(EMPLOYER_KEY, employerSeed))
  // نظام السمعة الموحّدة: إظهار علاقة المستخدم بأدواره الأخرى (doc §4.3)
  const linkRolesPublicly = ref(localStorage.getItem(LINK_KEY) !== 'false')

  watch(interviewer, v => localStorage.setItem(INTERVIEWER_KEY, JSON.stringify(v)), { deep: true })
  watch(employer, v => localStorage.setItem(EMPLOYER_KEY, JSON.stringify(v)), { deep: true })
  watch(linkRolesPublicly, v => localStorage.setItem(LINK_KEY, String(v)))

  const interviewerCompletion = computed(() => {
    let score = 0
    if (interviewer.value.specializations.length)
      score += 30
    if (interviewer.value.hourly_rate > 0)
      score += 20
    if (interviewer.value.interview_types.length)
      score += 25
    if (interviewer.value.certificates.length)
      score += 25
    return score
  })

  const employerCompletion = computed(() => {
    let score = 0
    if (employer.value.company_name)
      score += 30
    if (employer.value.industry)
      score += 20
    if (employer.value.company_size)
      score += 15
    if (employer.value.company_description)
      score += 20
    if (employer.value.company_website)
      score += 15
    return score
  })

  function updateInterviewer(patch: Partial<InterviewerProfile>) {
    interviewer.value = { ...interviewer.value, ...patch }
  }

  function updateEmployer(patch: Partial<EmployerProfile>) {
    employer.value = { ...employer.value, ...patch }
  }

  return {
    interviewer,
    employer,
    linkRolesPublicly,
    interviewerCompletion,
    employerCompletion,
    updateInterviewer,
    updateEmployer,
  }
})
