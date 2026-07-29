import { expect, test } from '@playwright/test'

const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL6WQAAAABJRU5ErkJggg==',
  'base64',
)

test.beforeEach(async ({ page }) => {
  await page.route('https://mt.google.com/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'image/png', body: transparentPng })
  })
  await page.goto('#/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('resident report appears in the administrator portal', async ({ page }) => {
  const consoleErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => consoleErrors.push(error.message))

  await page.getByRole('button', { name: /주민으로 시작/ }).click()
  await page.getByLabel('시 선택').selectOption('11')
  await page.locator('.leaflet-container').click({ position: { x: 220, y: 180 } })
  await page.getByLabel('쓰레기 사진').setInputFiles({
    name: 'waste.png',
    mimeType: 'image/png',
    buffer: transparentPng,
  })
  await expect(page.getByText('사진 압축이 완료되었습니다.')).toBeVisible()
  await page.getByLabel('메모').fill('공모전 발표용 신규 제보')
  await page.getByRole('button', { name: '제보하기' }).click()

  await expect(page.getByRole('heading', { name: '제보 완료' })).toBeVisible()
  await expect(page.getByText('관리자 지도에 반영됨')).toBeVisible()

  await page.getByRole('button', { name: '홈으로 돌아가기' }).click()
  await page.getByRole('button', { name: /관리자 데모 입장/ }).click()

  await expect(page.getByText('공모전 발표용 신규 제보')).toBeVisible()
  await expect(page.getByText('최신 제보')).toBeVisible()
  await expect(page.locator('[data-metric="total"]')).not.toHaveText('0')
  expect(consoleErrors).toEqual([])
})

test('location denial falls back to map selection', async ({ browser }) => {
  const context = await browser.newContext({ permissions: [] })
  const page = await context.newPage()
  await page.route('https://mt.google.com/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'image/png', body: transparentPng })
  })
  await page.goto('http://127.0.0.1:4173/#/resident/report')
  await page.getByRole('button', { name: '현재 위치 사용' }).click()
  await expect(page.getByText('지도에서 직접 선택해주세요.')).toBeVisible()
  await context.close()
})

test('tile failure preserves administrator data panels', async ({ page }) => {
  await page.unroute('https://mt.google.com/**')
  await page.route('https://mt.google.com/**', (route) => route.abort())
  await page.goto('#/admin')

  await expect(page.getByText('데이터 레이어는 계속 사용할 수 있습니다.')).toBeVisible()
  await expect(page.locator('[data-metric="total"]')).toBeVisible()
  await expect(page.getByRole('button', { name: '지도 다시 불러오기' })).toBeVisible()
})

for (const viewport of [
  { name: 'mobile', width: 360, height: 800 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
]) {
  test(`${viewport.name} layouts do not overflow horizontally`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    for (const path of ['#/', '#/resident/report', '#/admin']) {
      await page.goto(path)
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      )
      expect(overflow).toBe(false)
    }
  })
}

test('role choices and resident submission are keyboard operable', async ({ page }) => {
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: /주민으로 시작/ })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: /관리자 데모 입장/ })).toBeFocused()

  await page.getByRole('button', { name: /주민으로 시작/ }).focus()
  await page.keyboard.press('Enter')
  await page.getByLabel('시 선택').selectOption('11')
  await page.locator('.leaflet-container').click({ position: { x: 220, y: 180 } })
  await page.getByLabel('쓰레기 사진').setInputFiles({
    name: 'waste.png',
    mimeType: 'image/png',
    buffer: transparentPng,
  })
  await expect(page.getByText('사진 압축이 완료되었습니다.')).toBeVisible()
  await page.getByRole('button', { name: '제보하기' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: '제보 완료' })).toBeVisible()
})

test('administrator controls have visible labels and restore reset focus', async ({ page }) => {
  await page.goto('#/admin')

  for (const name of ['제보', '히트맵', '기존 쓰레기통', '추천 위치']) {
    await expect(page.getByRole('checkbox', { name })).toBeVisible()
    await expect(
      page.locator('.layer-controls label').filter({ has: page.getByRole('checkbox', { name }) }),
    ).toBeVisible()
  }

  const resetTrigger = page.getByRole('button', { name: '데모 데이터 초기화' })
  await resetTrigger.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(resetTrigger).toBeFocused()
})

test('reduced motion disables decorative transitions', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('#/')

  const durations = await page.getByRole('button', { name: /주민으로 시작/ }).evaluate((button) => {
    const style = getComputedStyle(button)
    return {
      animation: Number.parseFloat(style.animationDuration),
      transition: Number.parseFloat(style.transitionDuration),
    }
  })
  expect(durations.animation).toBeLessThanOrEqual(0.001)
  expect(durations.transition).toBeLessThanOrEqual(0.001)
})
