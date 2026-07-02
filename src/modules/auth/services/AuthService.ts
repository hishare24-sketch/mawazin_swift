import axios from 'axios'
import type { LoginPayload, RegisterPayload, User } from '@/interfaces/Auth'
import { ROLE_PERMISSIONS, defaultRoleEntries } from '@/services/roles'

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

class AuthService {
  // Toggle when the real backend is ready
  private useMock = true

  async login(payload: LoginPayload): Promise<User> {
    if (this.useMock) {
      await new Promise(r => setTimeout(r, 600))
      // Infer role from a "+role" hint in the email, default to seeker
      const role = (['company', 'endorser', 'admin', 'interviewer', 'coach', 'trainer', 'consultant'] as const).find(r => payload.email.includes(r)) ?? 'seeker'
      return buildMockUser({
        email: payload.email,
        name: payload.email.split('@')[0] || 'مستخدم',
        role,
      })
    }
    const { data } = await axios.post('auth/login', payload)
    return data.data
  }

  async register(payload: RegisterPayload): Promise<User> {
    if (this.useMock) {
      await new Promise(r => setTimeout(r, 700))
      return buildMockUser({
        email: payload.email,
        name: payload.name,
        phone: payload.phone,
        role: payload.role,
      })
    }
    const { data } = await axios.post('auth/register', payload)
    return data.data
  }

  async logout(): Promise<void> {
    if (this.useMock)
      return
    await axios.post('auth/logout')
  }
}

export const authService = new AuthService()
