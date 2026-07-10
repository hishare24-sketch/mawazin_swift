/** @type {import('tailwindcss').Config} */

// جسر الألوان: نربط رموز Tailwind بمتغيّرات ثيم Vuetify (--v-theme-*) كي تتزامن
// الألوان تلقائيًا مع تبديل الوضع (داكن/فاتح) خلال الترحيل التدريجي.
// ملاحظة: قيم Vuetify مفصولة بفواصل (R,G,B) فلا تدعم صيغة alpha لـ Tailwind —
// لذا نستخدم rgb(...) صلبة للخلفيات، ونضيف رموز alpha يدويًّا عند الحاجة.
const v = name => `rgb(var(--v-theme-${name}))`

export default {
  content: ['./index.html', './src/**/*.{vue,ts,js}'],
  // لا نُفعّل preflight كي لا يُصفّر تنسيقات Vuetify أثناء التعايش
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        brand: v('primary'),
        emerald: v('secondary'),
        accent: v('accent'),
        bg: v('background'),
        surface: v('surface'),
        surfalt: v('surface-variant'),
        content: v('on-surface'),
        'on-brand': v('on-primary'),
        'on-accent': v('on-accent'),
        success: v('success'),
        info: v('info'),
        warning: v('warning'),
        error: v('error'),
      },
      borderRadius: {
        ui: 'var(--ui-radius, 12px)',
        'ui-lg': 'var(--ui-radius-lg, 16px)',
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'SF Arabic', 'Noto Sans Arabic', 'Helvetica Neue', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
