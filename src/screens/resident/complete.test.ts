import { expect, it, vi } from 'vitest'
import { createRepositoryFake } from '../../test/fakes'
import { renderResidentComplete } from './complete'

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
