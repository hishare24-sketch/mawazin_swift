import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'
import { USE_REAL_API, api } from '@/services/api'
import { useAuthStore } from '@/stores/AuthStore'

/**
 * ===== خدمة الرسائل المباشرة — التسليم الحقيقي بين المستخدمين (NestJS) =====
 *
 * طبقة علائقية: المرسِل يُدرج صفًّا عبر REST، فيصل المستقبِل لحظيًا عبر
 * Socket.IO (غرفة لكل uuid). بديل Supabase Realtime السابق.
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

function socketBase(): string {
  const raw = (import.meta.env.VITE_BASE_API_URL as string) || ''
  return raw.replace(/\/api\/?$/, '') || window.location.origin
}

/**
 * يشترك في الرسائل الوارِدة لحظيًا عبر Socket.IO — يعيد دالة إلغاء.
 * التوثيق بتوكن JWT في المصافحة؛ الخادم ينضمّ العميل لغرفة uuidه.
 */
export function subscribeInbound(_uid: string, onMessage: (row: DirectMessageRow) => void): () => void {
  if (!USE_REAL_API)
    return () => {}
  const token = useAuthStore().getToken
  const socket: Socket = io(socketBase(), {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
  })
  socket.on('message', (m: ApiMessage) => onMessage(toRow(m)))
  return () => { socket.disconnect() }
}
