import type { LoginPayload, RegisterPayload, User, UserRole } from '@/interfaces/Auth'
import { ROLE_PERMISSIONS, defaultRoleEntries } from '@/services/roles'
import { USE_REAL_API, type ApiAuthUser, api } from '@/services/api'

/** هل المصادقة على باك-إند حقيقي (NestJS)؟ — يستهلكه العرض دون معرفة المزوّد */
export const realAuthEnabled = USE_REAL_API

function buildMockUser(partial: Partial<User> & Pick<User, 'email' | 'role' | 'name'>): User {
  return {
    id: Math.floor(Math.random() * 100000),
    uuid: crypto.randomUUID(),
    name: partial.name,
    email: partial.email,
    phone: partial.phone,
    kind: partial.kind,
    role: partial.role,
    roles: partial.roles ?? defaultRoleEntries(partial.role),
    token: `mock-token-${Date.now()}`,
    permissions: ROLE_PERMISSIONS[partial.role],
    created_at: new Date().toISOString(),
  }
}

/** يبني User المنصة من مستخدم الباك-إند (NestJS). الأدوار الفورية تُشتق من الدور المفرد. */
function fromNestUser(u: ApiAuthUser, token: string): User {
  // حساب أدمن يُكتشف عبر adminRoles الآتية من الخادم — يُفتح الكونسول وتُعتمد صلاحيّاته الفعليّة
  const isAdmin = (u.adminRoles?.length ?? 0) > 0
  const role = (isAdmin ? 'admin' : (u.role ?? 'seeker')) as UserRole
  return {
    id: u.id,
    uuid: u.uuid,
    name: u.name,
    email: u.email,
    phone: u.phone ?? undefined,
    kind: u.kind,
    role,
    roles: defaultRoleEntries(role),
    token,
    permissions: isAdmin && u.permissions?.length ? u.permissions : ROLE_PERMISSIONS[role],
    created_at: u.created_at,
  }
}

/** رسالة عربية من خطأ طبقة الـAPI ({ status, message, fieldErrors }) */
function apiErrorMessage(err: unknown): string {
  const e = err as { message?: string, fieldErrors?: Record<string, string[]>, status?: number }
  if (e?.status === 0)
    return 'تعذّر الاتصال بالخادم — تأكد من تشغيل الباك-إند'
  const firstField = e?.fieldErrors && Object.values(e.fieldErrors)[0]?.[0]
  return firstField ?? e?.message ?? 'تعذّرت العملية — حاول مرة أخرى'
}

/**
 * المصادقة: مكدّس الفريق (NestJS) عند تفعيل المفتاح، وإلا محاكاة محلية
 * (اختبارات/عرض تفاعلي بلا اتصال). لا مزوّد ثالث.
 */
class AuthService {
  async login(payload: LoginPayload): Promise<User> {
    if (USE_REAL_API) {
      try {
        const { user, token } = await api.auth.login({ email: payload.email, password: payload.password })
        return fromNestUser(user, token)
      }
      catch (err) {
        throw new Error(apiErrorMessage(err))
      }
    }
    await new Promise(r => setTimeout(r, 600))
    // محاكاة: استنتاج الدور من تلميح "+role" في البريد، والافتراضي باحث
    const role = (['company', 'endorser', 'admin', 'interviewer', 'coach', 'trainer', 'consultant'] as const).find(r => payload.email.includes(r)) ?? 'seeker'
    return buildMockUser({
      email: payload.email,
      name: payload.email.split('@')[0] || 'مستخدم',
      role,
    })
  }

  async register(payload: RegisterPayload): Promise<User> {
    if (USE_REAL_API) {
      try {
        const { user, token } = await api.auth.register({
          name: payload.name,
          email: payload.email,
          password: payload.password,
          phone: payload.phone,
          role: payload.role,
          kind: payload.kind,
        })
        return fromNestUser(user, token)
      }
      catch (err) {
        throw new Error(apiErrorMessage(err))
      }
    }
    await new Promise(r => setTimeout(r, 700))
    return buildMockUser({
      email: payload.email,
      name: payload.name,
      phone: payload.phone,
      kind: payload.kind,
      role: payload.role ?? 'seeker',
    })
  }

  async logout(): Promise<void> {
    if (USE_REAL_API) {
      // التوكن عديم الحالة — الخروج بإسقاطه محليًا؛ ننادي الخادم على سبيل الإكمال
      await api.auth.logout().catch(() => { /* الخروج المحلي يكفي */ })
    }
    // محاكاة: لا شيء خادمي
  }
}

export const authService = new AuthService()
