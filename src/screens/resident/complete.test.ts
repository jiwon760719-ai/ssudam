import { expect, it, vi } from 'vitest'
import { createRepositoryFake } from '../../test/fakes'
import { renderResidentComplete } from './complete'

it('renders completion actions with filled and tonal hierarchy', () => {
  const repository = createRepositoryFake({ version: 1, reports: [], bins: [] })
  const report = repository.addReport({
    cityCode: '11',
    cityName: '서울특별시',
    latitude: 37.5665,
    longitude: 126.978,
    photoDataUrl: 'data:image/webp;base64,AAAA',
  })
  const screen = renderResidentComplete({ repository, reportId: report.id, navigate() {} })

  expect(screen.element.querySelector('[data-action="home"]')?.classList)
    .toContain('button--filled')
  expect(screen.element.querySelector('[data-action="another"]')?.classList)
    .toContain('button--tonal')
  expect(screen.element.querySelector('.admin-sync')?.textContent)
    .toContain('관리자 지도에 반영됨')
})

it('links the completion app-bar brand to home', () => {
  const repository = createRepositoryFake({ version: 1, reports: [], bins: [] })
  const report = repository.addReport({
    cityCode: '11',
    cityName: '서울특별시',
    latitude: 37.5665,
    longitude: 126.978,
    photoDataUrl: 'data:image/webp;base64,AAAA',
  })
  const screen = renderResidentComplete({ repository, reportId: report.id, navigate() {} })

  expect(screen.element.querySelector(
    '.app-bar .brand[href="#/"][aria-label="쓰담쓰담 홈"]',
  )).not.toBeNull()
})

it('shows 제보 완료 and administrator map synchronization copy', () => {
  const repository = createRepositoryFake({ version: 1, reports: [], bins: [] })
  const report = repository.addReport({
    cityCode: '11',
    cityName: '서울특별시',
    latitude: 37.5665,
    longitude: 126.978,
    photoDataUrl: 'data:image/webp;base64,AAAA',
  })

  const navigate = vi.fn()
  const screen = renderResidentComplete({ repository, reportId: report.id, navigate })
  document.body.append(screen.element)

  expect(screen.element.textContent).toContain('제보 완료')
  expect(screen.element.textContent).toContain('관리자 지도에 반영됨')
  expect(screen.element.textContent).toContain(report.id)

  screen.element.querySelector<HTMLButtonElement>('[data-action="home"]')?.click()
  screen.element.querySelector<HTMLButtonElement>('[data-action="another"]')?.click()

  expect(navigate).toHaveBeenNthCalledWith(1, { name: 'home' })
  expect(navigate).toHaveBeenNthCalledWith(2, { name: 'resident-report' })
})

it('renders a malicious-looking report ID as literal text', () => {
  const repository = createRepositoryFake({ version: 1, reports: [], bins: [] })
  const report = repository.addReport({
    cityCode: '11', cityName: '서울특별시', latitude: 37.5665, longitude: 126.978,
    photoDataUrl: 'data:image/webp;base64,AAAA',
  })
  const maliciousId = '<img src=x data-injected="true">'
  repository.getReport = () => ({ ...report, id: maliciousId })

  const screen = renderResidentComplete({ repository, reportId: maliciousId, navigate() {} })

  expect(screen.element.querySelector('[data-injected="true"]')).toBeNull()
  expect(screen.element.querySelector('dd')?.textContent).toBe(maliciousId)
})

it('warns that a memory-retained report may disappear while keeping completion copy', () => {
  const repository = createRepositoryFake({ version: 1, reports: [], bins: [] })
  const report = repository.addReport({
    cityCode: '11',
    cityName: '서울특별시',
    latitude: 37.5665,
    longitude: 126.978,
    photoDataUrl: 'data:image/webp;base64,AAAA',
  })
  repository.isReportPersisted = () => false

  const screen = renderResidentComplete({ repository, reportId: report.id, navigate() {} })

  expect(screen.element.textContent).toContain('제보 완료')
  expect(screen.element.textContent).toContain('관리자 지도에 반영됨')
  expect(screen.element.textContent).toContain('현재 브라우저 세션에서만 유지됩니다.')
  expect(screen.element.textContent).toContain('새로고침하면 사라질 수 있습니다.')
})
