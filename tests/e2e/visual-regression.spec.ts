import { expect, test } from '@playwright/test'
import { mockGoogleTiles, transparentPng } from './helpers'

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-07-30T03:00:00.000Z'))
  await mockGoogleTiles(page)
  await page.goto('#/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

async function expectPageScreenshot(page: import('@playwright/test').Page, name: string) {
  await expect(page).toHaveScreenshot(name, {
    fullPage: true,
    animations: 'disabled',
    caret: 'hide',
    maxDiffPixelRatio: 0.01,
  })
}

async function expectResidentTransientUiHidden(page: import('@playwright/test').Page) {
  await expect(page.locator('[data-preview]')).toBeHidden()
  await expect(page.locator('[data-action="retry-tiles"]')).toBeHidden()
}

async function expectAdminRetryHidden(page: import('@playwright/test').Page) {
  await expect(page.locator('[data-action="retry-tiles"]')).toBeHidden()
}

test('desktop home visual', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await expectPageScreenshot(page, 'desktop-home.png')
})

test('desktop resident visual', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('#/resident/report')
  await expectResidentTransientUiHidden(page)
  await expectPageScreenshot(page, 'desktop-resident.png')
})

test('desktop completion visual', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.getByRole('button', { name: /주민 제보 시작/ }).click()
  await page.getByLabel('시 선택').selectOption('11')
  await page.getByRole('button', { name: '선택한 시 중심 사용' }).click()
  await page.getByLabel('쓰레기 사진').setInputFiles({
    name: 'waste.png',
    mimeType: 'image/png',
    buffer: transparentPng,
  })
  await page.getByRole('button', { name: '제보하기' }).click()
  await expectPageScreenshot(page, 'desktop-complete.png')
})

test('desktop admin visual', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('#/admin')
  await expectAdminRetryHidden(page)
  await expectPageScreenshot(page, 'desktop-admin.png')
})

for (const screen of [
  { name: 'mobile-home.png', path: '#/' },
  { name: 'mobile-resident.png', path: '#/resident/report' },
  { name: 'mobile-admin.png', path: '#/admin' },
]) {
  test(screen.name, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 })
    await page.goto(screen.path)
    if (screen.path === '#/resident/report') await expectResidentTransientUiHidden(page)
    if (screen.path === '#/admin') await expectAdminRetryHidden(page)
    await expectPageScreenshot(page, screen.name)
  })
}
