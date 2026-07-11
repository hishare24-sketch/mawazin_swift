// ===== صلاحيّات لوحة الأدمن — مطابقة PermissionEnum الخلفيّ (guard: admin) =====
// النمط {action}_{resource}. تُستخدم لتبويب التنقّل/الأزرار (AuthStore.hasPermission)
// ولعرض مصفوفة الصلاحيّات في صفحة الأدوار. المصدر الملزم الخلفيّ: Modules/Admin/Enums/PermissionEnum.

export const ADMIN_PERMISSIONS = [
  'view_users', 'create_users', 'update_users', 'delete_users',
  'view_roles', 'create_roles', 'update_roles', 'delete_roles',
  'view_opportunities', 'create_opportunities', 'update_opportunities', 'delete_opportunities',
  'view_requests', 'update_requests', 'delete_requests',
  'view_pipeline', 'manage_pipeline', 'view_matching', 'manage_matching',
  'view_interviewers', 'update_interviewers', 'approve_interviewers', 'reject_interviewers', 'view_interviews',
  'view_surveys', 'update_surveys', 'delete_surveys', 'close_surveys',
  'view_survey_templates', 'manage_survey_templates',
  'view_profiles', 'verify_skills', 'view_endorsements', 'approve_endorsements', 'view_governance', 'manage_governance', 'approve_experts',
  'view_broadcast', 'create_broadcast',
  'view_plans', 'create_plans', 'update_plans', 'delete_plans', 'view_wallets', 'adjust_wallets',
  'view_billing', 'manage_billing',
  'view_platform_accounts', 'manage_platform_accounts',
  'view_support', 'manage_support',
  'view_analytics', 'view_audit', 'view_settings', 'manage_settings',
  'view_branding', 'manage_branding',
  'view_ai', 'manage_ai',
  'view_chat', 'manage_chat',
  'view_reports', 'view_health',
] as const

export type AdminPermission = typeof ADMIN_PERMISSIONS[number]

/** تجميع الصلاحيّات بالأقسام — لعرض مصفوفة الأدوار ولترتيب واجهة الصلاحيّات. */
export interface PermissionGroup { key: string, labelKey: string, permissions: AdminPermission[] }

export const PERMISSION_GROUPS: PermissionGroup[] = [
  { key: 'users', labelKey: 'admin.groups.users', permissions: ['view_users', 'create_users', 'update_users', 'delete_users', 'view_roles', 'create_roles', 'update_roles', 'delete_roles'] },
  { key: 'marketplace', labelKey: 'admin.groups.marketplace', permissions: ['view_opportunities', 'create_opportunities', 'update_opportunities', 'delete_opportunities', 'view_requests', 'update_requests', 'delete_requests', 'view_pipeline', 'manage_pipeline', 'view_matching', 'manage_matching'] },
  { key: 'interviews', labelKey: 'admin.groups.interviews', permissions: ['view_interviewers', 'update_interviewers', 'approve_interviewers', 'reject_interviewers', 'view_interviews'] },
  { key: 'surveys', labelKey: 'admin.groups.surveys', permissions: ['view_surveys', 'update_surveys', 'delete_surveys', 'close_surveys', 'view_survey_templates', 'manage_survey_templates'] },
  { key: 'governance', labelKey: 'admin.groups.governance', permissions: ['view_profiles', 'verify_skills', 'view_endorsements', 'approve_endorsements', 'view_governance', 'manage_governance', 'approve_experts'] },
  { key: 'broadcast', labelKey: 'admin.groups.broadcast', permissions: ['view_broadcast', 'create_broadcast'] },
  { key: 'billing', labelKey: 'admin.groups.billing', permissions: ['view_plans', 'create_plans', 'update_plans', 'delete_plans', 'view_billing', 'manage_billing', 'view_wallets', 'adjust_wallets', 'view_platform_accounts', 'manage_platform_accounts'] },
  { key: 'support', labelKey: 'admin.groups.support', permissions: ['view_support', 'manage_support'] },
  { key: 'analytics', labelKey: 'admin.groups.analytics', permissions: ['view_analytics', 'view_audit', 'view_settings', 'manage_settings', 'view_reports', 'view_health', 'view_branding', 'manage_branding'] },
  { key: 'ai', labelKey: 'admin.groups.ai', permissions: ['view_ai', 'manage_ai'] },
  { key: 'communications', labelKey: 'admin.groups.communications', permissions: ['view_chat', 'manage_chat'] },
]
