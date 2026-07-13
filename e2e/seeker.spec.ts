import { expect, test } from '@playwright/test'
import { login } from './support/auth'

// FE-E2E: تدفّق الباحث — دخول → لوحة → سوق الفرص → تفاصيل

test('seeker logs in and lands on the dashboard', async ({ page }) => {
  await login(page, 'seeker@e2e.test')
  await expect(page).toHaveURL(/\/dashboard/)
})

test('seeker can open the opportunities marketplace with seeded cards', async ({ page }) => {
  await login(page, 'seeker@e2e.test')
  await page.goto('/opportunities')
  await expect(page).toHaveURL(/\/opportunities/)
  // شبكة الاكتشاف تبذر فرصًا تلقائيًّا — نصّ فرصة مبذورة ظاهر (البطاقة تُفتح بـrouter.push لا رابط)
  await expect(page.getByText(/مطوّر|مهندس|محلّل|تسويق|مصمّم/).first()).toBeVisible({ timeout: 10_000 })
})

test('seeker can navigate to an opportunity details page', async ({ page }) => {
  await login(page, 'seeker@e2e.test')
  await page.goto('/opportunities/1')
  await expect(page).toHaveURL(/\/opportunities\/1/)
  // صفحة التفاصيل تعرض عنوانًا وزرّ إجراء (تقديم/حفظ)
  await expect(page.getByRole('heading').first()).toBeVisible()
})

test('authenticated seeker session persists across reload', async ({ page }) => {
  await login(page, 'seeker@e2e.test')
  await page.reload()
  await expect(page).not.toHaveURL(/\/login/) // الجلسة محفوظة (localStorage)
})
