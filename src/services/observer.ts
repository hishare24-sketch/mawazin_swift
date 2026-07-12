// مُلتقِط أخطاء وقت-التشغيل الأماميّ → يرسل إشارات إلى POST /v1/observe
// (مركز قيادة الجودة، ف3). يستعمل fetch مباشرةً كي يتجاوز اعتراضات axios فلا
// تنشأ حلقة (خطأ الإبلاغ لا يُبلَّغ عنه). يُخمَد التكرار بالبصمة خلال نافذة زمنيّة.
import router from '@/router'

const USE_REAL = import.meta.env.VITE_USE_REAL_API === 'true'
const BASE = (import.meta.env.VITE_BASE_API_URL as string) || '/api'
const THROTTLE_MS = 30_000
const sent = new Map<string, number>()

export interface Signal {
  type: 'render' | 'unhandled' | 'api_5xx' | 'api_4xx' | 'console' | 'slow'
  message: string
  stack?: string
  status?: number
  route?: string
  blank?: boolean
}

function routePath(): string {
  try { return router.currentRoute.value?.fullPath || window.location.pathname }
  catch { return window.location.pathname }
}

/** يرسل إشارة (fire-and-forget) مع إخماد التكرار بالبصمة. */
export function reportSignal(sig: Signal): void {
  if (!USE_REAL || typeof fetch === 'undefined')
    return
  const route = sig.route || routePath()
  const key = `${sig.type}|${(sig.message || '').slice(0, 80)}|${route}`
  const now = Date.now()
  const last = sent.get(key)
  if (last && now - last < THROTTLE_MS)
    return
  sent.set(key, now)

  try {
    void fetch(`${BASE}${'/v1/observe'}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        type: sig.type,
        message: (sig.message || 'unknown').slice(0, 2000),
        route,
        status: sig.status,
        layer: 'frontend',
        stack: sig.stack?.slice(0, 6000),
        url: window.location.href,
        blank: sig.blank ?? false,
      }),
      keepalive: true,
    }).catch(() => { /* لا نُبلّغ عن فشل الإبلاغ */ })
  }
  catch { /* تجاهل */ }
}

/** مُعالِج أخطاء Vue — يُسنَد إلى app.config.errorHandler. */
export function vueErrorHandler(err: unknown, _instance: unknown, info: string): void {
  const e = err as Error
  reportSignal({ type: 'render', message: `${e?.message ?? String(err)} (${info})`, stack: e?.stack })
}

/** يربط ملتقطات المتصفّح العالميّة. يُستدعى مرّة عند الإقلاع. */
export function initObserver(): void {
  if (!USE_REAL || typeof window === 'undefined')
    return

  window.addEventListener('error', (ev: ErrorEvent) => {
    reportSignal({ type: 'unhandled', message: ev.message || String(ev.error), stack: (ev.error as Error)?.stack })
  })
  window.addEventListener('unhandledrejection', (ev: PromiseRejectionEvent) => {
    const r = ev.reason
    reportSignal({ type: 'unhandled', message: (r as Error)?.message || String(r), stack: (r as Error)?.stack })
  })
}
