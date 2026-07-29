import type {
  AppDataState,
  ExistingBin,
  ReportRepository,
  WasteReport,
} from '../domain/models'
import { createSeedState } from './seed'

const STORAGE_KEY = 'ssudam:data:v1'

type Options = {
  storage?: Storage
  now?: () => Date
  idFactory?: () => string
}

export function createReportRepository(options: Options = {}): ReportRepository {
  const listeners = new Set<(state: AppDataState) => void>()
  const now = options.now ?? (() => new Date())
  const idFactory = options.idFactory ?? (() => `SSUDAM-${Date.now().toString(36).toUpperCase()}`)
  let warning: ReturnType<ReportRepository['getLastWarning']>
  let state = readInitial()

  function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
  }

  function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0
  }

  function isFiniteCoordinate(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value)
  }

  function isWasteReport(value: unknown): value is WasteReport {
    if (!isRecord(value)) return false
    return isNonEmptyString(value.id)
      && isNonEmptyString(value.cityCode)
      && isNonEmptyString(value.cityName)
      && isFiniteCoordinate(value.latitude)
      && isFiniteCoordinate(value.longitude)
      && isNonEmptyString(value.createdAt)
      && isNonEmptyString(value.photoDataUrl)
      && (value.source === 'seed' || value.source === 'resident')
      && (value.note === undefined || typeof value.note === 'string')
  }

  function isExistingBin(value: unknown): value is ExistingBin {
    if (!isRecord(value)) return false
    return isNonEmptyString(value.id)
      && isNonEmptyString(value.cityCode)
      && isFiniteCoordinate(value.latitude)
      && isFiniteCoordinate(value.longitude)
  }

  function isValidState(value: unknown): value is AppDataState {
    if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.reports) || !Array.isArray(value.bins)) {
      return false
    }
    return value.reports.every(isWasteReport) && value.bins.every(isExistingBin)
  }

  function readInitial(): AppDataState {
    if (!options.storage) {
      warning = 'storage-unavailable'
      return createSeedState(now())
    }
    let raw: string | null
    try {
      raw = options.storage.getItem(STORAGE_KEY)
    } catch {
      warning = 'storage-unavailable'
      return createSeedState(now())
    }
    if (!raw) return createSeedState(now())
    try {
      const parsed: unknown = JSON.parse(raw)
      if (!isValidState(parsed)) {
        throw new Error('invalid-state')
      }
      return parsed
    } catch {
      warning = 'corrupt-data'
      return createSeedState(now())
    }
  }

  function persist(): void {
    if (!options.storage) return
    try {
      options.storage.setItem(STORAGE_KEY, JSON.stringify(state))
      if (warning === 'storage-quota' || warning === 'storage-unavailable') {
        warning = undefined
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        warning = 'storage-quota'
        return
      }
      warning = 'storage-unavailable'
    }
  }

  function emit(): void {
    listeners.forEach((listener) => listener(structuredClone(state)))
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY || event.storageArea !== options.storage || event.newValue === null) return
    try {
      const parsed: unknown = JSON.parse(event.newValue)
      if (!isValidState(parsed)) return
      state = parsed
      emit()
    } catch {
      // A malformed cross-tab payload must not disturb the current session.
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', onStorage)
  }

  return {
    getState: () => structuredClone(state),
    getReport: (id) => {
      const report = state.reports.find((candidate) => candidate.id === id)
      return report && structuredClone(report)
    },
    addReport(input) {
      const report: WasteReport = {
        ...input,
        id: idFactory(),
        createdAt: now().toISOString(),
        source: 'resident',
      }
      state = { ...state, reports: [...state.reports, report] }
      persist()
      emit()
      return structuredClone(report)
    },
    reset() {
      state = createSeedState(now())
      persist()
      emit()
      return structuredClone(state)
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getLastWarning: () => warning,
    destroy() {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', onStorage)
      }
    },
  }
}
