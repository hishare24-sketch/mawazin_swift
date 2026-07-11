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
    readNotification: (id: number) => `/v1/notifications/${id}/read`,
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
  /** المساعد الذكيّ للمستخدم + الدعم (تذاكر/محادثات) — تحت /v1 */
  assistant: {
    context: '/v1/assistant/context',
    message: '/v1/assistant/message',
    conversations: '/v1/assistant/conversations',
    conversation: (id: number) => `/v1/assistant/conversations/${id}`,
    settings: '/v1/assistant/settings',
    escalate: '/v1/assistant/escalate',
  },
  support: {
    tickets: '/v1/support/tickets',
    ticket: (id: number) => `/v1/support/tickets/${id}`,
    ticketReply: (id: number) => `/v1/support/tickets/${id}/reply`,
  },
  /** لوحة الأدمن — تحت /api/admin (حارس admin) لا /v1 */
  admin: {
    stats: '/admin/stats',
    users: '/admin/users',
    usersStats: '/admin/users/stats',
    user: (id: number) => `/admin/users/${id}`,
    suspend: (id: number) => `/admin/users/${id}/suspend`,
    activate: (id: number) => `/admin/users/${id}/activate`,
    adminRole: (id: number) => `/admin/users/${id}/admin-role`,
    auditLogs: '/admin/audit-logs',
    auditStats: '/admin/audit-logs/stats',
    auditExport: '/admin/audit-logs/export',
    settings: '/admin/settings',
    moderation: '/admin/moderation',
    moderationStats: '/admin/moderation/stats',
    moderationResolve: (id: number) => `/admin/moderation/${id}/resolve`,
    broadcasts: '/admin/broadcasts',
    broadcastsStats: '/admin/broadcasts/stats',
    broadcastAudience: '/admin/broadcasts/audience',
    tickets: '/admin/tickets',
    ticketsStats: '/admin/tickets/stats',
    ticket: (id: number) => `/admin/tickets/${id}`,
    ticketReply: (id: number) => `/admin/tickets/${id}/reply`,
    ticketStatus: (id: number) => `/admin/tickets/${id}/status`,
    ticketAssign: (id: number) => `/admin/tickets/${id}/assign`,
    roles: '/admin/roles',
    rolesStats: '/admin/roles/stats',
    role: (role: string) => `/admin/roles/${role}`,
    rolePermissions: (role: string) => `/admin/roles/${role}/permissions`,
    roleMembers: (role: string) => `/admin/roles/${role}/members`,
    roleAssign: (role: string) => `/admin/roles/${role}/assign`,
    roleRevoke: (role: string) => `/admin/roles/${role}/revoke`,
    opportunities: '/admin/opportunities',
    opportunitiesStats: '/admin/opportunities/stats',
    opportunity: (id: number) => `/admin/opportunities/${id}`,
    requests: '/admin/requests',
    requestsStats: '/admin/requests/stats',
    request: (id: number) => `/admin/requests/${id}`,
    surveys: '/admin/surveys',
    surveysStats: '/admin/surveys/stats',
    survey: (id: number) => `/admin/surveys/${id}`,
    surveyClose: (id: number) => `/admin/surveys/${id}/close`,
    surveyTemplates: '/admin/survey-templates',
    surveyTemplatesStats: '/admin/survey-templates/stats',
    surveyTemplate: (id: number) => `/admin/survey-templates/${id}`,
    wallets: '/admin/wallets',
    walletsStats: '/admin/wallets/stats',
    walletAdjust: (id: number) => `/admin/wallets/${id}/adjust`,
    platformAccounts: '/admin/platform-accounts',
    platformAccountsStats: '/admin/platform-accounts/stats',
    platformAccount: (id: number) => `/admin/platform-accounts/${id}`,
    platformAccountTxns: (id: number) => `/admin/platform-accounts/${id}/transactions`,
    platformAccountAdjust: (id: number) => `/admin/platform-accounts/${id}/adjust`,
    interviewers: '/admin/interviewers',
    interviewersStats: '/admin/interviewers/stats',
    interviewer: (id: number) => `/admin/interviewers/${id}`,
    interviewerApprove: (id: number) => `/admin/interviewers/${id}/approve`,
    interviewerReject: (id: number) => `/admin/interviewers/${id}/reject`,
    plans: '/admin/plans',
    plansStats: '/admin/plans/stats',
    plan: (id: number) => `/admin/plans/${id}`,
    invoices: '/admin/invoices',
    invoicesStats: '/admin/invoices/stats',
    invoiceRefund: (id: number) => `/admin/invoices/${id}/refund`,
    ai: '/admin/ai',
    aiStats: '/admin/ai/stats',
    aiSettings: '/admin/ai/settings',
    aiQuotas: '/admin/ai/quotas',
    aiCapabilityToggle: (id: number) => `/admin/ai/capabilities/${id}/toggle`,
    aiKnowledge: '/admin/ai/knowledge',
    aiKnowledgeItem: (id: number) => `/admin/ai/knowledge/${id}`,
    chat: '/admin/chat',
    chatSettings: '/admin/chat/settings',
    chatStats: '/admin/chat/stats',
    chatThreads: '/admin/chat/threads',
    chatThread: (key: string) => `/admin/chat/threads/${encodeURIComponent(key)}`,
    chatAssistantPreview: '/admin/chat/assistant-preview',
    reportsOverview: '/admin/reports/overview',
    reportsReport: '/admin/reports/report',
    systemHealth: '/admin/system/health',
    pipelineBoard: '/admin/pipeline/board',
    pipelineStats: '/admin/pipeline/stats',
    pipelineOpportunities: '/admin/pipeline/opportunities',
    pipelineMove: (id: number) => `/admin/pipeline/applications/${id}/move`,
    pipelineBulkMove: '/admin/pipeline/bulk-move',
    matchingSettings: '/admin/matching/settings',
    matchingShortlist: '/admin/matching/shortlist',
    branding: '/admin/branding',
    archive: '/admin/archive',
    archiveStats: '/admin/archive/stats',
    archiveRestore: '/admin/archive/restore',
    archivePurge: '/admin/archive/purge',
    interviewQuality: '/admin/interview-quality',
    interviewQualityItem: (id: number) => `/admin/interview-quality/${id}`,
    interviewQualityReview: (id: number) => `/admin/interview-quality/${id}/review`,
    interviewQualityStats: '/admin/interview-quality/stats',
    interviewCalibration: '/admin/interview-quality/calibration',
    interviewRubrics: '/admin/interview-rubrics',
    interviewRubricItem: (id: number) => `/admin/interview-rubrics/${id}`,
    complianceOverview: '/admin/compliance/overview',
    complianceAdverseImpact: '/admin/compliance/adverse-impact',
    complianceFunnel: '/admin/compliance/funnel',
    complianceAuditTrail: '/admin/compliance/audit-trail',
  },
  /** هويّة المنصّة العامّة (بلا مصادقة) */
  brandingPublic: '/v1/branding',
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

/** تنزيل ملفّ خادميّ (CSV/بلوب) مع حمل التوكن — للتصدير الكامل عبر الفلاتر (لا الصفحة فقط). */
async function getBlob(url: string, params?: Record<string, unknown>): Promise<Blob> {
  try {
    return (await http.get(url, { params, responseType: 'blob' })).data as Blob
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
export interface AdminSetting { key: string, value: string | number | boolean, type: 'string' | 'number' | 'boolean' | 'select', group: string, label: string, description: string | null, options: { value: string, label: string }[], sort: number }
export interface AdminModerationItem { id: number, type: string, subject: string, submitter: string, targetRef: string | null, reason: string | null, status: string, resolver: string | null, resolvedAt?: string, createdAt?: string }
export interface AdminModerationStats { total: number, pending: number, approved: number, rejected: number, byType: { label: string, value: number }[], byStatus: { label: string, value: number }[], series: { date: string, value: number }[] }
export interface AdminBroadcast { id: number, title: string, body: string, channel: string, audience: string, audience_value: string | null, status: string, recipients: number, sender: string | null, sentAt?: string, createdAt?: string }
export interface AdminBroadcastCreate { title: string, body: string, channel: string, audience: string, audience_value?: string }
export interface AdminBroadcastStats { total: number, reach: number, audienceSize: number, byChannel: { label: string, value: number }[], byAudience: { label: string, value: number }[] }
export interface AdminTicketReply { id: number, author: string | null, isStaff: boolean, body: string, at?: string }
export interface AdminTicket { id: number, subject: string, user: string, category: string, priority: string, status: string, assignee: string | null, repliesCount: number, lastReplyAt?: string, createdAt?: string, replies?: AdminTicketReply[] }
export interface AdminSupportStats { total: number, open: number, pending: number, resolved: number, byCategory: { label: string, value: number }[], byPriority: { label: string, value: number }[], series: { date: string, value: number }[] }
export interface AdminAuditMeta { role?: string, added?: string[], removed?: string[], granted?: string[], deleted?: boolean, user?: string, from?: string[] | null, to?: string[] | null, status?: { from: string, to: string }, assigned?: string, revoked?: string, userId?: number }
export interface AdminAuditLog { id: number, actor: string, actorId: number | null, method: string, resource: string | null, action: string, path: string, targetId: number | null, status: number, meta?: AdminAuditMeta | null, ip: string | null, at?: string }
export interface RoleMember { id: number, name: string, email: string, status: string }
export interface RoleMembersResponse { role: string, members: RoleMember[] }
export interface NotificationRow { id: number, icon: string, title: string, body: string, category: string, read: boolean, actionTo: string | null, at: string | null }
export interface AdminAuditStats { total: number, today: number, actors: number, byAction: { label: string, value: number }[], byResource: { label: string, value: number }[], series: { date: string, value: number }[] }
export interface AdminRole { name: string, usersCount: number, permissions: string[] }
export interface AdminRolesResponse { roles: AdminRole[], permissions: string[] }
export interface AdminRolesStats { totalRoles: number, systemRoles: number, customRoles: number, adminUsers: number, holders: { label: string, value: number }[], permissionCounts: { label: string, value: number }[] }
export interface AdminUserQuery { page?: number, perPage?: number, sort?: string, q?: string, role?: string, tier?: string, kind?: string, status?: string }
export type AdminUserPatch = Partial<Pick<AdminUser, 'name' | 'email' | 'role' | 'tier' | 'kind'>> & { phone?: string | null }
/** تفصيل مستخدم مُثرًى للاستعراض العميق */
export interface AdminUserDetail extends AdminUser { wallet: number, stats: { opportunities: number, applications: number, surveys: number } }
export interface AdminUserCreate { name: string, email: string, password: string, role?: string, tier?: string, kind?: string, phone?: string }
export interface AdminUsersStats { total: number, suspended: number, organizations: number, admins: number, byRole: { label: string, value: number }[], byTier: { label: string, value: number }[], series: { date: string, value: number }[] }
export interface AdminInterviewersStats { total: number, approved: number, pending: number, avgRating: number, byStatus: { label: string, value: number }[], bySpecialty: { label: string, value: number }[] }
export interface AdminInterviewerCreate { name: string, specialty: string, status?: string, rating?: number, price_from?: number }
export interface AdminOpportunity { id: number, title: string, company: string, location: string, salary: string, category: string, skills: string[], createdAt?: string }
export interface AdminOpportunitiesStats { total: number, categories: number, locations: number, byCategory: { label: string, value: number }[], series: { date: string, value: number }[] }
export interface AdminRequestsStats { total: number, types: number, open: number, byType: { label: string, value: number }[], byState: { label: string, value: number }[], series: { date: string, value: number }[] }
export interface AdminMarketRequest { id: number, type: string, title: string, org: string, state: string, compensation: string, remote: boolean, createdAt?: string }
export interface AdminMarketQuery { page?: number, perPage?: number, sort?: string, q?: string, category?: string, type?: string, state?: string, status?: string, specialty?: string, action?: string, resource?: string, method?: string, actorId?: number, from?: string, to?: string }
export interface AdminSurvey { id: number, title: string, state: string, points_pool: number, responses: number, owner: string | null, createdAt?: string }
export interface AdminSurveysStats { total: number, active: number, responses: number, avgResponses: number, distribution: { label: string, value: number }[], series: { date: string, value: number }[] }
export interface AdminTemplateQuestion { text: string, type: string, options?: string[], rows?: string[], scaleMin?: string, scaleMax?: string }
export interface AdminSurveyTemplate { id: number, name: string, description: string | null, category: string, icon: string | null, questions: AdminTemplateQuestion[], questionsCount: number, is_system: boolean, active: boolean, sort: number }
export interface AdminSurveyTemplateCreate { name: string, category: string, description?: string, icon?: string, active?: boolean, questions?: AdminTemplateQuestion[] }
export interface AdminSurveyTemplatesStats { total: number, active: number, system: number, custom: number, distribution: { label: string, value: number }[] }
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
export interface AdminInvoice { id: number, user: string, userId: number | null, plan_key: string, plan_name: string | null, amount: number, status: string, reference: string | null, refundedAt?: string, createdAt?: string }
export interface AdminBillingStats { revenue: number, invoices: number, paid: number, refunded: number, refundedAmount: number, byPlan: { label: string, value: number }[], series: { date: string, value: number }[] }
// ——— الذكاء الاصطناعيّ (حوكمة المساعد) ———
export type AiProvider = 'simulation' | 'claude' | 'openai' | 'custom'
export interface AiSettings {
  enabled: boolean
  provider: AiProvider
  model: string | null
  apiKey: string | null
  endpoint: string | null
  temperature: number
  maxTokens: number
  language: 'ar' | 'en' | 'auto'
  systemPrompt: string | null
  assistantLevel: 1 | 2 | 3
  allowUserLevelOverride: boolean
  docMaxReads: number
  levelTokens: Record<string, number>
}
export interface AiCapability { id: number, key: string, label: string, icon: string | null, hint: string | null, enabled: boolean }
export interface AiKnowledgeEntry { id: number, title: string, content: string, tags: string[], enabled: boolean }
export interface AiQuota { key: string, name: string, maxTokensPerRequest: number, dailyTokens: number, weeklyTokens: number, monthlyTokens: number }
export interface AiConfig { settings: AiSettings, capabilities: AiCapability[], knowledge: AiKnowledgeEntry[], planQuotas: AiQuota[] }
export interface AiStats { enabled: boolean, provider: string, model: string | null, capabilitiesTotal: number, capabilitiesEnabled: number, knowledgeTotal: number, knowledgeActive: number, plansConfigured: number, assistantLevel: number, distribution: { label: string, value: number }[], usageToday?: number, usageMonth?: number, usageUsers?: number }
export interface AiSettingsPatch {
  enabled?: boolean
  provider?: AiProvider
  model?: string | null
  api_key?: string | null
  endpoint?: string | null
  temperature?: number
  max_tokens?: number
  language?: 'ar' | 'en' | 'auto'
  system_prompt?: string | null
  assistant_level?: number
  allow_user_level_override?: boolean
  level_tokens?: Record<string, number>
}
export interface AiQuotaField { maxTokensPerRequest: number, dailyTokens: number, weeklyTokens: number, monthlyTokens: number }
export interface AiKnowledgePayload { title: string, content: string, tags?: string[], enabled?: boolean }
// ——— إشراف المحادثات ———
export interface ChatSettings { directMessagesEnabled: boolean, assistantEnabled: boolean, moderationEnabled: boolean, retentionDays: number }
export interface ChatAiLinkage { aiEnabled: boolean, chatCapabilityEnabled: boolean, assistantEnabled: boolean, effectiveEnabled: boolean, provider: string, model: string | null, assistantLevel: number }
export interface ChatConfig { settings: ChatSettings, aiLinkage: ChatAiLinkage }
export interface ChatThread { key: string, participants: string[], messagesCount: number, lastBody: string, lastSender: string, lastMessageAt: string | null, unread: number }
export interface ChatMessage { id: number, senderId: string, senderName: string, body: string, read: boolean, at: string | null }
export interface ChatThreadDetail { key: string, participants: string[], messages: ChatMessage[] }
export interface ChatStats { threads: number, messages: number, activeToday: number, participants: number, series: { date: string, value: number }[], topSenders: { label: string, value: number }[] }
export interface ChatAssistantPreview { reply: string, level: number, tokensCap: number, provider: string, model: string | null, simulated: boolean, usedKnowledge: string[] }
export interface ChatSettingsPatch { direct_messages_enabled?: boolean, assistant_enabled?: boolean, moderation_enabled?: boolean, retention_days?: number }
// ——— الرؤى والتقارير ———
export interface ReportFunnelStage { stage: string, value: number }
export interface ReportOverview {
  funnel: ReportFunnelStage[]
  conversion: { applicationsPerOpportunity: number, interviewRate: number, completionRate: number }
  kpis: Record<string, number>
  growthSeries: { date: string, value: number }[]
  revenueSeries: { date: string, value: number }[]
}
export interface ReportResult {
  domain: string
  summary: { label: string, value: number }[]
  series?: { date: string, value: number }[]
  breakdown?: { label: string, value: number }[]
  columns: string[]
  rows: (string | number)[][]
}
export type ReportDomain = 'growth' | 'finance' | 'funnel' | 'engagement' | 'quality'
// ——— خطّ أنابيب التوظيف (ATS) ———
export type PipelineStageKey = 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected'
export interface PipelineCard { id: number, candidate: string, candidateEmail: string | null, opportunity: string, company: string | null, opportunityId: number, stage: PipelineStageKey, note: string | null, appliedAt: string | null, stageChangedAt: string | null }
export interface PipelineStage { key: PipelineStageKey, count: number, items: PipelineCard[] }
export interface PipelineBoard { stages: PipelineStage[] }
export interface PipelineStats { total: number, active: number, hired: number, rejected: number, hireRate: number, byStage: { label: string, value: number }[] }
export interface PipelineOpportunity { id: number, title: string, company: string | null, applications: number }
// ——— الأرشيف ———
export interface ArchiveItem { type: string, id: number, title: string, deletedAt: string | null }
export interface ArchiveStats { total: number, byType: { label: string, value: number }[] }

// جودة المقابلات (B3)
export type IntegrityLevel = 'low' | 'medium' | 'high'
export interface RubricCriterion { key: string, label: string, weight: number }
export interface AdminInterviewRubric { id: number, key: string, name: string, track: string, criteria: RubricCriterion[], active: boolean, isSystem: boolean }
export interface AdminInterviewRow { id: number, track: string, candidateName: string | null, status: string, score: number, reviewStatus: string, integrityScore: number, integrityLevel: IntegrityLevel, createdAt?: string }
export interface IntegritySignal { key: string, label: string, count: number }
export interface AdminInterviewDetail { id: number, track: string, candidateName: string | null, status: string, score: number, weightedScore: number | null, reviewStatus: string, rubric: { id: number, name: string } | null, breakdown: { key: string, label: string, weight: number, score: number }[], integrity: { score: number, level: IntegrityLevel, signals: IntegritySignal[] }, reviewedAt: string | null, createdAt?: string }
export interface InterviewQualityStats { total: number, avgScore: number, flagged: number, pending: number, highRisk: number, byStatus: { label: string, value: number }[], byIntegrity: { label: string, value: number }[] }
export interface InterviewCalibrationRow { track: string, count: number, avgScore: number, minScore: number, maxScore: number, highRiskRate: number, bias: number }
export interface InterviewCalibration { overallAvg: number, tracks: InterviewCalibrationRow[] }
export interface RubricPayload { name: string, track: string, criteria: RubricCriterion[], active?: boolean }

// العدالة والامتثال (B4)
export interface ComplianceAiOversight { weights: { skills: number, experience: number, category: number }, threshold: number, aiBoost: boolean, aiActive: boolean, boostEffective: boolean, governed: boolean }
export interface ComplianceOverview { totals: { applicants: number, hired: number, hireRate: number }, dimensions: string[], adverseFlags: number, compliant: boolean, aiOversight: ComplianceAiOversight }
export interface AdverseImpactGroup { group: string, applicants: number, hired: number, selectionRate: number, smallSample: boolean, impactRatio: number | null, adverse: boolean }
export interface AdverseImpact { dimension: string, groups: AdverseImpactGroup[], maxSelectionRate: number, adverseFlags: number, compliant: boolean, minSample: number }
export interface FunnelGroup { group: string, total: number, stages: Record<string, number> }
export interface ComplianceFunnel { dimension: string, stages: string[], groups: FunnelGroup[], representation: { label: string, value: number }[] }
export interface ComplianceAuditRow { id: number, actor: string | null, action: string | null, resource: string | null, targetId: number | null, status: number | null, at: string | null }
// ——— هويّة المنصّة (Branding) ———
export interface Branding {
  platformName: string
  tagline: string | null
  logoUrl: string | null
  preset: string
  primaryColor: string | null
  secondaryColor: string | null
  mode: 'dark' | 'light' | 'mixed'
  loginHeadline: string | null
  loginSubtext: string | null
}
export interface BrandingPatch {
  platform_name?: string
  tagline?: string | null
  logo_url?: string | null
  default_preset?: string
  primary_color?: string | null
  secondary_color?: string | null
  default_mode?: string
  login_headline?: string | null
  login_subtext?: string | null
}
// ——— المطابقة والفرز الذكيّ ———
export interface MatchSettings { skillsWeight: number, experienceWeight: number, categoryWeight: number, threshold: number, aiBoost: boolean }
export interface MatchBreakdown { skills: number, experience: number, category: number, aiBoost: boolean }
export interface MatchShortlistItem { applicationId: number, candidate: string, stage: string, score: number, breakdown: MatchBreakdown, matchedSkills: string[] }
export interface MatchShortlist { opportunity: { id: number, title: string, company: string | null, skills: string[] }, aiActive: boolean, threshold: number, shortlist: MatchShortlistItem[] }
export interface MatchSettingsResponse { settings: MatchSettings, aiActive: boolean }
export interface MatchSettingsPatch { skills_weight?: number, experience_weight?: number, category_weight?: number, threshold?: number, ai_boost?: boolean }
// ——— صحّة النظام ———
export interface HealthService { key: string, label: string, status: 'ok' | 'warn' | 'down', detail: string, metric: number | null, driver: string | null }
export interface HealthMetrics { users: number, pendingJobs: number, failedJobs: number, requestsToday: number, errorsToday: number, php: string, laravel: string, env: string, debug: boolean }
export interface HealthError { at: string | null, action: string, resource: string | null, status: number, actor: string | null }
export interface SystemHealth {
  services: HealthService[]
  metrics: HealthMetrics
  recentErrors: HealthError[]
  series: { date: string, value: number, errors: number }[]
  overall: 'ok' | 'warn' | 'down'
}
// ——— المساعد الذكيّ للمستخدم + الدعم ———
export interface AssistantGovernanceState { aiEnabled: boolean, capabilityEnabled: boolean, assistantEnabled: boolean, effectiveEnabled: boolean, level: number, provider: string, model: string | null }
export interface AssistantActivity { wallet: number, opportunities: number, applications: number, surveys: number }
export interface AssistantContext { name: string, role: string, kind?: string, tier: string, persona: string, dataAccess: boolean, proactive: boolean, activity?: AssistantActivity }
export interface AssistantNudge { tone: string, icon: string, text: string, action: string | null, actionLabel: string | null }
export interface AssistantQuota { tier: string, used: { daily: number, weekly: number, monthly: number }, limits: { daily: number, weekly: number, monthly: number, perRequest: number }, remaining: { daily: number | null, weekly: number | null, monthly: number | null } }
export interface AssistantContextResponse { governance: AssistantGovernanceState, context: AssistantContext, suggestions: string[], nudges: AssistantNudge[], quota?: AssistantQuota }
export interface AssistantMeta { level?: number, tokensCap?: number, provider?: string, model?: string | null, simulated?: boolean, persona?: string, usedKnowledge?: string[], nudges?: AssistantNudge[], blocked?: boolean, fallback?: boolean, fallbackReason?: string, usage?: { request: number, response: number } }
export interface AssistantMessageResponse { conversationId: number, reply: string, blocked: boolean, canEscalate: boolean, meta: AssistantMeta, nudges: AssistantNudge[], quotaBlocked?: string, quota?: AssistantQuota }
export interface AssistantConversationRow { id: number, title: string, messagesCount: number, updatedAt: string | null }
export interface AssistantMessageRow { id: number, role: 'user' | 'assistant', body: string, meta: AssistantMeta | null, at: string | null }
export interface AssistantConversationDetail { id: number, title: string, messages: AssistantMessageRow[] }
export interface AssistantSettings { dataAccess: boolean, proactive: boolean }
export interface SupportTicketRow { id: number, subject: string, category: string, priority: string, status: string, repliesCount: number, lastReplyAt: string | null, createdAt: string | null }
export interface SupportTicketReply { id: number, author: string, isStaff: boolean, body: string, at: string | null }
export interface SupportTicketDetail extends SupportTicketRow { assignee: string | null, replies: SupportTicketReply[] }
export interface SupportTicketCreate { subject: string, body: string, category?: string, priority?: string }

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
    notifications: () => get<NotificationRow[]>(API_PATHS.messaging.notifications),
    readAll: () => post(API_PATHS.messaging.readAll),
    readNotification: (id: number) => post(API_PATHS.messaging.readNotification(id)),
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
  /** هويّة المنصّة العامّة — تُطبَّق عند الإقلاع (بلا مصادقة) */
  branding: () => get<Branding | null>(API_PATHS.brandingPublic),
  /** المساعد الذكيّ للمستخدم — محكوم بحوكمة الذكاء، سياقيّ، مبادر */
  assistant: {
    context: () => get<AssistantContextResponse>(API_PATHS.assistant.context),
    message: (message: string, conversationId?: number) => post<AssistantMessageResponse>(API_PATHS.assistant.message, { message, conversationId }),
    conversations: () => get<AssistantConversationRow[]>(API_PATHS.assistant.conversations),
    conversation: (id: number) => get<AssistantConversationDetail>(API_PATHS.assistant.conversation(id)),
    settings: () => get<AssistantSettings>(API_PATHS.assistant.settings),
    updateSettings: (body: Partial<{ data_access: boolean, proactive: boolean }>) => put<AssistantSettings>(API_PATHS.assistant.settings, body),
    escalate: (body: { conversationId?: number, subject?: string, body?: string, category?: string, priority?: string }) => post<{ id: number, subject: string, status: string }>(API_PATHS.assistant.escalate, body),
  },
  /** تذاكر/محادثات الدعم من جهة المستخدم */
  support: {
    tickets: () => get<SupportTicketRow[]>(API_PATHS.support.tickets),
    createTicket: (body: SupportTicketCreate) => post<SupportTicketRow>(API_PATHS.support.tickets, body),
    ticket: (id: number) => get<SupportTicketDetail>(API_PATHS.support.ticket(id)),
    replyTicket: (id: number, body: string) => post<SupportTicketDetail>(API_PATHS.support.ticketReply(id), { body }),
  },
  /** لوحة الأدمن — /api/admin (حارس sanctum+admin؛ كل نقطة تفرض صلاحيّتها) */
  admin: {
    stats: () => get<AdminStats>(API_PATHS.admin.stats),
    users: (params?: AdminUserQuery) => getPage<AdminUser>(API_PATHS.admin.users, params as Record<string, unknown>),
    usersStats: () => get<AdminUsersStats>(API_PATHS.admin.usersStats),
    createUser: (body: AdminUserCreate) => post<AdminUser>(API_PATHS.admin.users, body),
    user: (id: number) => get<AdminUserDetail>(API_PATHS.admin.user(id)),
    updateUser: (id: number, body: AdminUserPatch) => patch<AdminUser>(API_PATHS.admin.user(id), body),
    suspendUser: (id: number) => post<AdminUser>(API_PATHS.admin.suspend(id)),
    activateUser: (id: number) => post<AdminUser>(API_PATHS.admin.activate(id)),
    setAdminRole: (id: number, role: string | null) => put<AdminUser>(API_PATHS.admin.adminRole(id), { role }),
    auditLogs: (params?: AdminMarketQuery) => getPage<AdminAuditLog>(API_PATHS.admin.auditLogs, params as Record<string, unknown>),
    auditStats: () => get<AdminAuditStats>(API_PATHS.admin.auditStats),
    exportAuditLogs: (params?: AdminMarketQuery) => getBlob(API_PATHS.admin.auditExport, params as Record<string, unknown>),
    settings: () => get<AdminSetting[]>(API_PATHS.admin.settings),
    updateSettings: (settings: Record<string, string | number | boolean>) => put<AdminSetting[]>(API_PATHS.admin.settings, { settings }),
    moderation: (params?: AdminMarketQuery) => getPage<AdminModerationItem>(API_PATHS.admin.moderation, params as Record<string, unknown>),
    moderationStats: () => get<AdminModerationStats>(API_PATHS.admin.moderationStats),
    resolveModeration: (id: number, decision: 'approved' | 'rejected' | 'resolved') => post<AdminModerationItem>(API_PATHS.admin.moderationResolve(id), { decision }),
    broadcasts: (params?: AdminMarketQuery) => getPage<AdminBroadcast>(API_PATHS.admin.broadcasts, params as Record<string, unknown>),
    broadcastsStats: () => get<AdminBroadcastStats>(API_PATHS.admin.broadcastsStats),
    broadcastAudience: (audience: string, audience_value?: string) => get<{ count: number }>(API_PATHS.admin.broadcastAudience, { audience, audience_value }),
    sendBroadcast: (body: AdminBroadcastCreate) => post<AdminBroadcast>(API_PATHS.admin.broadcasts, body),
    tickets: (params?: AdminMarketQuery & { priority?: string }) => getPage<AdminTicket>(API_PATHS.admin.tickets, params as Record<string, unknown>),
    ticketsStats: () => get<AdminSupportStats>(API_PATHS.admin.ticketsStats),
    ticket: (id: number) => get<AdminTicket>(API_PATHS.admin.ticket(id)),
    replyTicket: (id: number, body: string) => post<AdminTicket>(API_PATHS.admin.ticketReply(id), { body }),
    setTicketStatus: (id: number, status: string) => put<AdminTicket>(API_PATHS.admin.ticketStatus(id), { status }),
    assignTicket: (id: number) => post<AdminTicket>(API_PATHS.admin.ticketAssign(id)),
    roles: () => get<AdminRolesResponse>(API_PATHS.admin.roles),
    rolesStats: () => get<AdminRolesStats>(API_PATHS.admin.rolesStats),
    createRole: (name: string, permissions: string[]) => post<AdminRole>(API_PATHS.admin.roles, { name, permissions }),
    deleteRole: (role: string) => del(API_PATHS.admin.role(role)),
    updateRolePermissions: (role: string, permissions: string[]) => put(API_PATHS.admin.rolePermissions(role), { permissions }),
    roleMembers: (role: string) => get<RoleMembersResponse>(API_PATHS.admin.roleMembers(role)),
    assignRole: (role: string, userId: number) => post<RoleMember>(API_PATHS.admin.roleAssign(role), { userId }),
    revokeRole: (role: string, userId: number) => post(API_PATHS.admin.roleRevoke(role), { userId }),
    opportunities: (params?: AdminMarketQuery) => getPage<AdminOpportunity>(API_PATHS.admin.opportunities, params as Record<string, unknown>),
    opportunitiesStats: () => get<AdminOpportunitiesStats>(API_PATHS.admin.opportunitiesStats),
    deleteOpportunity: (id: number) => del(API_PATHS.admin.opportunity(id)),
    requests: (params?: AdminMarketQuery) => getPage<AdminMarketRequest>(API_PATHS.admin.requests, params as Record<string, unknown>),
    requestsStats: () => get<AdminRequestsStats>(API_PATHS.admin.requestsStats),
    deleteRequest: (id: number) => del(API_PATHS.admin.request(id)),
    surveys: (params?: AdminMarketQuery) => getPage<AdminSurvey>(API_PATHS.admin.surveys, params as Record<string, unknown>),
    surveysStats: () => get<AdminSurveysStats>(API_PATHS.admin.surveysStats),
    closeSurvey: (id: number) => post(API_PATHS.admin.surveyClose(id)),
    deleteSurvey: (id: number) => del(API_PATHS.admin.survey(id)),
    surveyTemplates: (params?: AdminMarketQuery) => getPage<AdminSurveyTemplate>(API_PATHS.admin.surveyTemplates, params as Record<string, unknown>),
    surveyTemplatesStats: () => get<AdminSurveyTemplatesStats>(API_PATHS.admin.surveyTemplatesStats),
    createSurveyTemplate: (body: AdminSurveyTemplateCreate) => post<AdminSurveyTemplate>(API_PATHS.admin.surveyTemplates, body),
    updateSurveyTemplate: (id: number, body: Partial<AdminSurveyTemplateCreate>) => put<AdminSurveyTemplate>(API_PATHS.admin.surveyTemplate(id), body),
    deleteSurveyTemplate: (id: number) => del(API_PATHS.admin.surveyTemplate(id)),
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
    interviewersStats: () => get<AdminInterviewersStats>(API_PATHS.admin.interviewersStats),
    createInterviewer: (body: AdminInterviewerCreate) => post<AdminInterviewer>(API_PATHS.admin.interviewers, body),
    approveInterviewer: (id: number) => post<AdminInterviewer>(API_PATHS.admin.interviewerApprove(id)),
    rejectInterviewer: (id: number) => post<AdminInterviewer>(API_PATHS.admin.interviewerReject(id)),
    deleteInterviewer: (id: number) => del(API_PATHS.admin.interviewer(id)),
    plans: (params?: AdminMarketQuery) => getPage<AdminPlan>(API_PATHS.admin.plans, params as Record<string, unknown>),
    plansStats: () => get<AdminPlansStats>(API_PATHS.admin.plansStats),
    invoices: (params?: AdminMarketQuery & { plan_key?: string }) => getPage<AdminInvoice>(API_PATHS.admin.invoices, params as Record<string, unknown>),
    invoicesStats: () => get<AdminBillingStats>(API_PATHS.admin.invoicesStats),
    refundInvoice: (id: number) => post<AdminInvoice>(API_PATHS.admin.invoiceRefund(id)),
    createPlan: (body: AdminPlanCreate) => post<AdminPlan>(API_PATHS.admin.plans, body),
    updatePlan: (id: number, body: AdminPlanPatch) => put<AdminPlan>(API_PATHS.admin.plan(id), body),
    deletePlan: (id: number) => del(API_PATHS.admin.plan(id)),
    // الذكاء الاصطناعيّ
    aiConfig: () => get<AiConfig>(API_PATHS.admin.ai),
    aiStats: () => get<AiStats>(API_PATHS.admin.aiStats),
    updateAiSettings: (body: AiSettingsPatch) => put<AiSettings>(API_PATHS.admin.aiSettings, body),
    updateAiQuotas: (body: { doc_max_reads?: number, quotas?: Record<string, AiQuotaField> }) =>
      put<{ planQuotas: AiQuota[], docMaxReads: number }>(API_PATHS.admin.aiQuotas, body),
    reportsOverview: () => get<ReportOverview>(API_PATHS.admin.reportsOverview),
    report: (domain: ReportDomain, from?: string, to?: string) => get<ReportResult>(API_PATHS.admin.reportsReport, { domain, from, to }),
    systemHealth: () => get<SystemHealth>(API_PATHS.admin.systemHealth),
    pipelineBoard: (opportunityId?: number) => get<PipelineBoard>(API_PATHS.admin.pipelineBoard, opportunityId ? { opportunity_id: opportunityId } : undefined),
    pipelineStats: (opportunityId?: number) => get<PipelineStats>(API_PATHS.admin.pipelineStats, opportunityId ? { opportunity_id: opportunityId } : undefined),
    pipelineOpportunities: () => get<PipelineOpportunity[]>(API_PATHS.admin.pipelineOpportunities),
    movePipeline: (id: number, toStage: string, note?: string) => post<PipelineCard>(API_PATHS.admin.pipelineMove(id), { to_stage: toStage, note }),
    bulkMovePipeline: (ids: number[], toStage: string) => post<{ moved: number }>(API_PATHS.admin.pipelineBulkMove, { ids, to_stage: toStage }),
    matchingSettings: () => get<MatchSettingsResponse>(API_PATHS.admin.matchingSettings),
    updateMatchingSettings: (body: MatchSettingsPatch) => put<MatchSettings>(API_PATHS.admin.matchingSettings, body),
    matchingShortlist: (opportunityId: number) => get<MatchShortlist>(API_PATHS.admin.matchingShortlist, { opportunity_id: opportunityId }),
    branding: () => get<Branding>(API_PATHS.admin.branding),
    updateBranding: (body: BrandingPatch) => put<Branding>(API_PATHS.admin.branding, body),
    archive: (params?: { type?: string, page?: number }) => getPage<ArchiveItem>(API_PATHS.admin.archive, params as Record<string, unknown>),
    archiveStats: () => get<ArchiveStats>(API_PATHS.admin.archiveStats),
    restoreArchive: (type: string, id: number) => post<{ restored: boolean }>(API_PATHS.admin.archiveRestore, { type, id }),
    purgeArchive: (type: string, id: number) => post<{ purged: boolean }>(API_PATHS.admin.archivePurge, { type, id }),
    // جودة المقابلات (B3)
    interviewQuality: (params?: Record<string, unknown>) => getPage<AdminInterviewRow>(API_PATHS.admin.interviewQuality, params),
    interviewDetail: (id: number) => get<AdminInterviewDetail>(API_PATHS.admin.interviewQualityItem(id)),
    reviewInterview: (id: number, status: string) => post<AdminInterviewRow>(API_PATHS.admin.interviewQualityReview(id), { status }),
    interviewQualityStats: () => get<InterviewQualityStats>(API_PATHS.admin.interviewQualityStats),
    interviewCalibration: () => get<InterviewCalibration>(API_PATHS.admin.interviewCalibration),
    interviewRubrics: () => get<AdminInterviewRubric[]>(API_PATHS.admin.interviewRubrics),
    createRubric: (body: RubricPayload) => post<AdminInterviewRubric>(API_PATHS.admin.interviewRubrics, body),
    updateRubric: (id: number, body: Partial<RubricPayload>) => put<AdminInterviewRubric>(API_PATHS.admin.interviewRubricItem(id), body),
    deleteRubric: (id: number) => del(API_PATHS.admin.interviewRubricItem(id)),
    // العدالة والامتثال (B4)
    complianceOverview: () => get<ComplianceOverview>(API_PATHS.admin.complianceOverview),
    complianceAdverseImpact: (dimension: string) => get<AdverseImpact>(API_PATHS.admin.complianceAdverseImpact, { dimension }),
    complianceFunnel: (dimension: string) => get<ComplianceFunnel>(API_PATHS.admin.complianceFunnel, { dimension }),
    complianceAuditTrail: () => get<ComplianceAuditRow[]>(API_PATHS.admin.complianceAuditTrail),
    toggleAiCapability: (id: number) => post<AiCapability>(API_PATHS.admin.aiCapabilityToggle(id)),
    addAiKnowledge: (body: AiKnowledgePayload) => post<AiKnowledgeEntry>(API_PATHS.admin.aiKnowledge, body),
    updateAiKnowledge: (id: number, body: Partial<AiKnowledgePayload>) => put<AiKnowledgeEntry>(API_PATHS.admin.aiKnowledgeItem(id), body),
    deleteAiKnowledge: (id: number) => del(API_PATHS.admin.aiKnowledgeItem(id)),
    // إشراف المحادثات
    chatConfig: () => get<ChatConfig>(API_PATHS.admin.chat),
    updateChatSettings: (body: ChatSettingsPatch) => put<ChatSettings>(API_PATHS.admin.chatSettings, body),
    chatStats: () => get<ChatStats>(API_PATHS.admin.chatStats),
    chatThreads: (params?: { page?: number, perPage?: number, q?: string }) => getPage<ChatThread>(API_PATHS.admin.chatThreads, params as Record<string, unknown>),
    chatThread: (key: string) => get<ChatThreadDetail>(API_PATHS.admin.chatThread(key)),
    chatAssistantPreview: (prompt: string) => post<ChatAssistantPreview>(API_PATHS.admin.chatAssistantPreview, { prompt }),
  },
  /** تنفيذ عقد AI عبر وسيط الخادم — بديل claudeAi المباشر (يحمي المفتاح) */
  ai: <T>(contract: string, payload: Record<string, unknown>) => post<T>(API_PATHS.ai(contract), payload),
}
