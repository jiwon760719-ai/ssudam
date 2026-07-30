import { expect, it, vi } from 'vitest'
import { createMapFactoryFake, createRepositoryFake } from '../../test/fakes'
import adminCss from './admin.css?raw'
import { renderAdminDashboard } from './dashboard'

it('keeps map layer labels at least 44px tall for touch input', () => {
  expect(adminCss).toMatch(/\.layer-controls label\s*\{[^}]*min-height:\s*44px/)
})

it('renders the approved dashboard hierarchy', () => {
  const screen = renderAdminDashboard({
    repository: createRepositoryFake({ version: 1, reports: [], bins: [] }),
    mapFactory: createMapFactoryFake().factory,
    navigate() {},
  })

  expect(screen.element.querySelector('.app-bar')).not.toBeNull()
  expect(screen.element.querySelector('.dashboard-intro h1')?.textContent)
    .toBe('쓰담쓰담 관리자')
  expect(screen.element.querySelectorAll('.metric-card')).toHaveLength(4)
  expect(screen.element.querySelectorAll('.metric-card--primary')).toHaveLength(1)
  expect(screen.element.querySelector('.filter-toolbar')).not.toBeNull()
  expect(screen.element.querySelector('.map-panel h2')?.textContent).toBe('전국 제보 지도')
})

it('links the administrator app-bar brand to home', () => {
  const screen = renderAdminDashboard({
    repository: createRepositoryFake({ version: 1, reports: [], bins: [] }),
    mapFactory: createMapFactoryFake().factory,
    navigate() {},
  })

  expect(screen.element.querySelector(
    '.admin-app-bar .brand[href="#/"][aria-label="쓰담쓰담 홈"]',
  )).not.toBeNull()
})

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

  map.tileReady()
  expect(screen.element.querySelector('[data-map-status]')?.textContent).toBe('')
  expect(retry?.hidden).toBe(true)
})

it('shows the matching report evidence when a report marker is selected', () => {
  const repository = createRepositoryFake({ version: 1, reports: [], bins: [] })
  const report = repository.addReport({
    cityCode: '11',
    cityName: '서울특별시',
    latitude: 37.5665,
    longitude: 126.978,
    photoDataUrl: 'data:image/webp;base64,AAAA',
    note: '마커로 고른 주민 메모',
  })
  const map = createMapFactoryFake()
  const screen = renderAdminDashboard({
    repository,
    mapFactory: map.factory,
    navigate() {},
  })
  document.body.append(screen.element)
  screen.mount?.()

  map.selectMarker('report', report.id)

  expect(screen.element.querySelector('[data-latest]')?.textContent).toContain('선택한 제보')
  expect(screen.element.querySelector('[data-latest]')?.textContent).toContain('마커로 고른 주민 메모')
})

it('shows score evidence for the matching candidate marker and disposes the listener', () => {
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
    navigate() {},
  })
  document.body.append(screen.element)
  screen.mount?.()
  const candidateId = screen.element
    .querySelector<HTMLElement>('[data-candidate-id]')
    ?.dataset.candidateId
  expect(candidateId).toBeTruthy()

  map.selectMarker('candidate', candidateId!)

  const detail = screen.element.querySelector('[data-latest]')
  expect(detail?.textContent).toContain('선택한 추천 위치')
  expect(detail?.textContent).toContain('종합 점수')
  expect(detail?.textContent).toContain('반경 내 제보')

  screen.destroy()
  map.selectMarker('report', 'SSUDAM-TEST-1')
  expect(detail?.textContent).toContain('선택한 추천 위치')
})

it('surfaces corrupt saved data with an explicit recovery action', () => {
  const repository = createRepositoryFake({ version: 1, reports: [], bins: [] })
  vi.spyOn(repository, 'getLastWarning').mockReturnValue('corrupt-data')
  const reset = vi.spyOn(repository, 'reset')
  const screen = renderAdminDashboard({
    repository,
    mapFactory: createMapFactoryFake().factory,
    navigate() {},
  })
  document.body.append(screen.element)

  const warning = screen.element.querySelector<HTMLElement>('[data-corrupt-warning]')
  expect(warning?.hidden).toBe(false)
  expect(warning?.textContent).toContain('저장된 데이터가 손상되어')
  screen.element
    .querySelector<HTMLButtonElement>('[data-action="reset-corrupt"]')
    ?.click()

  expect(reset).toHaveBeenCalledOnce()
  expect(warning?.hidden).toBe(true)
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
