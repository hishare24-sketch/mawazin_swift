import { type NotificationRow, USE_REAL_API } from '@/services/api'
import { makeEcho } from '@/services/echo'

/**
 * ===== الإشعارات اللحظيّة (Reverb) =====
 * الخادم يبثّ `notification.new` على قناة المستخدم الخاصّة `user.{uuid}` عند إنشاء إشعار
 * (بثّ أدمن/تدفّق داخليّ). التهيئة عبر مصنع Echo المشترك. في وضع المحاكاة الدالة محايدة.
 */

/** يشترك في إشعارات المستخدم لحظيًّا — يعيد دالة إلغاء. */
export function subscribeNotifications(uuid: string, onNotification: (n: NotificationRow) => void): () => void {
  if (!USE_REAL_API || !uuid)
    return () => {}

  const echo = makeEcho()
  echo.private(`user.${uuid}`).listen('.notification.new', (e: { notification: NotificationRow }) => onNotification(e.notification))

  return () => {
    try { echo.leave(`user.${uuid}`) }
    finally { echo.disconnect() }
  }
}
