import { reactive } from 'vue'

// حالة تأكيد وعديّة مشتركة — يُركَّب <BaseConfirm/> مرّة واحدة (في AdminLayout)
// وتُستدعى confirm(...) من أيّ مكان فتعيد Promise<boolean>.
export interface ConfirmOptions {
  title: string
  message?: string
  confirmText?: string
  cancelText?: string
  tone?: 'danger' | 'default'
  icon?: string
}

interface ConfirmState extends Required<Omit<ConfirmOptions, 'icon'>> {
  open: boolean
  icon?: string
  resolve?: (v: boolean) => void
}

export const confirmState = reactive<ConfirmState>({
  open: false,
  title: '',
  message: '',
  confirmText: 'تأكيد',
  cancelText: 'إلغاء',
  tone: 'default',
  icon: undefined,
  resolve: undefined,
})

export function confirm(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    confirmState.title = opts.title
    confirmState.message = opts.message ?? ''
    confirmState.confirmText = opts.confirmText ?? 'تأكيد'
    confirmState.cancelText = opts.cancelText ?? 'إلغاء'
    confirmState.tone = opts.tone ?? 'default'
    confirmState.icon = opts.icon
    confirmState.resolve = resolve
    confirmState.open = true
  })
}

export function settleConfirm(value: boolean): void {
  confirmState.open = false
  confirmState.resolve?.(value)
  confirmState.resolve = undefined
}
