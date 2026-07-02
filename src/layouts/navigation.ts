import type { UserRole } from '@/interfaces/Auth'

export interface NavItem {
  title: string // i18n key under "nav"
  icon: string
  to: string // route name
  roles: UserRole[]
}

// Single source of truth for sidebar items, filtered by role
export const navItems: NavItem[] = [
  { title: 'dashboard', icon: 'mdi-view-dashboard-outline', to: 'dashboard', roles: ['seeker', 'company'] },

  // Wallet — high in the list: money must never hide below the fold
  { title: 'wallet', icon: 'mdi-wallet-outline', to: 'wallet', roles: ['seeker', 'company', 'interviewer', 'endorser', 'admin', 'coach', 'trainer', 'consultant'] },

  // Admin
  { title: 'dashboard', icon: 'mdi-view-dashboard-outline', to: 'admin-dashboard', roles: ['admin'] },
  { title: 'users', icon: 'mdi-account-multiple-outline', to: 'admin-users', roles: ['admin'] },
  { title: 'team', icon: 'mdi-shield-account-outline', to: 'admin-roles', roles: ['admin'] },

  // Endorser
  { title: 'dashboard', icon: 'mdi-view-dashboard-outline', to: 'endorser-home', roles: ['endorser'] },
  { title: 'endorsements', icon: 'mdi-account-star-outline', to: 'add-endorsement', roles: ['endorser'] },

  // Interviewer (certified)
  { title: 'interviewerHome', icon: 'mdi-account-tie', to: 'interviewer-dashboard', roles: ['interviewer'] },
  { title: 'analytics', icon: 'mdi-chart-box-outline', to: 'interviewer-analytics', roles: ['interviewer'] },
  { title: 'assistant', icon: 'mdi-robot-happy-outline', to: 'assistant', roles: ['interviewer', 'coach', 'trainer', 'consultant'] },

  // Ecosystem expert roles
  { title: 'coachHome', icon: 'mdi-compass-outline', to: 'coach-dashboard', roles: ['coach'] },
  { title: 'trainerHome', icon: 'mdi-school-outline', to: 'trainer-dashboard', roles: ['trainer'] },
  { title: 'consultantHome', icon: 'mdi-lightbulb-on-outline', to: 'consultant-dashboard', roles: ['consultant'] },

  // Seeker — ordered by usage priority (doc §1), keeping existing extras
  { title: 'profile', icon: 'mdi-account-circle-outline', to: 'profile', roles: ['seeker'] },
  { title: 'requests', icon: 'mdi-storefront-outline', to: 'requests', roles: ['seeker'] },
  { title: 'opportunities', icon: 'mdi-briefcase-search-outline', to: 'opportunities', roles: ['seeker'] },
  { title: 'interviews', icon: 'mdi-account-tie-voice-outline', to: 'interviews', roles: ['seeker'] },
  { title: 'assessments', icon: 'mdi-clipboard-check-outline', to: 'assessments', roles: ['seeker'] },
  { title: 'achievements', icon: 'mdi-trophy-outline', to: 'achievements', roles: ['seeker'] },
  { title: 'resumeBuilder', icon: 'mdi-file-account-outline', to: 'resume-builder', roles: ['seeker'] },
  { title: 'interviewers', icon: 'mdi-account-supervisor-circle-outline', to: 'interviewers', roles: ['seeker'] },
  { title: 'applications', icon: 'mdi-file-send-outline', to: 'applications', roles: ['seeker'] },
  { title: 'peerRequests', icon: 'mdi-swap-horizontal-circle-outline', to: 'peer-requests', roles: ['seeker', 'company'] },
  { title: 'wishes', icon: 'mdi-hand-heart-outline', to: 'wishes', roles: ['seeker'] },
  { title: 'assistant', icon: 'mdi-robot-happy-outline', to: 'assistant', roles: ['seeker', 'company'] },

  // Company
  { title: 'createOpportunity', icon: 'mdi-briefcase-plus-outline', to: 'create-opportunity', roles: ['company'] },
  { title: 'candidates', icon: 'mdi-account-group-outline', to: 'candidates', roles: ['company'] },
  { title: 'wishes', icon: 'mdi-hand-heart-outline', to: 'company-wishes', roles: ['company'] },
  { title: 'analytics', icon: 'mdi-chart-box-outline', to: 'analytics', roles: ['company'] },
  { title: 'achievements', icon: 'mdi-trophy-outline', to: 'achievements', roles: ['company'] },

  // Shared — survey creation per subscription plan (companies + interviewers + admin)
  { title: 'surveys', icon: 'mdi-poll', to: 'surveys', roles: ['admin', 'company', 'interviewer'] },
  // Participation is open to every user type
  { title: 'surveysParticipate', icon: 'mdi-comment-quote-outline', to: 'surveys-participate', roles: ['seeker', 'company', 'interviewer', 'endorser', 'coach', 'trainer', 'consultant'] },
]

export function navForRole(role: UserRole | undefined): NavItem[] {
  if (!role)
    return []
  return navItems.filter(item => item.roles.includes(role))
}
