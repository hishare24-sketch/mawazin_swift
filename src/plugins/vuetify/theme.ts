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
    'primary': '#4D7C0F', // ليموني داكن — تباين واضح على الأبيض
    'secondary': '#059669', // زمردي
    'accent': '#84CC16', // ليموني — أزرار CTA
    'success': '#16A34A',
    'info': '#0284C7',
    'warning': '#D97706',
    'error': '#DC2626',
    'background': '#F3F8EF', // أبيض مائل للأخضر الفاتح
    'surface': '#FFFFFF',
    'surface-variant': '#EBF3E3',
    'on-primary': '#FFFFFF',
    'on-secondary': '#FFFFFF',
    'on-accent': '#14210A', // نص داكن على الليموني
    'on-surface': '#14210F', // نص أخضر داكن
    'on-background': '#14210F',
  },
  variables: {
    'border-color': '#14210F',
    'theme-on-surface-variant': '#5B7052',
  },
}
