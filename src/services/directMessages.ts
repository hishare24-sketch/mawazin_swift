import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import { USE_REAL_API, api } from '@/services/api'
import { useAuthStore } from '@/stores/AuthStore'

/**
 * ===== خدمة الرسائل المباشرة — التسليم الحقيقي بين المستخدمين (Laravel + Reverb) =====
 *
 * طبقة علائقية: المرسِل يُدرج صفًّا عبر REST، فيبثّ الخادم حدث `message.sent`
 * على قناة خاصّة `user.{uuid}` عبر Reverb، فيصل المستقبِل لحظيًّا عبر laravel-echo.
 * التوثيق بتوكن Bearer على `/broadcasting/auth` (حارس Sanctum).
 * في وضع المحاكاة (USE_REAL_API=false) كل الدوال محايدة — يبقى المحلي.
 */

export interface DirectMessageRow {
  id: number
  sender_id: string
  recipient_id: string
  sender_name: string
  recipient_name: string
  body: string
  created_at: string
  read_at: string | null
}

/** شكل رسالة الباك-إند (camelCase) */
interface ApiMessage {
  id: number
  senderId: string
  recipientId: string
  senderName: string
  recipientName: string
  body: string
  created_at: string
  read_at: string | null
}

function toRow(m: ApiMessage): DirectMessageRow {
  return {
    id: m.id,
    sender_id: m.senderId,
    recipient_id: m.recipientId,
    sender_name: m.senderName,
    recipient_name: m.recipientName,
    body: m.body,
    created_at: m.created_at,
    read_at: m.read_at,
  }
}

export interface SendArgs {
  senderId: string
  senderName: string
  recipientId: string
  recipientName: string
  body: string
}

/** يُدرج رسالة موجّهة — يعيد الصف المُدرَج أو null (محاكاة/فشل). */
export async function sendDirectMessage(args: SendArgs): Promise<DirectMessageRow | null> {
  if (!USE_REAL_API)
    return null
  try {
    const m = await api.directMessages.send<ApiMessage>({
      recipientId: args.recipientId,
      recipientName: args.recipientName,
      body: args.body,
    })
    return toRow(m)
  }
  catch {
    return null
  }
}

/** يحلّ مالك صفحة تعريفية من الـslug — أساس التسليم الحقيقي عبر «تواصل معي». */
export async function resolveProfileOwner(slug: string): Promise<{ ownerId: string, name: string } | null> {
  if (!USE_REAL_API)
    return null
  try {
    return await api.directMessages.resolveOwner<{ ownerId: string, name: string } | null>(slug)
  }
  catch {
    return null
  }
}

/** كل رسائل المستخدم (مُرسَلة ووارِدة) مرتّبة زمنيًا — لإعادة بناء المحادثات. */
export async function fetchMyMessages(_uid?: string): Promise<DirectMessageRow[]> {
  if (!USE_REAL_API)
    return []
  try {
    return (await api.directMessages.list<ApiMessage[]>()).map(toRow)
  }
  catch {
    return []
  }
}

/** يعلّم كل الرسائل الواردة من طرف معيّن مقروءة. */
export async function markThreadRead(_uid: string, peerId: string): Promise<void> {
  if (!USE_REAL_API)
    return
  try {
    await api.directMessages.markRead(peerId)
  }
  catch { /* المحلي كافٍ */ }
}

/** أصل الخادم (بلا لاحقة /api) — قاعدة نقطة توثيق البثّ `/broadcasting/auth`. */
function serverBase(): string {
  const raw = (import.meta.env.VITE_BASE_API_URL as string) || ''
  return raw.replace(/\/api\/?$/, '') || window.location.origin
}

/**
 * يشترك في الرسائل الوارِدة لحظيًّا عبر Reverb (laravel-echo) — يعيد دالة إلغاء.
 * القناة الخاصّة `user.{uuid}` تُوثَّق بتوكن Bearer على `/broadcasting/auth`،
 * والحدث `message.sent` يحمل `{ message }` (حمولة DirectMessageResource المُسطّحة).
 */
export function subscribeInbound(uid: string, onMessage: (row: DirectMessageRow) => void): () => void {
  if (!USE_REAL_API || !uid)
    return () => {}

  const token = useAuthStore().getToken
  // laravel-echo (موصّل reverb) يعتمد pusher-js على window
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

  echo.private(`user.${uid}`)
    .listen('.message.sent', (e: { message: ApiMessage }) => onMessage(toRow(e.message)))

  return () => {
    try { echo.leave(`user.${uid}`) }
    finally { echo.disconnect() }
  }
}
