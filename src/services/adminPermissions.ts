// ===== صلاحيّات لوحة الأدمن — مطابقة PermissionEnum الخلفيّ (guard: admin) =====
// النمط {action}_{resource}. تُستخدم لتبويب التنقّل/الأزرار (AuthStore.hasPermission)
// ولعرض مصفوفة الصلاحيّات في صفحة الأدوار. المصدر الملزم الخلفيّ: Modules/Admin/Enums/PermissionEnum.

export const ADMIN_PERMISSIONS = [
  'view_users', 'update_users', 'delete_users',
  'view_roles', 'create_roles', 'update_roles', 'delete_roles',
  'view_opportunities', 'create_opportunities', 'update_opportunities', 'delete_opportunities',
  'view_requests', 'update_requests', 'delete_requests',
  'view_interviewers', 'update_interviewers', 'approve_interviewers', 'reject_interviewers', 'view_interviews',
  'view_surveys', 'update_surveys', 'delete_surveys', 'close_surveys',
  'view_profiles', 'verify_skills', 'view_endorsements', 'approve_endorsements', 'view_governance', 'approve_experts',
  'view_broadcast', 'create_broadcast',
  'view_plans', 'update_plans', 'view_wallets', 'adjust_wallets',
  'view_analytics',
] as const

export type AdminPermission = typeof ADMIN_PERMISSIONS[number]

/** تجميع الصلاحيّات بالأقسام — لعرض مصفوفة الأدوار ولترتيب واجهة الصلاحيّات. */
export interface PermissionGroup { key: string, labelKey: string, permissions: AdminPermission[] }

export const PERMISSION_GROUPS: PermissionGroup[] = [
  { key: 'users', labelKey: 'admin.groups.users', permissions: ['view_users', 'update_users', 'delete_users', 'view_roles', 'create_roles', 'update_roles', 'delete_roles'] },
  { key: 'marketplace', labelKey: 'admin.groups.marketplace', permissions: ['view_opportunities', 'create_opportunities', 'update_opportunities', 'delete_opportunities', 'view_requests', 'update_requests', 'delete_requests'] },
  { key: 'interviews', labelKey: 'admin.groups.interviews', permissions: ['view_interviewers', 'update_interviewers', 'approve_interviewers', 'reject_interviewers', 'view_interviews'] },
  { key: 'surveys', labelKey: 'admin.groups.surveys', permissions: ['view_surveys', 'update_surveys', 'delete_surveys', 'close_surveys'] },
  { key: 'governance', labelKey: 'admin.groups.governance', permissions: ['view_profiles', 'verify_skills', 'view_endorsements', 'approve_endorsements', 'view_governance', 'approve_experts'] },
  { key: 'broadcast', labelKey: 'admin.groups.broadcast', permissions: ['view_broadcast', 'create_broadcast'] },
  { key: 'billing', labelKey: 'admin.groups.billing', permissions: ['view_plans', 'update_plans', 'view_wallets', 'adjust_wallets'] },
  { key: 'analytics', labelKey: 'admin.groups.analytics', permissions: ['view_analytics'] },
]
