import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { Opportunity } from '@/modules/opportunities/interfaces/Opportunity'
import { syncPrivateDoc } from '@/services/cloudSync'

export type ApplicationStatus = 'submitted' | 'reviewing' | 'interview' | 'rejected' | 'accepted'

export interface Application {
  id: number
  opportunityId: number
  title: string
  company: string
  companyInitial: string
  appliedAt: string
  status: ApplicationStatus
  resume: string
}

const STORAGE_KEY = 'applications'

const seed: Application[] = [
  { id: 1, opportunityId: 1, title: 'مطوّر واجهات أمامية (Vue.js)', company: 'شركة تقنية المستقبل', companyInitial: 'ت', appliedAt: 'قبل يومين', status: 'interview', resume: 'سيرة تقنية - حديث' },
  { id: 2, opportunityId: 2, title: 'مهندس ذكاء اصطناعي', company: 'مجموعة الابتكار الرقمي', companyInitial: 'ا', appliedAt: 'قبل 3 أيام', status: 'reviewing', resume: 'سيرة تقنية - حديث' },
  { id: 3, opportunityId: 4, title: 'محلل بيانات أول', company: 'بنك المعرفة', companyInitial: 'ب', appliedAt: 'قبل أسبوع', status: 'submitted', resume: 'Technical CV - Modern' },
  { id: 4, opportunityId: 5, title: 'مدير تسويق رقمي', company: 'علامة تجارية ناشئة', companyInitial: 'ع', appliedAt: 'قبل أسبوعين', status: 'rejected', resume: 'سيرة تقنية - حديث' },
]

function load(): Application[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw)
    return [...seed]
  try {
    return JSON.parse(raw) as Application[]
  }
  catch {
    return [...seed]
  }
}

export const useApplicationsStore = defineStore('applications', () => {
  const applications = ref<Application[]>(load())

  watch(applications, val => localStorage.setItem(STORAGE_KEY, JSON.stringify(val)), { deep: true })

  // مزامنة سحابية خاصة — بجلسة حقيقية فقط (DOC/CLOUD_SYNC.md)
  const { status: syncStatus } = syncPrivateDoc({
    store: 'applications',
    snapshot: () => applications.value,
    apply: (incoming) => {
      if (Array.isArray(incoming))
        applications.value = incoming as Application[]
    },
    source: applications,
  })

  const count = computed(() => applications.value.length)
  const byStatus = (status: ApplicationStatus) => applications.value.filter(a => a.status === status)

  function hasApplied(opportunityId: number): boolean {
    return applications.value.some(a => a.opportunityId === opportunityId)
  }

  function apply(opportunity: Opportunity, resume: string) {
    if (hasApplied(opportunity.id))
      return
    applications.value.unshift({
      id: Date.now(),
      opportunityId: opportunity.id,
      title: opportunity.title,
      company: opportunity.company,
      companyInitial: opportunity.companyInitial,
      appliedAt: 'الآن',
      status: 'submitted',
      resume,
    })
  }

  function withdraw(id: number) {
    applications.value = applications.value.filter(a => a.id !== id)
  }

  return { applications, syncStatus, count, byStatus, hasApplied, apply, withdraw }
})
