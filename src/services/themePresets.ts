// ===== نظام الثيمات الديناميكي — 5 هويات لونية × 3 أوضاع (داكن/فاتح/مختلط) =====

export interface PresetPalette {
  'primary': string
  'secondary': string
  'accent': string
  'background': string
  'surface': string
  'surface-variant': string
  'on-surface': string
}

export interface ThemePreset {
  id: string
  name: string
  /** تدرج مناطق العلامة (hero/auth) — 3 محطات */
  gradient: [string, string, string]
  /** لون التوهج فوق التدرج بصيغة r, g, b */
  glowRgb: string
  dark: PresetPalette
  light: PresetPalette
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'littlebee',
    name: 'ليموني LittleBee',
    gradient: ['#14532d', '#0f2e1c', '#1a3a24'],
    glowRgb: '163, 230, 53',
    dark: { 'primary': '#A3E635', 'secondary': '#34D399', 'accent': '#BEF264', 'background': '#0E1712', 'surface': '#16221B', 'surface-variant': '#1F2E26', 'on-surface': '#E6EFE7' },
    light: { 'primary': '#3F6212', 'secondary': '#047857', 'accent': '#65A30D', 'background': '#EAF1E1', 'surface': '#FFFFFF', 'surface-variant': '#DCE9CC', 'on-surface': '#101A0B' },
  },
  {
    id: 'ocean',
    name: 'أزرق محيطي',
    gradient: ['#0C4A6E', '#082F49', '#133B5C'],
    glowRgb: '56, 189, 248',
    dark: { 'primary': '#38BDF8', 'secondary': '#818CF8', 'accent': '#7DD3FC', 'background': '#0B1520', 'surface': '#12202E', 'surface-variant': '#1A2C3D', 'on-surface': '#E3EDF5' },
    light: { 'primary': '#0369A1', 'secondary': '#4F46E5', 'accent': '#0284C7', 'background': '#E7F0F7', 'surface': '#FFFFFF', 'surface-variant': '#D3E4F0', 'on-surface': '#0B1B26' },
  },
  {
    id: 'royal',
    name: 'بنفسجي ملكي',
    gradient: ['#4C1D95', '#2E1065', '#3B1D6E'],
    glowRgb: '192, 132, 252',
    dark: { 'primary': '#C084FC', 'secondary': '#F472B6', 'accent': '#D8B4FE', 'background': '#140F1E', 'surface': '#1D1629', 'surface-variant': '#291F38', 'on-surface': '#EFE8F7' },
    light: { 'primary': '#7C3AED', 'secondary': '#DB2777', 'accent': '#9333EA', 'background': '#F0EBF8', 'surface': '#FFFFFF', 'surface-variant': '#E4D9F3', 'on-surface': '#1A1025' },
  },
  {
    id: 'desert',
    name: 'رملي دافئ',
    gradient: ['#78350F', '#451A03', '#5C2E0C'],
    glowRgb: '251, 191, 36',
    dark: { 'primary': '#FBBF24', 'secondary': '#FB923C', 'accent': '#FDE68A', 'background': '#1A1206', 'surface': '#241A0D', 'surface-variant': '#322414', 'on-surface': '#F5EDE0' },
    light: { 'primary': '#B45309', 'secondary': '#C2410C', 'accent': '#D97706', 'background': '#F7F0E3', 'surface': '#FFFFFF', 'surface-variant': '#EFE1C6', 'on-surface': '#241505' },
  },
  {
    id: 'emerald',
    name: 'زمردي عميق',
    gradient: ['#134E4A', '#042F2E', '#0F3D38'],
    glowRgb: '45, 212, 191',
    dark: { 'primary': '#2DD4BF', 'secondary': '#4ADE80', 'accent': '#5EEAD4', 'background': '#0A1717', 'surface': '#102222', 'surface-variant': '#183030', 'on-surface': '#E2F0EC' },
    light: { 'primary': '#0F766E', 'secondary': '#15803D', 'accent': '#0D9488', 'background': '#E4F2EE', 'surface': '#FFFFFF', 'surface-variant': '#CFE8DF', 'on-surface': '#07201C' },
  },
]

export function presetById(id: string): ThemePreset {
  return THEME_PRESETS.find(p => p.id === id) ?? THEME_PRESETS[0]
}

// ===== حساب لون النص المقابل تلقائيًا (تباين مضمون للألوان المخصصة) =====

export function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim())
  return m ? [Number.parseInt(m[1], 16), Number.parseInt(m[2], 16), Number.parseInt(m[3], 16)] : null
}

/** الإضاءة النسبية وفق WCAG */
export function luminance(hex: string): number {
  const rgb = hexToRgb(hex)
  if (!rgb)
    return 0
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** لون النص فوق لون معين: داكن فوق الفاتح، أبيض فوق الداكن */
export function onColorFor(hex: string): string {
  return luminance(hex) > 0.45 ? '#101418' : '#FFFFFF'
}

export function isValidHex(hex: string): boolean {
  return /^#[a-f\d]{6}$/i.test(hex.trim())
}
