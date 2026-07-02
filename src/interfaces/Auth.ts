export type UserRole = 'seeker' | 'company' | 'endorser' | 'admin' | 'interviewer' | 'coach' | 'trainer' | 'consultant'

// Mirrors the planned backend `user_roles` table (status lifecycle per role)
export type RoleStatus = 'active' | 'inactive' | 'pending' | 'suspended'

export interface RoleEntry {
  role: UserRole
  status: RoleStatus
  activated_at?: string
  created_at?: string
}

export interface User {
  id: number
  uuid: string
  name: string
  email: string
  phone?: string
  image_path?: string
  token: string
  /** الدور النشط حاليًا — يقابل عمود current_role في المخطط الخلفي */
  role: UserRole
  /** الأدوار المملوكة وحالاتها — يقابل جدول user_roles */
  roles: RoleEntry[]
  permissions: string[]
  created_at?: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  name: string
  email: string
  phone?: string
  password: string
  password_confirmation: string
  role: UserRole
}
