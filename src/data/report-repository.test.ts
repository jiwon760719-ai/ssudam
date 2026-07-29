import { describe, expect, it, vi } from 'vitest'
import { createReportRepository } from './report-repository'

const input = {
  cityCode: '11',
  cityName: '서울특별시',
  latitude: 37.5665,
  longitude: 126.978,
  photoDataUrl: 'data:image/webp;base64,AAAA',
  note: '학교 앞 쓰레기',
}

describe('report repository', () => {
  it('persists a resident report and emits the new state', () => {
    const listener = vi.fn()
    const repository = createReportRepository({
      storage: localStorage,
      now: () => new Date('2026-07-29T03:00:00.000Z'),
      idFactory: () => 'SSUDAM-2026-0001',
    })
    repository.subscribe(listener)

    const report = repository.addReport(input)

    expect(report).toMatchObject({
      id: 'SSUDAM-2026-0001',
      createdAt: '2026-07-29T03:00:00.000Z',
      source: 'resident',
    })
    expect(repository.getReport(report.id)).toEqual(report)
    expect(listener).toHaveBeenCalledOnce()
  })

  it('recovers from corrupt JSON with deterministic seed data', () => {
    localStorage.setItem('ssudam:data:v1', '{invalid')
    const repository = createReportRepository({ storage: localStorage })

    expect(repository.getState().version).toBe(1)
    expect(repository.getState().reports.length).toBeGreaterThan(0)
    expect(repository.getLastWarning()).toBe('corrupt-data')
  })

  it('falls back to seed data when storage access is unavailable', () => {
    const storage = {
      getItem: () => {
        throw new DOMException('blocked', 'SecurityError')
      },
      setItem() {},
      removeItem() {},
      clear() {},
      key: () => null,
      length: 0,
    } satisfies Storage
    const repository = createReportRepository({ storage })

    expect(repository.getState().reports.length).toBeGreaterThan(0)
    expect(repository.getLastWarning()).toBe('storage-unavailable')
  })

  it('restores the same seed ids after reset', () => {
    const repository = createReportRepository({ storage: localStorage })
    const before = repository.getState().reports.map((report) => report.id)
    repository.addReport(input)

    expect(repository.reset().reports.map((report) => report.id)).toEqual(before)
  })
})
