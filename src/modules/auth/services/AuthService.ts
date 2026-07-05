import type { User as SupabaseAuthUser } from '@supabase/supabase-js'
import type { LoginPayload, RegisterPayload, User, UserRole } from '@/interfaces/Auth'
import { ROLE_PERMISSIONS, defaultRoleEntries } from '@/services/roles'
import { getSupabase, supabaseEnabled } from '@/services/supabase'
import { USE_REAL_API, type ApiAuthUser, api } from '@/services/api'

/** هل المصادقة على باك-إند حقيقي؟ — يستهلكه العرض دون معرفة المزوّد (NestJS أو Supabase) */
export const realAuthEnabled = USE_REAL_API || supabaseEnabled

function buildMockUser(partial: Partial<User> & Pick<User, 'email' | 'role' | 'name'>): User {
  return {
    id: Math.floor(Math.random() * 100000),
    uuid: crypto.randomUUID(),
    name: partial.name,
    email: partial.email,
    phone: partial.phone,
    role: partial.role,
    roles: partial.roles ?? defaultRoleEntries(partial.role),
    token: `mock-token-${Date.now()}`,
    permissions: ROLE_PERMISSIONS[partial.role],
    created_at: new Date().toISOString(),
  }
}

/** يبني User المنصة من مستخدم Supabase — الاسم والدور والهاتف من user_metadata */
function fromSupabaseUser(u: SupabaseAuthUser, token: string): User {
  const meta = (u.user_metadata ?? {}) as { name?: string, role?: UserRole, phone?: string }
  const role: UserRole = meta.role ?? 'seeker'
  return {
    // رقم ثابت مشتق من uuid (الواجهة تتوقع id رقميًا)
    id: Number.parseInt(u.id.replace(/-/g, '').slice(0, 8), 16),
    uuid: u.id,
    name: meta.name ?? u.email?.split('@')[0] ?? 'مستخدم',
    email: u.email ?? '',
    phone: meta.phone,
    role,
    roles: defaultRoleEntries(role),
    token,
    permissions: ROLE_PERMISSIONS[role],
    created_at: u.created_at,
  }
}

/** يبني User المنصة من مستخدم الباك-إند (NestJS). الأدوار الفورية تُشتق من الدور المفرد. */
function fromNestUser(u: ApiAuthUser, token: string): User {
  const role = (u.role ?? 'seeker') as UserRole
  return {
    id: u.id,
    uuid: u.uuid,
    name: u.name,
    email: u.email,
    phone: u.phone ?? undefined,
    role,
    roles: defaultRoleEntries(role),
    token,
    permissions: ROLE_PERMISSIONS[role],
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

/** تعريب أخطاء Supabase Auth الشائعة */
function arabicAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials'))
    return 'بيانات الدخول غير صحيحة'
  if (m.includes('already registered') || m.includes('already been registered') || m.includes('already exists'))
    return 'هذا البريد مسجّل مسبقًا — جرّب تسجيل الدخول'
  if (m.includes('password should be at least'))
    return 'كلمة المرور قصيرة — 6 أحرف على الأقل'
  if (m.includes('rate limit') || m.includes('too many'))
    return 'محاولات كثيرة — انتظر قليلًا ثم أعد المحاولة'
  if (m.includes('not confirmed'))
    return 'الحساب بحاجة لتأكيد البريد أولًا'
  if (m.includes('invalid') && m.includes('email'))
    return 'صيغة البريد الإلكتروني غير صحيحة'
  return 'تعذّرت العملية — حاول مرة أخرى'
}

class AuthService {
  // المحاكاة تعمل تلقائيًا عند غياب مفاتيح Supabase (اختبارات/تطوير بلا اتصال)

  async login(payload: LoginPayload): Promise<User> {
    // الأولوية لمكدّس الفريق (NestJS) عند تفعيل المفتاح
    if (USE_REAL_API) {
      try {
        const { user, token } = await api.auth.login({ email: payload.email, password: payload.password })
        return fromNestUser(user, token)
      }
      catch (err) {
        throw new Error(apiErrorMessage(err))
      }
    }
    const sb = getSupabase()
    if (sb) {
      const { data, error } = await sb.auth.signInWithPassword({
        email: payload.email,
        password: payload.password,
      })
      if (error || !data.session)
        throw new Error(arabicAuthError(error?.message ?? ''))
      return fromSupabaseUser(data.user, data.session.access_token)
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
        })
        return fromNestUser(user, token)
      }
      catch (err) {
        throw new Error(apiErrorMessage(err))
      }
    }
    const sb = getSupabase()
    if (sb) {
      const { data, error } = await sb.auth.signUp({
        email: payload.email,
        password: payload.password,
        options: {
          data: { name: payload.name, role: payload.role, phone: payload.phone },
        },
      })
      if (error || !data.user)
        throw new Error(arabicAuthError(error?.message ?? ''))
      // مع التأكيد التلقائي المفعّل تعود جلسة فورًا؛ وإلا نطلب تأكيد البريد
      if (!data.session)
        throw new Error('أنشئ الحساب — تحقق من بريدك لتأكيده ثم سجّل الدخول')
      return fromSupabaseUser(data.user, data.session.access_token)
    }
    await new Promise(r => setTimeout(r, 700))
    return buildMockUser({
      email: payload.email,
      name: payload.name,
      phone: payload.phone,
      role: payload.role,
    })
  }

  async logout(): Promise<void> {
    if (USE_REAL_API) {
      // التوكن عديم الحالة — الخروج بإسقاطه محليًا؛ ننادي الخادم على سبيل الإكمال
      await api.auth.logout().catch(() => { /* الخروج المحلي يكفي */ })
      return
    }
    const sb = getSupabase()
    if (sb) {
      await sb.auth.signOut().catch(() => { /* الخروج المحلي يكفي */ })
      return
    }
    // محاكاة: لا شيء خادمي
  }
}

export const authService = new AuthService()
