import { expect, it } from 'vitest'
import { createMapFactoryFake, createRepositoryFake } from '../../test/fakes'
import { renderAdminDashboard } from './dashboard'

it('includes a newly submitted resident report in metrics and candidate evidence', () => {
  const repository = createRepositoryFake({ version: 1, reports: [], bins: [] })
  repository.addReport({
    cityCode: '11',
    cityName: '서울특별시',
    latitude: 37.5665,
    longitude: 126.978,
    photoDataUrl: 'data:image/webp;base64,AAAA',
  })
  const map = createMapFactoryFake()

  const screen = renderAdminDashboard({
    repository,
    mapFactory: map.factory,
    now: () => new Date('2026-07-29T12:00:00.000Z'),
    navigate() {},
  })
  document.body.append(screen.element)

  expect(screen.element.querySelector('[data-metric="total"]')?.textContent).toBe('1')
  expect(screen.element.textContent).toContain('최신 제보')
  expect(screen.element.textContent).toContain('서울특별시')
})

it('returns the map to the nationwide view after clearing a city filter', () => {
  const repository = createRepositoryFake({ version: 1, reports: [], bins: [] })
  const map = createMapFactoryFake()
  const screen = renderAdminDashboard({
    repository,
    mapFactory: map.factory,
    now: () => new Date('2026-07-29T12:00:00.000Z'),
    navigate() {},
  })
  document.body.append(screen.element)
  screen.mount?.()

  const citySelect = screen.element.querySelector<HTMLSelectElement>('[data-filter="city"]')!
  citySelect.value = '11'
  citySelect.dispatchEvent(new Event('change'))
  citySelect.value = 'all'
  citySelect.dispatchEvent(new Event('change'))

  expect(map.setViews.at(-1)).toEqual({
    center: { latitude: 36.35, longitude: 127.8 },
    zoom: 7,
  })
})

it('refreshes mounted administrator evidence when a resident report is submitted', () => {
  const repository = createRepositoryFake({ version: 1, reports: [], bins: [] })
  const map = createMapFactoryFake()
  const screen = renderAdminDashboard({
    repository,
    mapFactory: map.factory,
    now: () => new Date('2026-07-29T12:00:00.000Z'),
    navigate() {},
  })
  document.body.append(screen.element)
  screen.mount?.()

  repository.addReport({
    cityCode: '11',
    cityName: '서울특별시',
    latitude: 37.5665,
    longitude: 126.978,
    photoDataUrl: 'data:image/webp;base64,AAAA',
  })

  expect(screen.element.querySelector('[data-metric="total"]')?.textContent).toBe('1')
  expect(screen.element.textContent).toContain('최신 제보')
  expect(screen.element.textContent).toContain('서울특별시')
  expect(repository.listenerCount()).toBe(1)
  screen.destroy()
  expect(repository.listenerCount()).toBe(0)
})

it('keeps dashboard data available and retries tiles after a map tile error', () => {
  const repository = createRepositoryFake({ version: 1, reports: [], bins: [] })
  const map = createMapFactoryFake()
  const screen = renderAdminDashboard({
    repository,
    mapFactory: map.factory,
    navigate() {},
  })
  document.body.append(screen.element)
  screen.mount?.()

  map.tileError('지도를 불러오지 못했습니다. 데이터 레이어는 계속 사용할 수 있습니다.')

  expect(screen.element.querySelector('[data-map-status]')?.textContent)
    .toBe('지도를 불러오지 못했습니다. 데이터 레이어는 계속 사용할 수 있습니다.')
  expect(screen.element.querySelector('[data-map]')).not.toBeNull()
  const retry = screen.element.querySelector<HTMLButtonElement>('[data-action="retry-tiles"]')
  expect(retry).not.toBeNull()
  retry?.click()
  expect(map.retryTileCalls()).toBe(1)
})

it('resets demo data only after the reset dialog is confirmed', () => {
  const repository = createRepositoryFake({ version: 1, reports: [], bins: [] })
  repository.addReport({
    cityCode: '11',
    cityName: '서울특별시',
    latitude: 37.5665,
    longitude: 126.978,
    photoDataUrl: 'data:image/webp;base64,AAAA',
  })
  const screen = renderAdminDashboard({
    repository,
    mapFactory: createMapFactoryFake().factory,
    navigate() {},
  })
  document.body.append(screen.element)

  screen.element.querySelector<HTMLButtonElement>('[data-action="open-reset"]')?.click()
  expect(repository.getState().reports).toHaveLength(1)
  screen.element.querySelector<HTMLButtonElement>('[data-action="confirm-reset"]')?.click()

  expect(repository.getState().reports).toHaveLength(0)
  expect(screen.element.querySelector('[data-metric="total"]')?.textContent).toBe('0')
})
