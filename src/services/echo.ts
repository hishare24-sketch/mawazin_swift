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

/** مضيف/منفذ Reverb — إن فُرغت متغيّرات Vite يُستنتج من عنوان الصفحة (مناسب لـ Docker/nginx). */
export function reverbEndpoint() {
  const scheme
    = (import.meta.env.VITE_REVERB_SCHEME as string)
      || (typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'https' : 'http')
  const host
    = (import.meta.env.VITE_REVERB_HOST as string)
      || (typeof window !== 'undefined' ? window.location.hostname : 'localhost')
  const portRaw = import.meta.env.VITE_REVERB_PORT as string | undefined
  const port = portRaw !== undefined && portRaw !== ''
    ? Number(portRaw)
    : Number(
      (typeof window !== 'undefined' && window.location.port)
        || (scheme === 'https' ? 443 : 80),
    )
  return { scheme, host, port }
}

/** ينشئ عميل Echo موصّلًا بـReverb موثّقًا بتوكن الجلسة الحاليّ. */
export function makeEcho(): Echo<'reverb'> {
  const token = useAuthStore().getToken
  ;(window as unknown as { Pusher: typeof Pusher }).Pusher = Pusher

  const { scheme, host, port } = reverbEndpoint()

  return new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY as string,
    wsHost: host,
    wsPort: port,
    wssPort: port,
    forceTLS: scheme === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: `${serverBase()}/broadcasting/auth`,
    auth: { headers: { Authorization: `Bearer ${token}` } },
  })
}
