import { expect, test } from '@playwright/test'

test('landing page exposes account navigation and the Nexora workspace', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/')
  await expect(page).toHaveTitle(/Nexora/)
  await expect(page.getByRole('link', { name: /get started/i })).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Your next chapter')
  await page.screenshot({ path: 'qa/evidence/1440x1000.png', fullPage: true })
})

test('registration validates required values before making an API request', async ({ page }) => {
  await page.goto('/register')
  await page.getByRole('button', { name: /create account/i }).click()
  await expect(page.getByText(/valid email address/i)).toBeVisible()
  await expect(page.getByText(/at least 10 characters/i)).toBeVisible()
})

test('mobile landing page fits the viewport without horizontal scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  const widths = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth }))
  expect(widths.document).toBeLessThanOrEqual(widths.viewport)
  await page.screenshot({ path: 'qa/evidence/375x812.png', fullPage: true })
})
