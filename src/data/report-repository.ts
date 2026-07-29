import type {
  AppDataState,
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

  function isValidState(value: unknown): value is AppDataState {
    return typeof value === 'object'
      && value !== null
      && (value as AppDataState).version === 1
      && Array.isArray((value as AppDataState).reports)
      && Array.isArray((value as AppDataState).bins)
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
    if (event.key !== STORAGE_KEY || event.newValue === null) return
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
