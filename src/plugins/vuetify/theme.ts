import type { ThemeDefinition } from 'vuetify'

// هوية «Indigo Aurora» — نيلي عصري + فيروزي (تفاعلات AI) + عنبري (أزرار CTA)
export const lightTheme: ThemeDefinition = {
  dark: false,
  colors: {
    'primary': '#4F46E5', // نيلي — الثقة والعلامة
    'secondary': '#14B8A6', // فيروزي — تفاعلات الذكاء الاصطناعي
    'accent': '#F59E0B', // عنبري — الأزرار المهمة (تقدم، قبول، إرسال)
    'success': '#22C55E',
    'info': '#3B82F6',
    'warning': '#F97316',
    'error': '#EF4444', // أحمر — الإلغاء، الرفض، التنبيهات
    'background': '#F8FAFC', // خلفية فاتحة لراحة العين
    'surface': '#FFFFFF',
    'surface-variant': '#EEF2FF', // نيلي فاتح جدًا للأسطح الثانوية
    'on-primary': '#FFFFFF',
    'on-secondary': '#FFFFFF',
    'on-accent': '#1F2937',
    'on-surface': '#0F172A', // نصوص داكنة للقراءة الواضحة
    'on-background': '#0F172A',
  },
  variables: {
    'border-color': '#0F172A',
    'theme-on-surface-variant': '#64748B',
  },
}

export const darkTheme: ThemeDefinition = {
  dark: true,
  colors: {
    'primary': '#818CF8', // نيلي أفتح على الخلفية الداكنة
    'secondary': '#2DD4BF',
    'accent': '#FBBF24',
    'success': '#4ADE80',
    'info': '#60A5FA',
    'warning': '#FB923C',
    'error': '#F87171',
    'background': '#0B1120', // كحلي/سليت عميق
    'surface': '#1E293B',
    'surface-variant': '#273449',
    'on-primary': '#0B1120',
    'on-secondary': '#0B1120',
    'on-accent': '#0B1120',
    'on-surface': '#E2E8F0',
    'on-background': '#E2E8F0',
  },
  variables: {
    'border-color': '#E2E8F0',
    'theme-on-surface-variant': '#94A3B8',
  },
}
