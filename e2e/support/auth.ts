import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

/**
 * دخول عبر المحاكاة: أيّ بريد/كلمة يُقبلان، والدور يُشتقّ من كلمة في البريد
 * (admin/company/interviewer…)، والافتراضيّ seeker. لا باك-إند ولا كلمات حقيقيّة.
 */
export async function login(page: Page, email = 'seeker@e2e.test'): Promise<void> {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill('e2e-pass-123')
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click()
  // المحاكاة تؤخّر 600ms ثمّ تعيد التوجيه بعيدًا عن /login
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 })
}
