// ===== تنقّل كونسول الأدمن — مجمّع بالأقسام وواعٍ بالصلاحيّات =====
// title/groupالتسمية مفاتيح i18n تحت admin.nav.* ؛ to اسم مسار ؛ permission يبوّب الظهور.
export interface AdminNavItem {
  title: string
  icon: string
  to: string
  permission?: string
}
export interface AdminNavGroup {
  key: string
  titleKey: string
  items: AdminNavItem[]
}

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    key: 'main',
    titleKey: 'admin.nav.groupMain',
    items: [
      { title: 'admin.nav.overview', icon: 'mdi-view-dashboard-outline', to: 'admin-overview', permission: 'view_analytics' },
    ],
  },
  {
    key: 'people',
    titleKey: 'admin.nav.groupPeople',
    items: [
      { title: 'admin.nav.users', icon: 'mdi-account-multiple-outline', to: 'admin-users', permission: 'view_users' },
      { title: 'admin.nav.roles', icon: 'mdi-shield-key-outline', to: 'admin-roles', permission: 'view_roles' },
    ],
  },
  {
    key: 'marketplace',
    titleKey: 'admin.nav.groupMarketplace',
    items: [
      { title: 'admin.nav.opportunities', icon: 'mdi-briefcase-outline', to: 'admin-opportunities', permission: 'view_opportunities' },
      { title: 'admin.nav.requests', icon: 'mdi-file-document-outline', to: 'admin-requests', permission: 'view_requests' },
    ],
  },
  {
    key: 'operations',
    titleKey: 'admin.nav.groupOperations',
    items: [
      { title: 'admin.nav.surveys', icon: 'mdi-clipboard-text-outline', to: 'admin-surveys', permission: 'view_surveys' },
      { title: 'admin.nav.surveyTemplates', icon: 'mdi-file-document-multiple-outline', to: 'admin-survey-templates', permission: 'view_survey_templates' },
      { title: 'admin.nav.plans', icon: 'mdi-tag-multiple-outline', to: 'admin-plans', permission: 'view_plans' },
      { title: 'admin.nav.billing', icon: 'mdi-receipt-text-outline', to: 'admin-billing', permission: 'view_billing' },
      { title: 'admin.nav.wallets', icon: 'mdi-wallet-outline', to: 'admin-wallets', permission: 'view_wallets' },
      { title: 'admin.nav.treasury', icon: 'mdi-bank-outline', to: 'admin-platform-accounts', permission: 'view_platform_accounts' },
    ],
  },
  {
    key: 'quality',
    titleKey: 'admin.nav.groupQuality',
    items: [
      { title: 'admin.nav.interviewers', icon: 'mdi-account-tie-outline', to: 'admin-interviewers', permission: 'view_interviewers' },
      { title: 'admin.nav.governance', icon: 'mdi-gavel', to: 'admin-governance', permission: 'view_governance' },
    ],
  },
  {
    key: 'support',
    titleKey: 'admin.nav.groupSupport',
    items: [
      { title: 'admin.nav.support', icon: 'mdi-lifebuoy', to: 'admin-support', permission: 'view_support' },
    ],
  },
  {
    key: 'intelligence',
    titleKey: 'admin.nav.groupIntelligence',
    items: [
      { title: 'admin.nav.ai', icon: 'mdi-robot-outline', to: 'admin-ai', permission: 'view_ai' },
      { title: 'admin.nav.chat', icon: 'mdi-forum-outline', to: 'admin-chat', permission: 'view_chat' },
    ],
  },
  {
    key: 'system',
    titleKey: 'admin.nav.groupSystem',
    items: [
      { title: 'admin.nav.reports', icon: 'mdi-chart-box-outline', to: 'admin-reports', permission: 'view_reports' },
      { title: 'admin.nav.broadcast', icon: 'mdi-bullhorn-outline', to: 'admin-broadcast', permission: 'view_broadcast' },
      { title: 'admin.nav.audit', icon: 'mdi-history', to: 'admin-audit', permission: 'view_audit' },
      { title: 'admin.nav.settings', icon: 'mdi-cog-outline', to: 'admin-settings', permission: 'view_settings' },
    ],
  },
]
