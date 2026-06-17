import { test, expect } from '@playwright/test'

const APP_URL = '/badminton-tracker/'
const PASSWORD = 'shuttle2026'

test.beforeEach(async ({ page }) => {
  await page.goto(APP_URL)
})

test('renders the dashboard with the quick stat cards', async ({ page }) => {
  await expect(page.getByTestId('app-root')).toBeVisible()
  await expect(page.getByTestId('stat-remaining-fund')).toBeVisible()
  await expect(page.getByTestId('stat-total-shuttles')).toBeVisible()
  await expect(page.getByTestId('stat-today-cost')).toBeVisible()
  await expect(page.getByTestId('stat-members')).toBeVisible()
})

test('starts in read-only mode showing the log-in control', async ({ page }) => {
  await expect(page.getByTestId('login-button')).toBeVisible()
  await expect(page.getByTestId('add-product-button')).toHaveCount(0)
})

test('rejects an incorrect password', async ({ page }) => {
  await page.getByTestId('login-button').click()
  await page.getByTestId('login-password').fill('wrong-password')
  await page.getByTestId('login-submit').click()
  await expect(page.getByTestId('login-error')).toBeVisible()
})

test('logs in with the correct password and enables editing', async ({ page }) => {
  await page.getByTestId('login-button').click()
  await page.getByTestId('login-password').fill(PASSWORD)
  await page.getByTestId('login-submit').click()

  await expect(page.getByTestId('editing-badge')).toBeVisible()
  await expect(page.getByTestId('add-product-button')).toBeVisible()

  // logging out returns to read-only mode
  await page.getByTestId('logout-button').click()
  await expect(page.getByTestId('login-button')).toBeVisible()
})
