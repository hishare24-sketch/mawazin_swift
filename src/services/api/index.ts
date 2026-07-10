import http from '@/plugins/axios'

// ===== طبقة عميل الـAPI — خلف مفتاح VITE_USE_REAL_API =====
// المبدأ: واجهات المخازن لا تتغير؛ عند التبديل للحقيقي يستبدل كل مخزن
// منطق localStorage الداخلي بنداءات هذه الطبقة (store-by-store).
// العقد المرجعي: api/openapi.yaml — وكل مسار هنا يطابقه حرفيًا.

/** true عند الربط بباك-إند حقيقي (VITE_USE_REAL_API=true) — الافتراضي المحاكاة المحلية */
export const USE_REAL_API = import.meta.env.VITE_USE_REAL_API === 'true'

export interface ApiError {
  status: number
  message: string
  /** أخطاء التحقق 422 بأسلوب Laravel: حقل → رسائل */
  fieldErrors?: Record<string, string[]>
}

/** يطبّع أي خطأ axios/شبكة إلى شكل واحد تستهلكه المخازن والواجهات */
export function normalizeApiError(err: unknown): ApiError {
  const e = err as { response?: { status?: number, data?: { message?: string, errors?: Record<string, string[]> } }, message?: string }
  if (e?.response) {
    return {
      status: e.response.status ?? 500,
      message: e.response.data?.message ?? 'حدث خطأ في الخادم',
      fieldErrors: e.response.data?.errors,
    }
  }
  return { status: 0, message: e?.message ?? 'تعذّر الاتصال بالخادم' }
}

/**
 * ينفّذ نداءً حقيقيًا فقط عند تفعيل المفتاح، وإلا يعيد البديل المحلي فورًا.
 * يسمح بتحويل المخازن تدريجيًا دون شرطيات متناثرة.
 */
export async function whenReal<T>(call: () => Promise<T>, localFallback: () => T | Promise<T>): Promise<T> {
  if (!USE_REAL_API)
    return await localFallback()
  return await call()
}

/**
 * الباك-إند (NestJS) يلفّ كل استجابة ناجحة في { data } — نفكّ الغلاف مرّة واحدة
 * ليحصل المستهلك على الحمولة الصافية بنفس شكل mockAi/المخازن المحلية.
 */
export function unwrapEnvelope<T>(body: unknown): T {
  if (body !== null && typeof body === 'object' && 'data' in (body as Record<string, unknown>))
    return (body as { data: T }).data
  return body as T
}

/** خريطة المسارات — نقية وقابلة للاختبار، ومصدر واحد للعناوين */
export const API_PATHS = {
  auth: {
    register: '/v1/auth/register',
    login: '/v1/auth/login',
    me: '/v1/auth/me',
    logout: '/v1/auth/logout',
  },
  profile: {
    root: '/v1/profile',
    skills: '/v1/profile/skills',
    skill: (id: number) => `/v1/profile/skills/${id}`,
    skillProofs: (id: number) => `/v1/profile/skills/${id}/proofs`,
    proofRequests: '/v1/profile/proof-requests',
    resolveProofRequest: (id: number) => `/v1/profile/proof-requests/${id}/resolve`,
  },
  publicProfile: {
    bySlug: (slug: string) => `/v1/public-profiles/${slug}`,
    me: '/v1/public-profiles/me',
    view: (slug: string) => `/v1/public-profiles/${slug}/view`,
    follow: (slug: string) => `/v1/public-profiles/${slug}/follow`,
    rate: (slug: string) => `/v1/public-profiles/${slug}/rate`,
    comments: (slug: string) => `/v1/public-profiles/${slug}/comments`,
    contact: (slug: string) => `/v1/public-profiles/${slug}/contact`,
    schedule: (slug: string) => `/v1/public-profiles/${slug}/schedule`,
    testimonials: (slug: string) => `/v1/public-profiles/${slug}/testimonials`,
    proofRequests: (slug: string) => `/v1/public-profiles/${slug}/proof-requests`,
  },
  marketplace: {
    opportunities: '/v1/opportunities',
    apply: (id: number) => `/v1/opportunities/${id}/apply`,
    requests: '/v1/requests',
    myRequests: '/v1/requests/mine',
  },
  interviewers: {
    list: '/v1/interviewers',
    bookings: (id: number) => `/v1/interviewers/${id}/bookings`,
    booking: (id: number) => `/v1/bookings/${id}`,
  },
  interviews: '/v1/interviews',
  surveys: {
    root: '/v1/surveys',
    responses: (id: number) => `/v1/surveys/${id}/responses`,
  },
  messaging: {
    notifications: '/v1/notifications',
    readAll: '/v1/notifications/read-all',
    conversations: '/v1/conversations',
    messages: (id: number) => `/v1/conversations/${id}/messages`,
  },
  directMessages: {
    root: '/v1/direct-messages',
    read: '/v1/direct-messages/read',
    resolve: (slug: string) => `/v1/direct-messages/resolve/${slug}`,
  },
  account: {
    wallet: '/v1/wallet',
    plan: '/v1/account/plan',
  },
  /** لوحة الأدمن — تحت /api/admin (حارس admin) لا /v1 */
  admin: {
    stats: '/admin/stats',
    users: '/admin/users',
    user: (id: number) => `/admin/users/${id}`,
    suspend: (id: number) => `/admin/users/${id}/suspend`,
    activate: (id: number) => `/admin/users/${id}/activate`,
    adminRole: (id: number) => `/admin/users/${id}/admin-role`,
    roles: '/admin/roles',
    rolesStats: '/admin/roles/stats',
    role: (role: string) => `/admin/roles/${role}`,
    rolePermissions: (role: string) => `/admin/roles/${role}/permissions`,
    opportunities: '/admin/opportunities',
    opportunity: (id: number) => `/admin/opportunities/${id}`,
    requests: '/admin/requests',
    request: (id: number) => `/admin/requests/${id}`,
    surveys: '/admin/surveys',
    survey: (id: number) => `/admin/surveys/${id}`,
    surveyClose: (id: number) => `/admin/surveys/${id}/close`,
    wallets: '/admin/wallets',
    walletsStats: '/admin/wallets/stats',
    walletAdjust: (id: number) => `/admin/wallets/${id}/adjust`,
    platformAccounts: '/admin/platform-accounts',
    platformAccountsStats: '/admin/platform-accounts/stats',
    platformAccount: (id: number) => `/admin/platform-accounts/${id}`,
    platformAccountTxns: (id: number) => `/admin/platform-accounts/${id}/transactions`,
    platformAccountAdjust: (id: number) => `/admin/platform-accounts/${id}/adjust`,
    interviewers: '/admin/interviewers',
    interviewer: (id: number) => `/admin/interviewers/${id}`,
    interviewerApprove: (id: number) => `/admin/interviewers/${id}/approve`,
    interviewerReject: (id: number) => `/admin/interviewers/${id}/reject`,
    plans: '/admin/plans',
    plansStats: '/admin/plans/stats',
    plan: (id: number) => `/admin/plans/${id}`,
  },
  /** وسيط Claude — المفتاح يبقى في الخادم، والعقد يطابق أسماء src/services/ai/types.ts */
  ai: (contract: string) => `/v1/ai/${contract}`,
} as const

// ===== نداءات مجمّعة حسب المورد (رقيقة عمدًا — المنطق في المخازن) =====
async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  try {
    return unwrapEnvelope<T>((await http.get(url, { params })).data)
  }
  catch (err) {
    throw normalizeApiError(err)
  }
}
async function post<T>(url: string, body?: unknown): Promise<T> {
  try {
    return unwrapEnvelope<T>((await http.post(url, body)).data)
  }
  catch (err) {
    throw normalizeApiError(err)
  }
}
async function patch<T>(url: string, body?: unknown): Promise<T> {
  try {
    return unwrapEnvelope<T>((await http.patch(url, body)).data)
  }
  catch (err) {
    throw normalizeApiError(err)
  }
}
async function put<T>(url: string, body?: unknown): Promise<T> {
  try {
    return unwrapEnvelope<T>((await http.put(url, body)).data)
  }
  catch (err) {
    throw normalizeApiError(err)
  }
}
async function del(url: string): Promise<void> {
  try {
    await http.delete(url)
  }
  catch (err) {
    throw normalizeApiError(err)
  }
}

/** ترقيم لوحة الأدمن: يحفظ meta (dashboardResponse يعيد {data, meta} — get العاديّ يفكّ data ويُسقط meta). */
export interface PageMeta { current_page: number, last_page: number, itemPerPage: number, total: number }
export interface Page<T> { items: T[], meta: PageMeta | null }
async function getPage<T>(url: string, params?: Record<string, unknown>): Promise<Page<T>> {
  try {
    const body = (await http.get(url, { params })).data as { data?: T[], meta?: PageMeta | null }
    return { items: body?.data ?? [], meta: body?.meta ?? null }
  }
  catch (err) {
    throw normalizeApiError(err)
  }
}

/** المستخدم كما يعيده الباك-إند (NestJS) — قبل التحويل لـ User المنصة */
export interface ApiAuthUser {
  id: number
  uuid: string
  name: string
  email: string
  role: string
  kind?: 'individual' | 'organization'
  tier: 'free' | 'pro' | 'elite'
  phone: string | null
  /** أدوار لوحة الأدمن (guard=admin) — وجودها يعني حساب أدمن */
  adminRoles?: string[]
  /** صلاحيّات الأدمن الفعليّة (من Spatie) — لتبويب الكونسول الدقيق */
  permissions?: string[]
  created_at?: string
}
export interface ApiAuthSession { user: ApiAuthUser, token: string }

// ===== أنواع لوحة الأدمن =====
export interface AdminUser {
  id: number
  uuid: string
  name: string
  email: string
  role: string
  kind?: 'individual' | 'organization'
  tier: 'free' | 'pro' | 'elite'
  status: 'active' | 'suspended'
  adminRoles: string[]
  createdAt?: string
}
export interface AdminStats {
  totals: { users: number, suspended: number, opportunities: number, requests: number, interviews: number, interviewers: number, surveys: number }
  usersByRole: Record<string, number>
  usersByTier: Record<string, number>
  usersByKind: Record<string, number>
  signups: { date: string, count: number }[]
}
export interface AdminRole { name: string, usersCount: number, permissions: string[] }
export interface AdminRolesResponse { roles: AdminRole[], permissions: string[] }
export interface AdminRolesStats { totalRoles: number, systemRoles: number, customRoles: number, adminUsers: number, holders: { label: string, value: number }[], permissionCounts: { label: string, value: number }[] }
export interface AdminUserQuery { page?: number, perPage?: number, sort?: string, q?: string, role?: string, tier?: string, kind?: string, status?: string }
export type AdminUserPatch = Partial<Pick<AdminUser, 'name' | 'email' | 'role' | 'tier' | 'kind'>> & { phone?: string | null }
/** تفصيل مستخدم مُثرًى للاستعراض العميق */
export interface AdminUserDetail extends AdminUser { wallet: number, stats: { opportunities: number, applications: number, surveys: number } }
export interface AdminOpportunity { id: number, title: string, company: string, location: string, salary: string, category: string, skills: string[], createdAt?: string }
export interface AdminMarketRequest { id: number, type: string, title: string, org: string, state: string, compensation: string, remote: boolean, createdAt?: string }
export interface AdminMarketQuery { page?: number, perPage?: number, sort?: string, q?: string, category?: string, type?: string, state?: string, status?: string, specialty?: string }
export interface AdminSurvey { id: number, title: string, state: string, points_pool: number, responses: number, owner: string | null, createdAt?: string }
export interface AdminWallet { id: number, userId: number, userName: string | null, userEmail: string | null, balance: number, transactions: number, updatedAt?: string }
export interface AdminWalletsStats { totalBalance: number, wallets: number, avgBalance: number, topHolders: { label: string, value: number }[] }
export interface AdminPlatformAccount { id: number, name: string, type: string, bank_name: string | null, account_no_masked: string | null, currency: string, balance: number, is_default: boolean, active: boolean, notes: string | null, transactions: number, updatedAt?: string }
export interface AdminPlatformAccountCreate { name: string, type: string, bank_name?: string, account_no_masked?: string, currency?: string, notes?: string, active?: boolean }
export interface AdminPlatformTxn { id: number, amount: number, type: string, reference: string | null, note: string | null, at?: string }
export interface AdminTreasuryStats { treasury: number, revenue: number, inflow: number, outflow: number, accounts: number, distribution: { label: string, value: number }[], revenueSeries: { date: string, value: number }[] }
export interface AdminInterviewer { id: number, name: string, specialty: string, status: string, rating: number, price_from: number, account: string | null, createdAt?: string }
export interface AdminPlan { id: number, key: string, name: string, price: number, survey_limit: number | null, features: string[], active: boolean, sort: number, subscribers: number }
export interface AdminPlanPatch { name?: string, price?: number, survey_limit?: number | null, features?: string[], active?: boolean }
export interface AdminPlanCreate { key: string, name: string, price: number, survey_limit?: number | null, features?: string[], active?: boolean }
export interface AdminPlansStats { totalPlans: number, activePlans: number, subscribers: number, mrr: number, distribution: { label: string, value: number }[] }

export const api = {
  auth: {
    register: (body: { name: string, email: string, password: string, phone?: string, role?: string, kind?: string }) =>
      post<ApiAuthSession>(API_PATHS.auth.register, body),
    login: (body: { email: string, password: string }) => post<ApiAuthSession>(API_PATHS.auth.login, body),
    me: () => get<ApiAuthUser>(API_PATHS.auth.me),
    logout: () => post(API_PATHS.auth.logout),
  },
  profile: {
    get: () => get(API_PATHS.profile.root),
    update: (body: unknown) => patch(API_PATHS.profile.root, body),
    addSkill: (body: { name: string, selfLevel: number, category?: string }) => post(API_PATHS.profile.skills, body),
    removeSkill: (id: number) => del(API_PATHS.profile.skill(id)),
    addProof: (skillId: number, body: unknown) => post(API_PATHS.profile.skillProofs(skillId), body),
    proofRequests: () => get(API_PATHS.profile.proofRequests),
    resolveProofRequest: (id: number, accept: boolean) => post(API_PATHS.profile.resolveProofRequest(id), { accept }),
  },
  publicProfile: {
    get: (slug: string) => get(API_PATHS.publicProfile.bySlug(slug)),
    getMine: () => get(API_PATHS.publicProfile.me),
    updateMine: (body: unknown) => patch(API_PATHS.publicProfile.me, body),
    recordView: (slug: string) => post(API_PATHS.publicProfile.view(slug)),
    toggleFollow: (slug: string, following?: boolean) => post<{ following: boolean, followersCount: number }>(API_PATHS.publicProfile.follow(slug), { following }),
    rate: (slug: string, stars: number) => post<{ avgRating: number, ratingCount: number }>(API_PATHS.publicProfile.rate(slug), { stars }),
    addComment: (slug: string, body: { author: string, text: string }) => post(API_PATHS.publicProfile.comments(slug), body),
    contact: (slug: string, body: { visitorName: string, text: string }) => post(API_PATHS.publicProfile.contact(slug), body),
    schedule: (slug: string, body: { visitorName: string, day: string, slot: string, topic?: string }) => post(API_PATHS.publicProfile.schedule(slug), body),
    submitTestimonial: (slug: string, body: { author: string, authorRole?: string, excerpt: string }) => post(API_PATHS.publicProfile.testimonials(slug), body),
    requestProof: (slug: string, body: { skill: string, from: string, relation?: string }) => post(API_PATHS.publicProfile.proofRequests(slug), body),
  },
  marketplace: {
    opportunities: (params?: { q?: string, category?: string }) => get(API_PATHS.marketplace.opportunities, params),
    postOpportunity: (body: unknown) => post(API_PATHS.marketplace.opportunities, body),
    apply: (id: number) => post(API_PATHS.marketplace.apply(id)),
    requests: (params?: { type?: string }) => get(API_PATHS.marketplace.requests, params),
    myRequests: () => get(API_PATHS.marketplace.myRequests),
  },
  interviewers: {
    list: () => get(API_PATHS.interviewers.list),
    book: (id: number, body: unknown) => post(API_PATHS.interviewers.bookings(id), body),
    updateBooking: (id: number, body: unknown) => patch(API_PATHS.interviewers.booking(id), body),
  },
  interviews: {
    list: () => get(API_PATHS.interviews),
    start: (body: unknown) => post(API_PATHS.interviews, body),
  },
  surveys: {
    list: () => get(API_PATHS.surveys.root),
    create: (body: unknown) => post(API_PATHS.surveys.root, body),
    respond: (id: number, body: unknown) => post(API_PATHS.surveys.responses(id), body),
  },
  messaging: {
    notifications: () => get(API_PATHS.messaging.notifications),
    readAll: () => post(API_PATHS.messaging.readAll),
    conversations: () => get(API_PATHS.messaging.conversations),
    send: (id: number, text: string) => post(API_PATHS.messaging.messages(id), { text }),
  },
  /** الرسائل المباشرة بين المستخدمين (REST؛ البثّ اللحظي عبر Socket.IO في directMessages.ts) */
  directMessages: {
    list: <T>() => get<T>(API_PATHS.directMessages.root),
    send: <T>(body: { recipientId: string, recipientName: string, body: string }) => post<T>(API_PATHS.directMessages.root, body),
    markRead: (peerId: string) => post(API_PATHS.directMessages.read, { peerId }),
    resolveOwner: <T>(slug: string) => get<T>(API_PATHS.directMessages.resolve(slug)),
  },
  /** مستندات خاصة عامة (blob) لكل مخزن — يقابل Supabase account_states */
  accountStates: {
    get: <T>(store: string) => get<T>(`/v1/account-states/${store}`),
    put: (store: string, data: unknown) => put(`/v1/account-states/${store}`, { data }),
  },
  account: {
    wallet: () => get(API_PATHS.account.wallet),
    plan: () => get<{ tier: 'free' | 'pro' | 'elite' }>(API_PATHS.account.plan),
    setPlan: (tier: 'free' | 'pro' | 'elite') => put<{ tier: 'free' | 'pro' | 'elite', balance: number }>(API_PATHS.account.plan, { tier }),
  },
  /** لوحة الأدمن — /api/admin (حارس sanctum+admin؛ كل نقطة تفرض صلاحيّتها) */
  admin: {
    stats: () => get<AdminStats>(API_PATHS.admin.stats),
    users: (params?: AdminUserQuery) => getPage<AdminUser>(API_PATHS.admin.users, params as Record<string, unknown>),
    user: (id: number) => get<AdminUserDetail>(API_PATHS.admin.user(id)),
    updateUser: (id: number, body: AdminUserPatch) => patch<AdminUser>(API_PATHS.admin.user(id), body),
    suspendUser: (id: number) => post<AdminUser>(API_PATHS.admin.suspend(id)),
    activateUser: (id: number) => post<AdminUser>(API_PATHS.admin.activate(id)),
    setAdminRole: (id: number, role: string | null) => put<AdminUser>(API_PATHS.admin.adminRole(id), { role }),
    roles: () => get<AdminRolesResponse>(API_PATHS.admin.roles),
    rolesStats: () => get<AdminRolesStats>(API_PATHS.admin.rolesStats),
    createRole: (name: string, permissions: string[]) => post<AdminRole>(API_PATHS.admin.roles, { name, permissions }),
    deleteRole: (role: string) => del(API_PATHS.admin.role(role)),
    updateRolePermissions: (role: string, permissions: string[]) => put(API_PATHS.admin.rolePermissions(role), { permissions }),
    opportunities: (params?: AdminMarketQuery) => getPage<AdminOpportunity>(API_PATHS.admin.opportunities, params as Record<string, unknown>),
    deleteOpportunity: (id: number) => del(API_PATHS.admin.opportunity(id)),
    requests: (params?: AdminMarketQuery) => getPage<AdminMarketRequest>(API_PATHS.admin.requests, params as Record<string, unknown>),
    deleteRequest: (id: number) => del(API_PATHS.admin.request(id)),
    surveys: (params?: AdminMarketQuery) => getPage<AdminSurvey>(API_PATHS.admin.surveys, params as Record<string, unknown>),
    closeSurvey: (id: number) => post(API_PATHS.admin.surveyClose(id)),
    deleteSurvey: (id: number) => del(API_PATHS.admin.survey(id)),
    wallets: (params?: AdminMarketQuery) => getPage<AdminWallet>(API_PATHS.admin.wallets, params as Record<string, unknown>),
    walletsStats: () => get<AdminWalletsStats>(API_PATHS.admin.walletsStats),
    adjustWallet: (id: number, amount: number, note?: string) => post<AdminWallet>(API_PATHS.admin.walletAdjust(id), { amount, note }),
    platformAccounts: (params?: AdminMarketQuery) => getPage<AdminPlatformAccount>(API_PATHS.admin.platformAccounts, params as Record<string, unknown>),
    treasuryStats: () => get<AdminTreasuryStats>(API_PATHS.admin.platformAccountsStats),
    createPlatformAccount: (body: AdminPlatformAccountCreate) => post<AdminPlatformAccount>(API_PATHS.admin.platformAccounts, body),
    updatePlatformAccount: (id: number, body: Partial<AdminPlatformAccountCreate>) => put<AdminPlatformAccount>(API_PATHS.admin.platformAccount(id), body),
    deletePlatformAccount: (id: number) => del(API_PATHS.admin.platformAccount(id)),
    platformAccountTxns: (id: number, params?: AdminMarketQuery) => getPage<AdminPlatformTxn>(API_PATHS.admin.platformAccountTxns(id), params as Record<string, unknown>),
    adjustPlatformAccount: (id: number, amount: number, type?: string, note?: string) => post<AdminPlatformAccount>(API_PATHS.admin.platformAccountAdjust(id), { amount, type, note }),
    interviewers: (params?: AdminMarketQuery) => getPage<AdminInterviewer>(API_PATHS.admin.interviewers, params as Record<string, unknown>),
    approveInterviewer: (id: number) => post<AdminInterviewer>(API_PATHS.admin.interviewerApprove(id)),
    rejectInterviewer: (id: number) => post<AdminInterviewer>(API_PATHS.admin.interviewerReject(id)),
    deleteInterviewer: (id: number) => del(API_PATHS.admin.interviewer(id)),
    plans: (params?: AdminMarketQuery) => getPage<AdminPlan>(API_PATHS.admin.plans, params as Record<string, unknown>),
    plansStats: () => get<AdminPlansStats>(API_PATHS.admin.plansStats),
    createPlan: (body: AdminPlanCreate) => post<AdminPlan>(API_PATHS.admin.plans, body),
    updatePlan: (id: number, body: AdminPlanPatch) => put<AdminPlan>(API_PATHS.admin.plan(id), body),
    deletePlan: (id: number) => del(API_PATHS.admin.plan(id)),
  },
  /** تنفيذ عقد AI عبر وسيط الخادم — بديل claudeAi المباشر (يحمي المفتاح) */
  ai: <T>(contract: string, payload: Record<string, unknown>) => post<T>(API_PATHS.ai(contract), payload),
}
