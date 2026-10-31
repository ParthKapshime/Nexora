import { expect, test } from '@playwright/test'

test('protected page redirects an unauthenticated visitor to sign in', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Sign in to Nexora' })).toBeVisible()
})

test('session restoration reports backend unavailability and allows retry', async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem('nexora.auth.token', 'e2e-only-test-token'))
  await page.route('**/api/auth/me', (route) => route.abort('failed'))
  await page.goto('/dashboard')
  await expect(page.getByRole('alert')).toContainText('Nexora is offline')
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
})

test('empty interview records show an honest empty state and unsupported capability notice', async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem('nexora.auth.token', 'e2e-only-test-token'))
  await page.route('**/api/auth/me', (route) => route.fulfill({ json: { user: { id: 'fixture-user', email: 'demo@example.test' } } }))
  await page.route('**/api/interviews', (route) => route.fulfill({ json: { items: [] } }))
  await page.goto('/interviews')
  await expect(page.getByRole('heading', { name: 'No interview sessions' })).toBeVisible()
  await expect(page.getByText(/Live interview practice isn.t available yet/)).toBeVisible()
})
