import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { ThemeInstance } from 'vuetify'
import { useThemeStore } from './ThemeStore'
import { THEME_PRESETS, luminance, onColorFor } from '@/services/themePresets'

function fakeThemeApi() {
  const global = { name: { value: '' } }
  return {
    themes: { value: { darkTheme: { colors: {} as Record<string, string> }, lightTheme: { colors: {} as Record<string, string> } } },
    global,
    // يحاكي Vuetify 3.7+: change يكتب اسم الثيم النشط في global.name
    change: (name: string) => { global.name.value = name },
  } as unknown as ThemeInstance
}

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('themePresets helpers', () => {
  it('ships 5 presets with dark and light palettes', () => {
    expect(THEME_PRESETS.length).toBe(5)
    for (const p of THEME_PRESETS) {
      expect(p.dark.primary).toMatch(/^#/)
      expect(p.light.primary).toMatch(/^#/)
      expect(p.gradient.length).toBe(3)
    }
  })

  it('computes contrast-safe on-colors from luminance', () => {
    expect(onColorFor('#A3E635')).toBe('#101418') // light lime → dark text
    expect(onColorFor('#4C1D95')).toBe('#FFFFFF') // deep violet → white text
    expect(luminance('#FFFFFF')).toBeCloseTo(1, 1)
    expect(luminance('#000000')).toBe(0)
  })
})

describe('themeStore', () => {
  it('applies the preset palette and custom overrides into both Vuetify themes', () => {
    const s = useThemeStore()
    const api = fakeThemeApi()
    s.bind(api)
    const dark = (api.themes.value.darkTheme.colors as Record<string, string>)
    expect(dark.primary).toBe('#A3E635') // littlebee default
    expect(api.global.name.value).toBe('darkTheme')

    s.setPreset('ocean')
    expect(dark.primary).toBe('#38BDF8')
    expect((api.themes.value.lightTheme.colors as Record<string, string>).primary).toBe('#0369A1')

    s.setCustomPrimary('#FF0066')
    expect(dark.primary).toBe('#FF0066')
    expect(dark['on-primary']).toBe('#FFFFFF') // dark custom → white text
    s.resetCustom()
    expect(dark.primary).toBe('#38BDF8')
  })

  it('rejects invalid hex for custom colors', () => {
    const s = useThemeStore()
    s.bind(fakeThemeApi())
    s.setCustomPrimary('طوسي')
    expect(s.customPrimary).toBe(null)
    s.setCustomPrimary('#12345')
    expect(s.customPrimary).toBe(null)
    s.setCustomPrimary('#123456')
    expect(s.customPrimary).toBe('#123456')
  })

  it('switches modes: mixed keeps the light theme for content, toggle flips dark/light', () => {
    const s = useThemeStore()
    const api = fakeThemeApi()
    s.bind(api)
    s.setMode('mixed')
    expect(s.isMixed).toBe(true)
    expect(api.global.name.value).toBe('lightTheme')
    s.toggleDark() // mixed → dark
    expect(s.mode).toBe('dark')
    s.toggleDark()
    expect(s.mode).toBe('light')
  })

  it('persists preferences and restores them on a fresh session', () => {
    const s = useThemeStore()
    s.bind(fakeThemeApi())
    s.setPreset('royal')
    s.setMode('mixed')
    s.setCustomSecondary('#00AA88')
    setActivePinia(createPinia())
    const s2 = useThemeStore()
    expect(s2.presetId).toBe('royal')
    expect(s2.mode).toBe('mixed')
    expect(s2.customSecondary).toBe('#00AA88')
  })
})
