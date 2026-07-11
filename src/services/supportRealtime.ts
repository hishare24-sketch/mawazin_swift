import { USE_REAL_API } from '@/services/api'
import { makeEcho } from '@/services/echo'

/**
 * ===== البثّ اللحظيّ لردود الدعم (Reverb) =====
 *
 * الردّ يُدرَج عبر REST فيبثّ الخادم حدث `ticket.reply`:
 * - ردّ الدعم → قناة صاحب التذكرة الخاصّة `user.{uuid}` (مركز المساعدة عند المستخدم).
 * - ردّ المستخدم → قناة الأدمن `support.admin` (كنسول الدعم).
 * التهيئة عبر مصنع Echo المشترك. في وضع المحاكاة كلّ الدوال محايدة.
 */

export interface TicketReplyEvent {
  ticketId: number
  subject: string
  status: string
  reply: { id: number, author: string, isStaff: boolean, body: string, at: string | null }
}

/** يشترك في ردود تذاكر المستخدم لحظيًّا على قناته — يعيد دالة إلغاء. */
export function subscribeUserTickets(uuid: string, onReply: (e: TicketReplyEvent) => void): () => void {
  if (!USE_REAL_API || !uuid)
    return () => {}

  const echo = makeEcho()
  echo.private(`user.${uuid}`).listen('.ticket.reply', (e: TicketReplyEvent) => onReply(e))

  return () => {
    try { echo.leave(`user.${uuid}`) }
    finally { echo.disconnect() }
  }
}

/** يشترك في طابور ردود الأدمن لحظيًّا (كنسول الدعم) — يعيد دالة إلغاء. */
export function subscribeAdminSupport(onReply: (e: TicketReplyEvent) => void): () => void {
  if (!USE_REAL_API)
    return () => {}

  const echo = makeEcho()
  echo.private('support.admin').listen('.ticket.reply', (e: TicketReplyEvent) => onReply(e))

  return () => {
    try { echo.leave('support.admin') }
    finally { echo.disconnect() }
  }
}
