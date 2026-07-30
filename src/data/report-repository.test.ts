import { describe, expect, it, vi } from 'vitest'
import type { AppDataState } from '../domain/models'
import { createReportRepository } from './report-repository'

const validWebp =
  'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEAAUAmJaQAA3AA/v89WAAAAA=='
const lowerQualityWebp =
  'data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA='

const input = {
  cityCode: '11',
  cityName: '서울특별시',
  latitude: 37.5665,
  longitude: 126.978,
  photoDataUrl: validWebp,
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

  it('keeps a corrupt-data warning after replacing recovery state successfully', () => {
    localStorage.setItem('ssudam:data:v1', '{invalid')
    const repository = createReportRepository({ storage: localStorage })

    repository.addReport(input)

    expect(repository.getLastWarning()).toBe('corrupt-data')
    repository.destroy()
  })

  it('rejects an initial stored report outside Korean coordinate bounds', () => {
    const seedRepository = createReportRepository({ storage: localStorage })
    const state = seedRepository.getState()
    seedRepository.destroy()
    localStorage.setItem('ssudam:data:v1', JSON.stringify({
      ...state,
      reports: [{ ...state.reports[0], latitude: 999 }],
    }))

    const repository = createReportRepository({ storage: localStorage })

    expect(repository.getLastWarning()).toBe('corrupt-data')
    expect(repository.getState().reports).toHaveLength(state.reports.length)
    repository.destroy()
  })

  it.each([
    ['invalid timestamp', (state: AppDataState) => ({
      ...state,
      reports: [{ ...state.reports[0], createdAt: 'not-a-date' }],
    })],
    ['unsupported photo data URL', (state: AppDataState) => ({
      ...state,
      reports: [{ ...state.reports[0], photoDataUrl: 'data:text/plain;base64,AAAA' }],
    })],
    ['malformed photo base64', (state: AppDataState) => ({
      ...state,
      reports: [{ ...state.reports[0], photoDataUrl: 'data:image/webp;base64,AAAAA' }],
    })],
    ['photo bytes that do not match the declared image type', (state: AppDataState) => ({
      ...state,
      reports: [{ ...state.reports[0], photoDataUrl: 'data:image/webp;base64,U1NVREFN' }],
    })],
    ['empty photo payload', (state: AppDataState) => ({
      ...state,
      reports: [{ ...state.reports[0], photoDataUrl: 'data:image/webp;base64,' }],
    })],
    ['unknown report city', (state: AppDataState) => ({
      ...state,
      reports: [{ ...state.reports[0], cityCode: '99999', cityName: '없는 도시' }],
    })],
    ['incoherent report city name', (state: AppDataState) => ({
      ...state,
      reports: [{ ...state.reports[0], cityName: '부산광역시' }],
    })],
    ['unknown bin city', (state: AppDataState) => ({
      ...state,
      bins: [{ ...state.bins[0], cityCode: '99999' }],
    })],
  ])('recovers safely from stored state with %s', (_label, corruptState) => {
    const now = () => new Date('2026-07-29T12:00:00.000Z')
    const seedRepository = createReportRepository({ storage: localStorage, now })
    const seed = seedRepository.getState()
    seedRepository.destroy()
    localStorage.setItem('ssudam:data:v1', JSON.stringify(corruptState(seed)))

    const repository = createReportRepository({ storage: localStorage, now })

    expect(repository.getLastWarning()).toBe('corrupt-data')
    expect(repository.getState()).toEqual(seed)
    repository.destroy()
  })

  it('accepts stored report and bin coordinates on Korean boundary values', () => {
    const seedRepository = createReportRepository({ storage: localStorage })
    const state = seedRepository.getState()
    seedRepository.destroy()
    const bounded = {
      ...state,
      reports: [{ ...state.reports[0], latitude: 33, longitude: 124 }],
      bins: [{ ...state.bins[0], latitude: 39, longitude: 132 }],
    }
    localStorage.setItem('ssudam:data:v1', JSON.stringify(bounded))

    const repository = createReportRepository({ storage: localStorage })

    expect(repository.getLastWarning()).toBeUndefined()
    expect(repository.getState()).toEqual(bounded)
    repository.destroy()
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

  it('retries the same quota-limited report with a lower-quality photo without duplication', () => {
    let writes = 0
    let persisted: string | undefined
    const storage = {
      getItem: () => null,
      setItem(_key: string, value: string) {
        writes += 1
        if (writes === 1) throw new DOMException('quota', 'QuotaExceededError')
        persisted = value
      },
      removeItem() {},
      clear() {},
      key: () => null,
      length: 0,
    } satisfies Storage
    const repository = createReportRepository({
      storage,
      idFactory: () => 'RETRY-1',
    })
    const initialCount = repository.getState().reports.length

    const report = repository.addReport(input)
    const persistedAfterRetry = repository.retryReportPersistence(
      report.id,
      lowerQualityWebp,
    )

    expect(persistedAfterRetry).toBe(true)
    expect(repository.getState().reports).toHaveLength(initialCount + 1)
    expect(repository.getReport(report.id)?.photoDataUrl).toBe(lowerQualityWebp)
    expect(JSON.parse(persisted!).reports).toHaveLength(initialCount + 1)
    expect(repository.isReportPersisted(report.id)).toBe(true)
    expect(repository.getLastWarning()).toBeUndefined()
  })

  it('rejects an invalid lower-quality photo without replacing or persisting the report', () => {
    let writes = 0
    const storage = {
      getItem: () => null,
      setItem() {
        writes += 1
        if (writes === 1) throw new DOMException('quota', 'QuotaExceededError')
      },
      removeItem() {},
      clear() {},
      key: () => null,
      length: 0,
    } satisfies Storage
    const repository = createReportRepository({ storage, idFactory: () => 'INVALID-RETRY-1' })
    const report = repository.addReport(input)

    const persisted = repository.retryReportPersistence(
      report.id,
      'data:image/webp;base64,LOWER',
    )

    expect(persisted).toBe(false)
    expect(writes).toBe(1)
    expect(repository.getReport(report.id)?.photoDataUrl).toBe(validWebp)
    expect(repository.isReportPersisted(report.id)).toBe(false)
    expect(repository.getLastWarning()).toBe('storage-quota')
  })

  it('marks a report as session-only when retry persistence still exceeds quota', () => {
    const storage = {
      getItem: () => null,
      setItem: () => { throw new DOMException('quota', 'QuotaExceededError') },
      removeItem() {},
      clear() {},
      key: () => null,
      length: 0,
    } satisfies Storage
    const repository = createReportRepository({ storage, idFactory: () => 'SESSION-1' })
    const initialCount = repository.getState().reports.length

    const report = repository.addReport(input)
    const persisted = repository.retryReportPersistence(
      report.id,
      lowerQualityWebp,
    )

    expect(persisted).toBe(false)
    expect(repository.getState().reports).toHaveLength(initialCount + 1)
    expect(repository.isReportPersisted(report.id)).toBe(false)
    expect(repository.getLastWarning()).toBe('storage-quota')
  })

  it('marks a memory-retained report as session-only when storage is unavailable', () => {
    const storage = {
      getItem: () => null,
      setItem: () => { throw new DOMException('blocked', 'SecurityError') },
      removeItem() {},
      clear() {},
      key: () => null,
      length: 0,
    } satisfies Storage
    const repository = createReportRepository({ storage, idFactory: () => 'UNAVAILABLE-1' })

    const report = repository.addReport(input)

    expect(repository.getReport(report.id)).toBeDefined()
    expect(repository.isReportPersisted(report.id)).toBe(false)
    expect(repository.getLastWarning()).toBe('storage-unavailable')
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
      storageArea: localStorage,
    }))

    expect(repository.getState().reports).toEqual([])
    expect(listener).toHaveBeenCalled()
    repository.destroy()
  })

  it('does not synchronize same-key events from a different storage area', () => {
    const listener = vi.fn()
    const repository = createReportRepository({ storage: localStorage })
    repository.subscribe(listener)
    const before = repository.getState().reports

    window.dispatchEvent(new StorageEvent('storage', {
      key: 'ssudam:data:v1',
      newValue: JSON.stringify({ ...repository.getState(), reports: [] }),
      storageArea: sessionStorage,
    }))

    expect(repository.getState().reports).toEqual(before)
    expect(listener).not.toHaveBeenCalled()
    repository.destroy()
  })

  it('rejects a cross-tab stored bin outside Korean coordinate bounds', () => {
    const listener = vi.fn()
    const repository = createReportRepository({ storage: localStorage })
    repository.subscribe(listener)
    const before = repository.getState()

    window.dispatchEvent(new StorageEvent('storage', {
      key: 'ssudam:data:v1',
      newValue: JSON.stringify({
        ...before,
        bins: [{ ...before.bins[0], longitude: 999 }],
      }),
      storageArea: localStorage,
    }))

    expect(repository.getState()).toEqual(before)
    expect(listener).not.toHaveBeenCalled()
    repository.destroy()
  })

  it('clears a write warning after a later successful persistence', () => {
    let writes = 0
    let persisted: string | null = null
    const listener = vi.fn()
    const storage = {
      getItem: () => null,
      setItem(_key: string, value: string) {
        writes += 1
        if (writes === 1) throw new DOMException('quota', 'QuotaExceededError')
        persisted = value
      },
      removeItem() {},
      clear() {},
      key: () => null,
      length: 0,
    } satisfies Storage
    const repository = createReportRepository({
      storage,
      idFactory: () => `MEMORY-${writes + 1}`,
    })
    repository.subscribe(listener)
    const initialReportCount = repository.getState().reports.length

    repository.addReport(input)
    repository.addReport(input)

    expect(repository.getLastWarning()).toBeUndefined()
    expect(repository.getState().reports).toHaveLength(initialReportCount + 2)
    expect(JSON.parse(persisted!).reports).toHaveLength(initialReportCount + 2)
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('ignores invalid storage events and stops synchronizing after destroy', () => {
    const listener = vi.fn()
    const repository = createReportRepository({ storage: localStorage })
    repository.subscribe(listener)
    const next = { ...repository.getState(), reports: [] }

    window.dispatchEvent(new StorageEvent('storage', { key: 'other-key', newValue: JSON.stringify(next) }))
    window.dispatchEvent(new StorageEvent('storage', { key: 'ssudam:data:v1', newValue: null, storageArea: localStorage }))
    window.dispatchEvent(new StorageEvent('storage', { key: 'ssudam:data:v1', newValue: '{invalid', storageArea: localStorage }))
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'ssudam:data:v1',
      newValue: JSON.stringify({ version: 2, reports: [], bins: [] }),
      storageArea: localStorage,
    }))
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'ssudam:data:v1',
      newValue: JSON.stringify({ version: 1, reports: [null], bins: [] }),
      storageArea: localStorage,
    }))

    expect(listener).not.toHaveBeenCalled()
    repository.destroy()
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'ssudam:data:v1',
      newValue: JSON.stringify(next),
      storageArea: localStorage,
    }))

    expect(listener).not.toHaveBeenCalled()
  })
})
