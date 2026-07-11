import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import { type NotificationRow, USE_REAL_API } from '@/services/api'
import { useAuthStore } from '@/stores/AuthStore'

/**
 * ===== الإشعارات اللحظيّة (Reverb) =====
 * الخادم يبثّ `notification.new` على قناة المستخدم الخاصّة `user.{uuid}` عند إنشاء إشعار
 * (بثّ أدمن/تدفّق داخليّ). يوثَّق بتوكن Bearer على `/broadcasting/auth`.
 * في وضع المحاكاة الدالة محايدة.
 */

function serverBase(): string {
  const raw = (import.meta.env.VITE_BASE_API_URL as string) || ''
  return raw.replace(/\/api\/?$/, '') || window.location.origin
}

/** يشترك في إشعارات المستخدم لحظيًّا — يعيد دالة إلغاء. */
export function subscribeNotifications(uuid: string, onNotification: (n: NotificationRow) => void): () => void {
  if (!USE_REAL_API || !uuid)
    return () => {}

  const token = useAuthStore().getToken
  ;(window as unknown as { Pusher: typeof Pusher }).Pusher = Pusher

  const scheme = (import.meta.env.VITE_REVERB_SCHEME as string) || 'http'
  const port = Number(import.meta.env.VITE_REVERB_PORT || 8091)

  const echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY as string,
    wsHost: (import.meta.env.VITE_REVERB_HOST as string) || 'localhost',
    wsPort: port,
    wssPort: port,
    forceTLS: scheme === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: `${serverBase()}/broadcasting/auth`,
    auth: { headers: { Authorization: `Bearer ${token}` } },
  })

  echo.private(`user.${uuid}`).listen('.notification.new', (e: { notification: NotificationRow }) => onNotification(e.notification))

  return () => {
    try { echo.leave(`user.${uuid}`) }
    finally { echo.disconnect() }
  }
}
