import { test, expect } from '@playwright/test'

const APP_URL = '/'

test.beforeEach(async ({ page }) => {
  await page.goto(APP_URL)
})

test('renders the dashboard with the quick stat cards', async ({ page }) => {
  await expect(page.getByTestId('app-root')).toBeVisible()
  await expect(page.getByTestId('stat-remaining-fund')).toBeVisible()
  await expect(page.getByTestId('stat-total-shuttles')).toBeVisible()
  await expect(page.getByTestId('stat-admins')).toBeVisible()
  await expect(page.getByTestId('stat-players')).toBeVisible()
})

test('starts in read-only mode showing the log-in control', async ({ page }) => {
  await expect(page.getByTestId('login-button')).toBeVisible()
  await expect(page.getByTestId('add-product-button')).toHaveCount(0)
})

test('opening log in shows the magic-link email form', async ({ page }) => {
  await page.getByTestId('login-button').click()
  await expect(page.getByTestId('magic-link-email')).toBeVisible()
  await expect(page.getByTestId('login-submit')).toBeVisible()
})

test('shows the transaction log with a record count', async ({ page }) => {
  const log = page.getByTestId('transaction-log')
  await expect(log).toBeVisible()
  await expect(page.getByTestId('log-range')).toContainText('of')
})

test('signs in by email and enables editing', async ({ page }) => {
  await page.getByTestId('login-button').click()
  await page.getByTestId('magic-link-email').fill('admin@example.com')
  await page.getByTestId('login-submit').click()

  await expect(page.getByTestId('editing-badge')).toBeVisible()
  await expect(page.getByTestId('add-product-button')).toBeVisible()

  // logging out returns to read-only mode
  await page.getByTestId('logout-button').click()
  await expect(page.getByTestId('login-button')).toBeVisible()
})
