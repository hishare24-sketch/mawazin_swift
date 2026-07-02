// Frontend mirrors of the planned backend role-profile tables
// (seeker_profiles / interviewer_profiles / employer_profiles).
// Field names match the SQL schema 1:1 to ease the Laravel hookup later.

export type SeekerAvailability = 'immediate' | 'within_month' | 'within_three_months' | 'not_available'

/** تفضيلات دور الباحث — الجزء غير الموجود أصلًا في ProfileStore */
export interface SeekerPrefs {
  location: string
  availability: SeekerAvailability
  expected_salary: number | null
  preferred_employment_types: string[]
  preferred_fields: string[]
  preferred_locations: string[]
  self_offer_active: boolean
}

export type RoleVisibility = 'public' | 'private'

export interface InterviewerProfile {
  specializations: string[]
  hourly_rate: number
  interview_types: string[]
  total_interviews: number
  average_rating: number
  total_earnings: number
  certificates: string[]
  endorsements: string[]
  is_approved: boolean
  /** خصوصية الدور: عام (يظهر في سوق المقيّمين) / خاص */
  visibility: RoleVisibility
  /** إشعارات طلبات التقييم الجديدة */
  notifications_enabled: boolean
}

export type CompanySize = '1-10' | '11-50' | '51-200' | '201-500' | '500+'

export interface EmployerProfile {
  company_name: string
  company_logo: string
  company_website: string
  industry: string
  company_size: CompanySize | ''
  company_description: string
  is_verified: boolean
  total_opportunities: number
  average_rating: number
  /** خصوصية الدور: عام (تظهر الشركة للمرشحين) / خاص */
  visibility: RoleVisibility
  /** إشعارات المتقدمين الجدد */
  notifications_enabled: boolean
}
