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
  content_reviewer: ['review_content', 'moderate_content'],
  community_guide: ['manage_community', 'moderate_discussions'],
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

// السياسة المعتمدة: «لا فرق بين الأدوار» — كلها فورية لكل مستخدم،
// والاعتماد (كمعالج المقيّم) شارة جودة اختيارية ترفع الترتيب والثقة، لا بوابة دخول.
// (طابور اعتماد المدير باقٍ جاهزًا؛ إرجاع أي دور لـ approval يعيد تفعيل البوابة.)
export const ROLE_META: Record<UserRole, RoleMeta> = {
  seeker: { icon: 'mdi-account-search-outline', labelKey: 'seeker', home: 'dashboard', requestable: true, activation: 'instant' },
  interviewer: { icon: 'mdi-star-check-outline', labelKey: 'interviewer', home: 'interviewer-dashboard', requestable: true, activation: 'instant' },
  company: { icon: 'mdi-office-building-outline', labelKey: 'company', home: 'dashboard', requestable: true, activation: 'instant' },
  endorser: { icon: 'mdi-hand-heart-outline', labelKey: 'endorser', home: 'endorser-home', requestable: true, activation: 'instant' },
  admin: { icon: 'mdi-shield-crown-outline', labelKey: 'admin', home: 'admin-overview', requestable: false, activation: 'approval' },
  coach: { icon: 'mdi-compass-outline', labelKey: 'coach', home: 'coach-dashboard', requestable: true, activation: 'instant' },
  trainer: { icon: 'mdi-school-outline', labelKey: 'trainer', home: 'trainer-dashboard', requestable: true, activation: 'instant' },
  consultant: { icon: 'mdi-lightbulb-on-outline', labelKey: 'consultant', home: 'consultant-dashboard', requestable: true, activation: 'instant' },
  // مجموعة الحوكمة: إدارة منصة قرب المدير — مُسندة بالاعتماد لا بالطلب الذاتي، خارج سوق الخبراء
  content_reviewer: { icon: 'mdi-file-check-outline', labelKey: 'content_reviewer', home: 'governance-dashboard', requestable: false, activation: 'approval' },
  community_guide: { icon: 'mdi-account-group-outline', labelKey: 'community_guide', home: 'governance-dashboard', requestable: false, activation: 'approval' },
}

/** الأدوار المهنية القابلة للتعدد والتبديل — الكل عدا المدير والحوكمة (حسابات تشغيل المنصة) */
export const SWITCHABLE_ROLES: UserRole[] = ['seeker', 'interviewer', 'company', 'endorser', 'coach', 'trainer', 'consultant']

/** مجموعة الحوكمة (إدارة منصة) — مفصولة عن أدوار السوق والخدمة */
export const GOVERNANCE_ROLES: UserRole[] = ['content_reviewer', 'community_guide']

export function roleHome(role: UserRole | undefined): string {
  return role ? ROLE_META[role].home : 'dashboard'
}

/** الوجهة بعد الدخول: المركز الموحّد لمالكي دورين نشطين فأكثر، وإلا لوحة الدور مباشرة */
export function landingFor(role: UserRole | undefined, activeRolesCount: number): string {
  return activeRolesCount >= 2 ? 'unified-hub' : roleHome(role)
}

function entry(role: UserRole, status: RoleEntry['status'] = 'active'): RoleEntry {
  const now = new Date().toISOString()
  return { role, status, created_at: now, activated_at: status === 'active' ? now : undefined }
}

/**
 * يبني قائمة أدوار افتراضية لمستخدم دوره الأساسي `primary`.
 * الباحث يُفعّل تلقائيًا لكل مستخدم مهني (وفق سياسة المنصة)؛
 * admin وحده حساب مستقل بدور واحد (تشغيل المنصة).
 */
export function defaultRoleEntries(primary: UserRole): RoleEntry[] {
  if (primary === 'admin')
    return [entry(primary)]
  if (primary === 'seeker')
    return [entry('seeker')]
  return [entry('seeker'), entry(primary)]
}
