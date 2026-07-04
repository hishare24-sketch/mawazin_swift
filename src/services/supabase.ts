import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@supabase/supabase-js'

// ===== عميل Supabase — أول باك-إند حقيقي للمنصة =====
// المشروع: maqogxdksjpibsnkskiq (مربوط بحساب GitHub الخاص بالمالك)
// الفلسفة نفسها: المحاكاة المحلية هي الافتراضي، والمزامنة تُفعَّل فقط
// عند توفر المفتاحين في البيئة — لا ينكسر شيء في غيابهما.

export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? ''
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? ''

/** true عندما تكتمل إعدادات البيئة — عندها فقط تعمل المزامنة السحابية */
export const supabaseEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

let client: SupabaseClient | null = null

/** العميل الكسول — null عندما تكون الإعدادات ناقصة (وضع المحاكاة الكامل) */
export function getSupabase(): SupabaseClient | null {
  if (!supabaseEnabled)
    return null
  client ??= createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    // جلسة حقيقية محفوظة ومتجددة — أساس الملكية (auth.uid) في سياسات RLS
    auth: { persistSession: true, autoRefreshToken: true },
  })
  return client
}

/** أداة تأجيل بسيطة للمزامنة — تجمع التعديلات المتلاحقة في كتابة واحدة */
export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number): (...args: A) => void {
  let timer: ReturnType<typeof setTimeout> | undefined
  return (...args: A) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
}
