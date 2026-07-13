import { defineConfig, devices } from '@playwright/test'

// E2E دخانيّ (م5) — يعمل مقابل بناء الإنتاج في **وضع المحاكاة** (بلا باك-إند):
// لا مفتاح VITE_USE_REAL_API في بناء الإنتاج → محاكاة Pinia/localStorage كاملة،
// والدخول يقبل أيّ بريد/كلمة (الدور يُشتقّ من البريد). DOCKER=1 يفرض base=/ حتى في CI.
const PORT = 4173
const baseURL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'line' : 'list',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: 'on-first-retry',
    locale: 'ar',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: baseURL,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
    env: { DOCKER: '1' }, // يفرض base=/ ويُبقي وضع المحاكاة (لا يمسّ VITE_USE_REAL_API)
  },
})
