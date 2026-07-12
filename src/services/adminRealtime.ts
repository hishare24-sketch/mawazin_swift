import { USE_REAL_API } from '@/services/api'
import { makeEcho } from '@/services/echo'

/**
 * ===== البثّ اللحظيّ لكنسول الأدمن (Reverb) =====
 *
 * بلاغات المحتوى الجديدة تُبثّ على قناة الأدمن `admin.governance` (الحدث `moderation.created`)
 * فتظهر في كنسول الإشراف فور ورودها. نفس نمط بثّ الدعم؛ في وضع المحاكاة كلّ الدوال محايدة.
 */

export interface ModerationCreatedEvent {
  id: number
  type: string
  subject: string
  submitter: string | null
  targetRef: string | null
  reason: string | null
  status: string
  at: string | null
}

/** يشترك في بلاغات الإشراف الجديدة لحظيًّا (كنسول الأدمن) — يعيد دالة إلغاء. */
export function subscribeAdminModeration(onNew: (e: ModerationCreatedEvent) => void): () => void {
  if (!USE_REAL_API)
    return () => {}

  const echo = makeEcho()
  echo.private('admin.governance').listen('.moderation.created', (e: ModerationCreatedEvent) => onNew(e))

  return () => {
    try { echo.leave('admin.governance') }
    finally { echo.disconnect() }
  }
}
