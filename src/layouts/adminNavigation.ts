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
]
