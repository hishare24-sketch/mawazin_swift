import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { UserRole } from '@/interfaces/Auth'
import { useAuthStore } from '@/stores/AuthStore'
import { useNotificationsStore } from '@/stores/NotificationsStore'

// ===== طابور اعتماد الأدوار — تظهر لدى المدير وتُقفل حلقة «آلية الانضمام والاعتماد» =====

export interface RoleRequest {
  id: number
  userName: string
  role: UserRole
  note: string
  date: string
  status: 'pending' | 'approved' | 'rejected'
  /** طلب المستخدم الحالي في هذا المتصفح (لتفعيل دوره فور الاعتماد) */
  mine?: boolean
}

const STORAGE_KEY = 'roleRequests'

const seed: RoleRequest[] = [
  { id: 1, userName: 'سلمى العنزي', role: 'interviewer', note: 'خبيرة موارد بشرية — 8 سنوات، أهلية AI: مراجعة', date: '2026-07-01', status: 'pending' },
  { id: 2, userName: 'فهد الدوسري', role: 'coach', note: 'مرشد مسارات تقنية، 120 جلسة سابقة خارج المنصة', date: '2026-07-01', status: 'pending' },
  { id: 3, userName: 'نوف الشهري', role: 'trainer', note: 'مدربة TypeScript معتمدة — طلبت باقة الورش', date: '2026-06-30', status: 'pending' },
]

function load(): RoleRequest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : seed.map(r => ({ ...r }))
  }
  catch {
    return seed.map(r => ({ ...r }))
  }
}

let nextId = 900

export const useRoleRequestsStore = defineStore('roleRequests', () => {
  const requests = ref<RoleRequest[]>(load())
  watch(requests, v => localStorage.setItem(STORAGE_KEY, JSON.stringify(v)), { deep: true })

  const pending = computed(() => requests.value.filter(r => r.status === 'pending'))

  function add(role: UserRole, note: string, mine = false): RoleRequest {
    const auth = useAuthStore()
    const r: RoleRequest = {
      id: nextId++,
      userName: mine ? (auth.authUser?.name ?? 'مستخدم') : 'مستخدم',
      role,
      note,
      date: new Date().toISOString().slice(0, 10),
      status: 'pending',
      mine,
    }
    requests.value.unshift(r)
    return r
  }

  /** قرار المدير — الاعتماد يفعّل دور صاحب الطلب إن كان في هذا المتصفح */
  function decide(id: number, approve: boolean) {
    const r = requests.value.find(x => x.id === id)
    if (!r || r.status !== 'pending')
      return
    r.status = approve ? 'approved' : 'rejected'
    const notifications = useNotificationsStore()
    if (r.mine) {
      const auth = useAuthStore()
      if (approve)
        auth.activateRole(r.role)
      notifications.push({
        icon: approve ? 'mdi-shield-check-outline' : 'mdi-shield-off-outline',
        color: approve ? 'success' : 'error',
        title: approve ? 'اعتُمد دورك الجديد' : 'اعتُذر عن طلب الدور',
        body: approve ? 'أصبح الدور نشطًا — بدّل إليه من قائمة حسابك.' : 'يمكنك تحسين ملفك وإعادة الطلب لاحقًا.',
        category: 'system',
        actionTo: approve ? `/${r.role}` : undefined,
        actionLabel: approve ? 'فتح لوحة الدور' : undefined,
      })
    }
    else {
      notifications.push({
        icon: 'mdi-gavel',
        color: approve ? 'success' : 'warning',
        title: approve ? `اعتمدت طلب ${r.userName}` : `رفضت طلب ${r.userName}`,
        body: r.note,
        category: 'system',
      })
    }
  }

  /** محاكاة مراجعة المنصة لطلب المستخدم الحالي (تُبقي العرض الفردي حيًّا) */
  function simulatePlatformReview(requestId: number, delayMs = 10000) {
    setTimeout(() => {
      const r = requests.value.find(x => x.id === requestId)
      if (r && r.status === 'pending')
        decide(r.id, true)
    }, delayMs)
  }

  return { requests, pending, add, decide, simulatePlatformReview }
})
