import { expect, test } from '@playwright/test'
import { login } from './support/auth'

// FE-E2E: كونسول الأدمن — دخول أدمن → النظرة العامّة → مركز قيادة الجودة

test('admin logs in and lands on the admin console', async ({ page }) => {
  await login(page, 'admin@e2e.test')
  await expect(page).toHaveURL(/\/admin/)
  await expect(page.getByText('كونسول الأدمن')).toBeVisible()
})

test('admin can open the Quality Command Center page', async ({ page }) => {
  await login(page, 'admin@e2e.test')
  await page.goto('/admin/quality-command')
  await expect(page).toHaveURL(/\/admin\/quality-command/)
  // العنوان + لوحات المركز تُصيَّر (البيانات فارغة في المحاكاة — نتحقّق من البنية)
  await expect(page.getByRole('heading', { name: 'مركز قيادة الجودة' })).toBeVisible()
  await expect(page.getByText('لوحة التحويل')).toBeVisible()
  await expect(page.getByText('رصد وقت-التشغيل')).toBeVisible()
})

test('admin navigation exposes the quality group link', async ({ page }) => {
  await login(page, 'admin@e2e.test')
  await expect(page.getByRole('link', { name: 'مركز قيادة الجودة' })).toBeVisible()
})
