import { expect, it } from 'vitest'
import { computeAdminSummary } from './summary'

it('counts today reports and focused cities', () => {
  const reports = [
    { id: '1', cityCode: '11', createdAt: '2026-07-29T01:00:00.000Z' },
    { id: '2', cityCode: '11', createdAt: '2026-07-28T01:00:00.000Z' },
    { id: '3', cityCode: '26', createdAt: '2026-07-29T01:00:00.000Z' },
  ]
  const result = computeAdminSummary(
    reports as never,
    [{ id: 'C1' }] as never,
    new Date('2026-07-29T12:00:00.000Z'),
  )

  expect(result).toEqual({
    totalReports: 3,
    todayReports: 2,
    focusedCityCount: 2,
    candidateCount: 1,
  })
})
