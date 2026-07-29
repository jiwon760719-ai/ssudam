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
