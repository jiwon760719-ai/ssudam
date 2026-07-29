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
      const parsed = JSON.parse(raw) as AppDataState
      if (parsed.version !== 1 || !Array.isArray(parsed.reports) || !Array.isArray(parsed.bins)) {
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
    } catch {
      warning = 'storage-unavailable'
    }
  }

  function emit(): void {
    listeners.forEach((listener) => listener(structuredClone(state)))
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
    destroy() {},
  }
}
