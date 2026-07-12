import qrcode from 'qrcode-generator'

/**
 * يولّد QR كـSVG مضمّن (path واحد) من نصّ/رابط — قابل للمسح، حادّ عند أيّ حجم،
 * ويُطبع/يُصدّر داخل PDF بلا اعتماد على أيّ مورد خارجيّ.
 */
export function qrSvg(text: string, sizePx = 72, dark = '#111827'): string {
  if (!text || !text.trim())
    return ''
  const qr = qrcode(0, 'M')
  qr.addData(text.trim())
  qr.make()
  const count = qr.getModuleCount()
  const cell = 1
  let path = ''
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (qr.isDark(r, c))
        path += `M${c * cell} ${r * cell}h${cell}v${cell}h-${cell}z`
    }
  }
  const dim = count
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${sizePx}" height="${sizePx}" viewBox="0 0 ${dim} ${dim}" shape-rendering="crispEdges"><rect width="${dim}" height="${dim}" fill="#fff"/><path d="${path}" fill="${dark}"/></svg>`
}
