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

  // Admin
  { title: 'dashboard', icon: 'mdi-view-dashboard-outline', to: 'admin-dashboard', roles: ['admin'] },
  { title: 'users', icon: 'mdi-account-multiple-outline', to: 'admin-users', roles: ['admin'] },
  { title: 'team', icon: 'mdi-shield-account-outline', to: 'admin-roles', roles: ['admin'] },

  // Endorser
  { title: 'dashboard', icon: 'mdi-view-dashboard-outline', to: 'endorser-home', roles: ['endorser'] },
  { title: 'endorsements', icon: 'mdi-account-star-outline', to: 'add-endorsement', roles: ['endorser'] },

  // Seeker
  { title: 'profile', icon: 'mdi-account-circle-outline', to: 'profile', roles: ['seeker'] },
  { title: 'opportunities', icon: 'mdi-briefcase-search-outline', to: 'opportunities', roles: ['seeker'] },
  { title: 'applications', icon: 'mdi-file-send-outline', to: 'applications', roles: ['seeker'] },
  { title: 'wishes', icon: 'mdi-hand-heart-outline', to: 'wishes', roles: ['seeker'] },
  { title: 'assessments', icon: 'mdi-clipboard-check-outline', to: 'assessments', roles: ['seeker'] },
  { title: 'resumeBuilder', icon: 'mdi-file-account-outline', to: 'resume-builder', roles: ['seeker'] },
  { title: 'assistant', icon: 'mdi-robot-happy-outline', to: 'assistant', roles: ['seeker', 'company'] },

  // Company
  { title: 'createOpportunity', icon: 'mdi-briefcase-plus-outline', to: 'create-opportunity', roles: ['company'] },
  { title: 'candidates', icon: 'mdi-account-group-outline', to: 'candidates', roles: ['company'] },
  { title: 'wishes', icon: 'mdi-hand-heart-outline', to: 'company-wishes', roles: ['company'] },
  { title: 'analytics', icon: 'mdi-chart-box-outline', to: 'analytics', roles: ['company'] },

  // Shared (admin + company)
  { title: 'surveys', icon: 'mdi-poll', to: 'surveys', roles: ['admin', 'company'] },
]

export function navForRole(role: UserRole | undefined): NavItem[] {
  if (!role)
    return []
  return navItems.filter(item => item.roles.includes(role))
}
