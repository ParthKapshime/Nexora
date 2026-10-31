import { expect, test } from '@playwright/test'

const profile = { fullName: 'Demo User', targetRole: 'UX designer', yearsOfExperience: 0, education: [], resume: null }
const skillItems = [{ _id: 'skill-fixture', data: { name: 'User research', category: 'Design', level: 'Practicing' } }]
const roadmapItems = [{ _id: 'roadmap-fixture', data: { title: 'Research interviews', week: 'Week 1', resource: 'Personal notes', completed: true } }]
const applicationItems = [{ _id: 'application-fixture', company: 'Example Co', jobTitle: 'Design intern', appliedAt: '2026-08-15T12:00:00.000Z', status: 'Interview', nextAction: 'Prepare portfolio' }]

async function installReadOnlyFixtures(page) {
  await page.addInitScript(() => window.sessionStorage.setItem('nexora.auth.token', 'e2e-only-test-token'))
  await page.route('**/api/auth/me', (route) => route.fulfill({ json: { user: { id: 'fixture-user', email: 'demo@example.test' } } }))
  await page.route('**/api/profile', (route) => route.fulfill({ json: { profile } }))
  await page.route('**/api/skills', (route) => route.fulfill({ json: { items: skillItems } }))
  await page.route('**/api/roadmaps', (route) => route.fulfill({ json: { items: roadmapItems } }))
  await page.route('**/api/projects', (route) => route.fulfill({ json: { items: [] } }))
  await page.route('**/api/interviews', (route) => route.fulfill({ json: { items: [] } }))
  await page.route('**/api/applications**', (route) => {
    const status = new URL(route.request().url()).searchParams.get('status')
    if (status) return route.fulfill({ json: { items: [], page: 1, limit: 1, total: applicationItems.filter((item) => item.status === status).length } })
    return route.fulfill({ json: { items: applicationItems, page: 1, limit: 5, total: applicationItems.length } })
  })
}

test('workspace shell renders real-data states and mobile navigation at desktop, tablet, and phone widths', async ({ page }) => {
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await installReadOnlyFixtures(page)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/dashboard')
  await expect(page.getByRole('heading', { name: /good to see you, demo/i })).toBeVisible()
  await expect(page.getByText('3/5', { exact: true })).toBeVisible()
  await expect(page.getByText('Career readiness has not been assessed', { exact: false })).toBeVisible()
  await page.screenshot({ path: 'qa/evidence/1440x1000-dashboard.png', fullPage: true })

  await page.setViewportSize({ width: 768, height: 1024 })
  await page.screenshot({ path: 'qa/evidence/768x1024-dashboard.png', fullPage: true })
  const tabletWidth = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }))
  expect(tabletWidth.document).toBeLessThanOrEqual(tabletWidth.viewport)

  await page.setViewportSize({ width: 375, height: 812 })
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible()
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Profile' }).click()
  await expect(page.getByRole('heading', { name: 'Profile & resume' })).toBeVisible()
  const phoneWidth = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }))
  expect(phoneWidth.document).toBeLessThanOrEqual(phoneWidth.viewport)
  await page.screenshot({ path: 'qa/evidence/375x812-profile.png', fullPage: true })
  expect(pageErrors).toEqual([])
})
