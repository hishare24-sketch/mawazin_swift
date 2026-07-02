import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useRoleProfilesStore } from './RoleProfilesStore'

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('roleProfilesStore', () => {
  it('adopts the role-switcher employer draft from localStorage', () => {
    localStorage.setItem('employerProfile', JSON.stringify({ company_name: 'شركة تجريبية', industry: 'تقنية' }))
    setActivePinia(createPinia())
    const s = useRoleProfilesStore()
    expect(s.employer.company_name).toBe('شركة تجريبية')
    expect(s.employer.industry).toBe('تقنية')
    // Seed fields absent from the draft are still present
    expect(s.employer.visibility).toBe('public')
    expect(s.employer.notifications_enabled).toBe(true)
  })

  it('computes interviewer profile completion from filled fields', () => {
    const s = useRoleProfilesStore()
    expect(s.interviewerCompletion).toBe(0)
    s.updateInterviewer({ specializations: ['PHP'], hourly_rate: 200 })
    expect(s.interviewerCompletion).toBe(50)
    s.updateInterviewer({ interview_types: ['تقييم مهارات'], certificates: ['AWS'] })
    expect(s.interviewerCompletion).toBe(100)
  })

  it('computes employer profile completion from filled fields', () => {
    const s = useRoleProfilesStore()
    expect(s.employerCompletion).toBe(0)
    s.updateEmployer({ company_name: 'شركة', industry: 'تقنية', company_size: '11-50' })
    expect(s.employerCompletion).toBe(65)
  })

  it('persists updates and the unified-reputation link setting', async () => {
    const s = useRoleProfilesStore()
    s.updateInterviewer({ hourly_rate: 350 })
    s.linkRolesPublicly = false
    await new Promise(r => setTimeout(r, 0)) // let watchers flush
    expect(JSON.parse(localStorage.getItem('interviewerProfile')!).hourly_rate).toBe(350)
    expect(localStorage.getItem('linkRolesPublicly')).toBe('false')
  })
})
