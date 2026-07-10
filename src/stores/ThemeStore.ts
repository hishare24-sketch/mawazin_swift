import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { ThemeInstance } from 'vuetify'
import { isValidHex, onColorFor, presetById } from '@/services/themePresets'

// وضع العرض: داكن كامل / فاتح كامل / مختلط (محتوى فاتح + قوائم داكنة)
export type ThemeMode = 'dark' | 'light' | 'mixed'

interface ThemePrefs {
  presetId: string
  mode: ThemeMode
  customPrimary: string | null
  customSecondary: string | null
}

const STORAGE_KEY = 'themePrefs'

const DEFAULTS: ThemePrefs = {
  presetId: 'littlebee',
  mode: 'dark',
  customPrimary: null,
  customSecondary: null,
}

function loadPrefs(): ThemePrefs {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') }
  }
  catch {
    return { ...DEFAULTS }
  }
}

export const useThemeStore = defineStore('theme', () => {
  const prefs = loadPrefs()
  const presetId = ref(prefs.presetId)
  const mode = ref<ThemeMode>(prefs.mode)
  const customPrimary = ref<string | null>(prefs.customPrimary)
  const customSecondary = ref<string | null>(prefs.customSecondary)

  const preset = computed(() => presetById(presetId.value))
  /** المختلط يستخدم الثيم الفاتح للمحتوى، وتُظلَّم القوائم عبر خاصية theme في الواجهة */
  const isDark = computed(() => mode.value === 'dark')
  const isMixed = computed(() => mode.value === 'mixed')
  const activeThemeName = computed(() => (isDark.value ? 'darkTheme' : 'lightTheme'))

  // يُربط مرة واحدة من App.vue (useTheme لا يعمل خارج سياق مكوّن)
  let themeApi: ThemeInstance | null = null

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      presetId: presetId.value,
      mode: mode.value,
      customPrimary: customPrimary.value,
      customSecondary: customSecondary.value,
    }))
  }

  /** كتابة الهوية اللونية الحالية في ثيمَي Vuetify + متغيرات CSS للعلامة */
  function apply() {
    persist()
    if (!themeApi)
      return
    const p = preset.value
    for (const variant of ['dark', 'light'] as const) {
      const palette = { ...p[variant] }
      const colors = themeApi.themes.value[variant === 'dark' ? 'darkTheme' : 'lightTheme'].colors
      const primary = customPrimary.value ?? palette.primary
      const secondary = customSecondary.value ?? palette.secondary
      Object.assign(colors, {
        'primary': primary,
        'on-primary': onColorFor(primary),
        'secondary': secondary,
        'on-secondary': onColorFor(secondary),
        'accent': palette.accent,
        'on-accent': onColorFor(palette.accent),
        'background': palette.background,
        'on-background': palette['on-surface'],
        'surface': palette.surface,
        'on-surface': palette['on-surface'],
        'surface-variant': palette['surface-variant'],
      })
    }
    themeApi.change(activeThemeName.value) // Vuetify 3.7+: بديل تعيين global.name.value المهجور
    // تدرج العلامة وتوهجها يتبعان الهوية المختارة
    const root = document.documentElement
    root.style.setProperty('--brand-gradient', `linear-gradient(135deg, ${p.gradient[0]} 0%, ${p.gradient[1]} 55%, ${p.gradient[2]} 100%)`)
    root.style.setProperty('--lime-glow', `radial-gradient(circle at 60% 30%, rgba(${p.glowRgb}, 0.22), transparent 60%)`)
  }

  function bind(api: ThemeInstance) {
    themeApi = api
    apply()
  }

  function setPreset(id: string) {
    presetId.value = id
    apply()
  }

  function setMode(m: ThemeMode) {
    mode.value = m
    apply()
  }

  /** التبديل السريع (زر الشمس/القمر): داكن ⇄ فاتح، والمختلط يعود داكنًا */
  function toggleDark() {
    setMode(isDark.value ? 'light' : 'dark')
  }

  function setCustomPrimary(hex: string | null) {
    if (hex !== null && !isValidHex(hex))
      return
    customPrimary.value = hex
    apply()
  }

  function setCustomSecondary(hex: string | null) {
    if (hex !== null && !isValidHex(hex))
      return
    customSecondary.value = hex
    apply()
  }

  function resetCustom() {
    customPrimary.value = null
    customSecondary.value = null
    apply()
  }

  return {
    presetId, mode, customPrimary, customSecondary,
    preset, isDark, isMixed, activeThemeName,
    bind, apply, setPreset, setMode, toggleDark,
    setCustomPrimary, setCustomSecondary, resetCustom,
  }
})
