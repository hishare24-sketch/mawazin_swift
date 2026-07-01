export type CandidateStatus = 'new' | 'reviewing' | 'interview' | 'rejected'

export type InterviewLevelLabel = 'لا يوجد' | 'أساسي' | 'متوسط' | 'متقدم' | 'خبير'

export interface Candidate {
  id: number
  name: string
  title: string
  location: string
  matchRate: number
  trustScore: number
  interviewLevel: InterviewLevelLabel
  appliedAt: string
  status: CandidateStatus
  skills: string[]
  experienceYears: number
  level: 'مبتدئ' | 'متوسط' | 'خبير'
  appliedFor: string
  summary?: string
}

export const CANDIDATE_STATUS_META: Record<CandidateStatus, { label: string, color: string }> = {
  new: { label: 'جديد', color: 'accent' },
  reviewing: { label: 'قيد المراجعة', color: 'info' },
  interview: { label: 'مقابلة', color: 'success' },
  rejected: { label: 'مرفوض', color: 'error' },
}
