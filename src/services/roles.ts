import type { RoleEntry, UserRole } from '@/interfaces/Auth'

// Default permission sets per role (until backend provides them)
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  seeker: ['view_opportunities', 'apply_opportunity', 'view_profile', 'manage_resume'],
  company: ['view_candidates', 'create_opportunity', 'send_wish', 'view_analytics'],
  endorser: ['create_endorsement'],
  admin: ['*'],
  interviewer: ['conduct_interview', 'manage_interviewer_profile', 'write_evaluation'],
  coach: ['coach_clients', 'manage_programs', 'publish_content'],
  trainer: ['manage_courses', 'view_trainees'],
  consultant: ['consult_companies', 'publish_insights'],
}

export interface RoleMeta {
  icon: string
  /** i18n key under roles.* */
  labelKey: string
  /** route name of the role's landing page */
  home: string
  /** whether the user can request this role from the role switcher */
  requestable: boolean
  /** instant → active on request, approval → pending until activated */
  activation: 'instant' | 'approval'
}

export const ROLE_META: Record<UserRole, RoleMeta> = {
  seeker: { icon: 'mdi-account-search-outline', labelKey: 'seeker', home: 'dashboard', requestable: true, activation: 'instant' },
  interviewer: { icon: 'mdi-star-check-outline', labelKey: 'interviewer', home: 'interviewer-dashboard', requestable: true, activation: 'approval' },
  company: { icon: 'mdi-office-building-outline', labelKey: 'company', home: 'dashboard', requestable: true, activation: 'instant' },
  endorser: { icon: 'mdi-hand-heart-outline', labelKey: 'endorser', home: 'endorser-home', requestable: false, activation: 'approval' },
  admin: { icon: 'mdi-shield-crown-outline', labelKey: 'admin', home: 'admin-dashboard', requestable: false, activation: 'approval' },
  // أدوار توسعة النظام البيئي (وثيقة «شريك النجاح») — بموافقة المنصة ضبطًا للجودة
  coach: { icon: 'mdi-compass-outline', labelKey: 'coach', home: 'coach-dashboard', requestable: true, activation: 'approval' },
  trainer: { icon: 'mdi-school-outline', labelKey: 'trainer', home: 'trainer-dashboard', requestable: true, activation: 'approval' },
  consultant: { icon: 'mdi-lightbulb-on-outline', labelKey: 'consultant', home: 'consultant-dashboard', requestable: true, activation: 'approval' },
}

/** الأدوار المهنية القابلة للتعدد والتبديل (admin حساب منفصل، endorser يبقى كما هو حاليًا) */
export const SWITCHABLE_ROLES: UserRole[] = ['seeker', 'interviewer', 'company', 'coach', 'trainer', 'consultant']

export function roleHome(role: UserRole | undefined): string {
  return role ? ROLE_META[role].home : 'dashboard'
}

function entry(role: UserRole, status: RoleEntry['status'] = 'active'): RoleEntry {
  const now = new Date().toISOString()
  return { role, status, created_at: now, activated_at: status === 'active' ? now : undefined }
}

/**
 * يبني قائمة أدوار افتراضية لمستخدم دوره الأساسي `primary`.
 * الباحث يُفعّل تلقائيًا لكل مستخدم مهني (وفق سياسة المنصة)؛
 * admin/endorser حسابان مستقلان بدور واحد.
 */
export function defaultRoleEntries(primary: UserRole): RoleEntry[] {
  if (primary === 'admin' || primary === 'endorser')
    return [entry(primary)]
  if (primary === 'seeker')
    return [entry('seeker')]
  return [entry('seeker'), entry(primary)]
}
