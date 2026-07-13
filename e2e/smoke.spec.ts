import { expect, test } from '@playwright/test'

// FE-E2E دخانيّ: الهبوط والدخول وحارس الراوتر (بلا مصادقة)

test('landing page renders public hero and login CTA', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/التوظيف/)
  await expect(page.getByText(/رحلة حياة مهنية/)).toBeVisible()
  // CTA الدخول زرّ (Vuetify) لا رابط — يوجّه إلى صفحة الدخول
  const loginBtn = page.getByRole('button', { name: 'تسجيل الدخول' }).first()
  await expect(loginBtn).toBeVisible()
  await loginBtn.click()
  await expect(page).toHaveURL(/\/login/)
})

test('login page renders the form', async ({ page }) => {
  await page.goto('/login')
  await expect(page.locator('input[type="email"]')).toBeVisible()
  await expect(page.locator('input[type="password"]')).toBeVisible()
  await expect(page.getByRole('button', { name: 'تسجيل الدخول' })).toBeVisible()
})

test('router guard redirects an unauthenticated user away from a protected page to login', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login/)
})

test('login validation blocks empty submit', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click()
  await expect(page.getByText('يرجى إدخال البريد وكلمة المرور')).toBeVisible()
  await expect(page).toHaveURL(/\/login/)
})
