import type { UserRole } from '@/interfaces/Auth'

export type NavSection = 'platform' | 'account' | 'role'

export interface NavItem {
  title: string // i18n key under "nav"
  icon: string
  to: string // route name
  roles: UserRole[]
  /**
   * platform = المنصة نفسها (الأسواق والاكتشاف — النافذة قبل المرآة)
   * account = حسابي الموحّد · role = مساحة الدور النشط
   */
  section: NavSection
}

const ALL_ROLES: UserRole[] = ['seeker', 'company', 'interviewer', 'endorser', 'admin', 'coach', 'trainer', 'consultant']

// Single source of truth for sidebar items, filtered by role
export const navItems: NavItem[] = [
  // ===== المنصة — الأسواق والاكتشاف تتصدر: هنا يلتقي العرض بالطلب =====
  { title: 'discover', icon: 'mdi-telescope', to: 'search', roles: ALL_ROLES, section: 'platform' },
  { title: 'opportunities', icon: 'mdi-briefcase-search-outline', to: 'opportunities', roles: ALL_ROLES, section: 'platform' },
  { title: 'requests', icon: 'mdi-storefront-outline', to: 'requests', roles: ALL_ROLES, section: 'platform' },
  { title: 'interviewers', icon: 'mdi-account-supervisor-circle-outline', to: 'interviewers', roles: ALL_ROLES, section: 'platform' },
  { title: 'expertsMarket', icon: 'mdi-compass-outline', to: 'experts-market', roles: ALL_ROLES, section: 'platform' },
  { title: 'peopleExplorer', icon: 'mdi-account-group-outline', to: 'people-explorer', roles: ALL_ROLES, section: 'platform' },
  { title: 'candidates', icon: 'mdi-account-search-outline', to: 'candidates', roles: ['company'], section: 'platform' },
  { title: 'peerRequests', icon: 'mdi-swap-horizontal-circle-outline', to: 'peer-requests', roles: ALL_ROLES, section: 'platform' },
  { title: 'surveysParticipate', icon: 'mdi-comment-quote-outline', to: 'surveys-participate', roles: ALL_ROLES, section: 'platform' },

  // ===== حسابي الموحّد — الإدارة تخدم السوق لا تتصدره =====
  { title: 'hub', icon: 'mdi-view-dashboard-variant-outline', to: 'unified-hub', roles: ALL_ROLES, section: 'account' },
  { title: 'wallet', icon: 'mdi-wallet-outline', to: 'wallet', roles: ALL_ROLES, section: 'account' },
  { title: 'surveysHub', icon: 'mdi-poll', to: 'surveys-hub', roles: ALL_ROLES, section: 'account' },
  { title: 'unifiedAnalytics', icon: 'mdi-chart-multiple', to: 'unified-analytics', roles: ALL_ROLES, section: 'account' },
  { title: 'assistant', icon: 'mdi-robot-happy-outline', to: 'assistant', roles: ALL_ROLES, section: 'account' },
  { title: 'achievements', icon: 'mdi-trophy-outline', to: 'achievements', roles: ALL_ROLES, section: 'account' },
  { title: 'settings', icon: 'mdi-cog-outline', to: 'settings', roles: ALL_ROLES, section: 'account' },

  // ===== مساحة الدور النشط =====
  { title: 'dashboard', icon: 'mdi-view-dashboard-outline', to: 'dashboard', roles: ['seeker', 'company'], section: 'role' },

  // Admin
  { title: 'dashboard', icon: 'mdi-view-dashboard-outline', to: 'admin-overview', roles: ['admin'], section: 'role' },
  { title: 'users', icon: 'mdi-account-multiple-outline', to: 'admin-users', roles: ['admin'], section: 'role' },
  { title: 'team', icon: 'mdi-shield-account-outline', to: 'admin-roles', roles: ['admin'], section: 'role' },

  // Endorser
  { title: 'dashboard', icon: 'mdi-view-dashboard-outline', to: 'endorser-home', roles: ['endorser'], section: 'role' },
  { title: 'endorsements', icon: 'mdi-account-star-outline', to: 'add-endorsement', roles: ['endorser'], section: 'role' },

  // Interviewer (certified)
  { title: 'interviewerHome', icon: 'mdi-account-tie', to: 'interviewer-dashboard', roles: ['interviewer'], section: 'role' },
  { title: 'analytics', icon: 'mdi-chart-box-outline', to: 'interviewer-analytics', roles: ['interviewer'], section: 'role' },

  // Ecosystem expert roles
  { title: 'coachHome', icon: 'mdi-compass-outline', to: 'coach-dashboard', roles: ['coach'], section: 'role' },
  { title: 'trainerHome', icon: 'mdi-school-outline', to: 'trainer-dashboard', roles: ['trainer'], section: 'role' },
  { title: 'consultantHome', icon: 'mdi-lightbulb-on-outline', to: 'consultant-dashboard', roles: ['consultant'], section: 'role' },

  // Seeker — أدوات عمله الخاصة فقط (الأسواق صعدت لقسم المنصة)
  { title: 'profile', icon: 'mdi-account-circle-outline', to: 'profile', roles: ['seeker'], section: 'role' },
  { title: 'interviews', icon: 'mdi-account-tie-voice-outline', to: 'interviews', roles: ['seeker'], section: 'role' },
  { title: 'assessments', icon: 'mdi-clipboard-check-outline', to: 'assessments', roles: ['seeker'], section: 'role' },
  { title: 'resumeBuilder', icon: 'mdi-file-account-outline', to: 'resume-builder', roles: ['seeker'], section: 'role' },
  { title: 'applications', icon: 'mdi-file-send-outline', to: 'applications', roles: ['seeker'], section: 'role' },
  { title: 'wishes', icon: 'mdi-hand-heart-outline', to: 'wishes', roles: ['seeker'], section: 'role' },

  // Company
  { title: 'createOpportunity', icon: 'mdi-briefcase-plus-outline', to: 'create-opportunity', roles: ['company'], section: 'role' },
  { title: 'wishes', icon: 'mdi-hand-heart-outline', to: 'company-wishes', roles: ['company'], section: 'role' },
  { title: 'analytics', icon: 'mdi-chart-box-outline', to: 'analytics', roles: ['company'], section: 'role' },
]

export function navForRole(role: UserRole | undefined): NavItem[] {
  if (!role)
    return []
  return navItems.filter(item => item.roles.includes(role))
}

export function navSections(role: UserRole | undefined, opts: { multiRole?: boolean } = {}): { section: NavSection, items: NavItem[] }[] {
  let items = navForRole(role)
  // مالك عدة أدوار: «مركزك» هو الرئيسية — تُخفى لوحة الرئيسية القديمة من القائمة
  // (تبقى متاحة كـ«اللوحة الكاملة» من بطاقة الدور في المركز)
  if (opts.multiRole)
    items = items.filter(i => i.to !== 'dashboard')
  return (['platform', 'account', 'role'] as NavSection[])
    .map(section => ({ section, items: items.filter(i => i.section === section) }))
    .filter(g => g.items.length)
}
