import js from '@eslint/js'
import perfectionist from 'eslint-plugin-perfectionist'
import vue from 'eslint-plugin-vue'
import globals from 'globals'
import tseslint from 'typescript-eslint'

// إعداد عمليّ يركّز على الصحّة (اكتشاف الأخطاء) لا التنسيق — لا نفرض إعادة صياغة
// على قاعدة قائمة بلا linter سابق. vue/essential = القواعد الحرِجة فقط.
export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'public/**', 'coverage/**', '**/*.config.*', 'env.d.ts', 'backend/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs['flat/essential'],
  {
    files: ['**/*.{ts,js,vue}'],
    // نُسجّل perfectionist و ts (alias) كي تُعرَّف قواع تعليقات eslint-disable القديمة (antfu) بلا تفعيلها
    plugins: { perfectionist, ts: tseslint.plugin },
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { parser: tseslint.parser },
    },
    rules: {
      // أوقف الضجيج الأسلوبيّ/غير الحرِج (اختيارات قائمة في الكود)، أبقِ قواعد الصحّة
      'vue/multi-word-component-names': 'off',
      'no-irregular-whitespace': 'off', // نصوص عربيّة تستعمل مسافات خاصّة مشروعة
      'no-cond-assign': 'off', // أنماط while((m = regex.exec())) مقصودة
      '@typescript-eslint/no-require-imports': 'off', // require() مستعمَل عمدًا (أصول/تحميل)
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      'vue/valid-v-slot': 'warn',
      'vue/no-deprecated-filter': 'off', // إيجابيّة كاذبة على أنواع TS الاتّحاديّة (as A | B) داخل القوالب
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
    },
  },
  {
    // ملفّات الاختبار: توابع vitest العامّة + __BUILD_ID__ المحقون
    files: ['**/*.{test,spec}.ts'],
    languageOptions: { globals: { describe: 'readonly', it: 'readonly', expect: 'readonly', vi: 'readonly', beforeEach: 'readonly', afterEach: 'readonly', beforeAll: 'readonly', afterAll: 'readonly' } },
  },
  {
    languageOptions: { globals: { __BUILD_ID__: 'readonly' } },
  },
)
