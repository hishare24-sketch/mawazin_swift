import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import { useAuthStore } from '@/stores/AuthStore'

/**
 * ===== مصنع عميل Reverb (laravel-echo) المشترك =====
 * مصدر واحد لتهيئة النقل + توثيق `/broadcasting/auth` بتوكن Bearer — يستهلكه كلّ
 * خدمات البثّ اللحظيّ (الإشعارات/الدعم/الرسائل) فلا يتكرّر إعداد النقل ولا ينحرف.
 */

/** أصل الخادم (بلا لاحقة /api) — قاعدة نقطة `/broadcasting/auth`. */
export function serverBase(): string {
  const raw = (import.meta.env.VITE_BASE_API_URL as string) || ''
  return raw.replace(/\/api\/?$/, '') || window.location.origin
}

/** ينشئ عميل Echo موصّلًا بـReverb موثّقًا بتوكن الجلسة الحاليّ. */
export function makeEcho(): Echo<'reverb'> {
  const token = useAuthStore().getToken
  ;(window as unknown as { Pusher: typeof Pusher }).Pusher = Pusher

  const scheme = (import.meta.env.VITE_REVERB_SCHEME as string) || 'http'
  const port = Number(import.meta.env.VITE_REVERB_PORT || 8091)

  return new Echo({
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
}
