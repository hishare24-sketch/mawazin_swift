import type { ThemeDefinition } from 'vuetify'

// هوية «LittleBee» — خلفية خضراء داكنة + لمسة ليموني (lime) ساطعة
// الداكن هو النمط المرجعي، والفاتح انعكاسه.
export const darkTheme: ThemeDefinition = {
  dark: true,
  colors: {
    'primary': '#A3E635', // ليموني — العلامة والعناصر التفاعلية والرسم البياني
    'secondary': '#34D399', // زمردي — تفاعلات الذكاء الاصطناعي
    'accent': '#BEF264', // ليموني ساطع — أزرار CTA (احسب/إيداع)
    'success': '#4ADE80',
    'info': '#38BDF8',
    'warning': '#FBBF24',
    'error': '#F87171',
    'background': '#0E1712', // أخضر-أسود عميق
    'surface': '#16221B', // بطاقات داكنة
    'surface-variant': '#1F2E26',
    'on-primary': '#0E1712', // نص داكن على الليموني الفاتح
    'on-secondary': '#0E1712',
    'on-accent': '#14210A',
    'on-surface': '#E6EFE7', // أبيض مائل للأخضر
    'on-background': '#E6EFE7',
  },
  variables: {
    'border-color': '#E6EFE7',
    'theme-on-surface-variant': '#8CA396',
  },
}

export const lightTheme: ThemeDefinition = {
  dark: false,
  colors: {
    'primary': '#3F6212', // أخضر زيتوني عميق — تباين قوي على الأبيض
    'secondary': '#047857', // زمردي أعمق
    'accent': '#65A30D', // ليموني داكن — أزرار CTA بتباين أعلى
    'success': '#15803D',
    'info': '#0369A1',
    'warning': '#B45309',
    'error': '#B91C1C',
    'background': '#EAF1E1', // خلفية خضراء فاتحة تفصل الكروت البيضاء بوضوح
    'surface': '#FFFFFF',
    'surface-variant': '#DCE9CC',
    'on-primary': '#FFFFFF',
    'on-secondary': '#FFFFFF',
    'on-accent': '#14210A', // نص داكن على الليموني
    'on-surface': '#101A0B', // نص أخضر داكن شبه أسود — أعلى تباين
    'on-background': '#101A0B',
  },
  variables: {
    'border-color': '#243318',
    'theme-on-surface-variant': '#3E5531', // نص ثانوي أوضح
    'border-opacity': 0.16,
    'medium-emphasis-opacity': 0.72,
  },
}
