import { describe, expect, it, vi } from 'vitest'
import type { AppDataState } from '../domain/models'
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

  it('does not expose mutable report state through public report boundaries', () => {
    const listener = vi.fn()
    const repository = createReportRepository({
      storage: localStorage,
      idFactory: () => 'BOUNDARY-1',
    })
    repository.subscribe(listener)

    const added = repository.addReport(input)
    added.note = 'returned report mutation'

    const fetched = repository.getReport(added.id)!
    fetched.note = 'fetched report mutation'

    const emitted = listener.mock.calls[0][0] as AppDataState
    emitted.reports.find((report) => report.id === added.id)!.note = 'listener state mutation'

    expect(repository.getReport(added.id)?.note).toBe('학교 앞 쓰레기')
  })

  it('keeps report submission in memory when storage writes are unavailable', () => {
    const listener = vi.fn()
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('blocked', 'SecurityError')
      },
      removeItem() {},
      clear() {},
      key: () => null,
      length: 0,
    } satisfies Storage
    const repository = createReportRepository({
      storage,
      idFactory: () => 'MEMORY-1',
    })
    repository.subscribe(listener)

    const report = repository.addReport(input)

    expect(repository.getReport(report.id)).toEqual(report)
    expect(listener).toHaveBeenCalledOnce()
    expect(repository.getLastWarning()).toBe('storage-unavailable')
  })

  it('keeps the report in memory when localStorage quota is exceeded', () => {
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('quota', 'QuotaExceededError')
      },
      removeItem() {},
      clear() {},
      key: () => null,
      length: 0,
    } satisfies Storage
    const repository = createReportRepository({
      storage,
      idFactory: () => 'MEMORY-1',
    })

    repository.addReport(input)

    expect(repository.getReport('MEMORY-1')).toBeDefined()
    expect(repository.getLastWarning()).toBe('storage-quota')
  })

  it('reloads state when another tab updates the storage key', () => {
    const listener = vi.fn()
    const repository = createReportRepository({ storage: localStorage })
    repository.subscribe(listener)
    const next = { ...repository.getState(), reports: [] }
    localStorage.setItem('ssudam:data:v1', JSON.stringify(next))

    window.dispatchEvent(new StorageEvent('storage', {
      key: 'ssudam:data:v1',
      newValue: JSON.stringify(next),
    }))

    expect(repository.getState().reports).toEqual([])
    expect(listener).toHaveBeenCalled()
    repository.destroy()
  })

  it('ignores invalid storage events and stops synchronizing after destroy', () => {
    const listener = vi.fn()
    const repository = createReportRepository({ storage: localStorage })
    repository.subscribe(listener)
    const next = { ...repository.getState(), reports: [] }

    window.dispatchEvent(new StorageEvent('storage', { key: 'other-key', newValue: JSON.stringify(next) }))
    window.dispatchEvent(new StorageEvent('storage', { key: 'ssudam:data:v1', newValue: null }))
    window.dispatchEvent(new StorageEvent('storage', { key: 'ssudam:data:v1', newValue: '{invalid' }))
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'ssudam:data:v1',
      newValue: JSON.stringify({ version: 2, reports: [], bins: [] }),
    }))

    expect(listener).not.toHaveBeenCalled()
    repository.destroy()
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'ssudam:data:v1',
      newValue: JSON.stringify(next),
    }))

    expect(listener).not.toHaveBeenCalled()
  })
})
