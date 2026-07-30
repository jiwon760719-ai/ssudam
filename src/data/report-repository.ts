import type {
  AppDataState,
  ExistingBin,
  ReportRepository,
  WasteReport,
} from '../domain/models'
import { getCity } from './cities'
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
  const sessionOnlyReportIds = new Set<string>()

  function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
  }

  function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0
  }

  function isKoreanCoordinates(latitude: unknown, longitude: unknown): boolean {
    return typeof latitude === 'number'
      && Number.isFinite(latitude)
      && latitude >= 33
      && latitude <= 39
      && typeof longitude === 'number'
      && Number.isFinite(longitude)
      && longitude >= 124
      && longitude <= 132
  }

  function isSupportedPhotoDataUrl(value: unknown): value is string {
    if (typeof value !== 'string') return false
    const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value)
    if (!match || match[2].length < 4 || match[2].length % 4 !== 0) return false

    let bytes: Uint8Array
    try {
      const decoded = atob(match[2])
      bytes = Uint8Array.from(decoded, (character) => character.charCodeAt(0))
    } catch {
      return false
    }

    if (match[1] === 'jpeg') {
      return bytes.length >= 3
        && bytes[0] === 0xff
        && bytes[1] === 0xd8
        && bytes[2] === 0xff
    }
    if (match[1] === 'png') {
      const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
      return bytes.length >= signature.length
        && signature.every((byte, index) => bytes[index] === byte)
    }
    return bytes.length >= 12
      && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF'
      && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  }

  function isWasteReport(value: unknown): value is WasteReport {
    if (!isRecord(value)) return false
    const city = typeof value.cityCode === 'string' ? getCity(value.cityCode) : undefined
    const isIsoTimestamp = typeof value.createdAt === 'string'
      && !Number.isNaN(Date.parse(value.createdAt))
      && new Date(value.createdAt).toISOString() === value.createdAt
    return isNonEmptyString(value.id)
      && city !== undefined
      && value.cityName === city.name
      && isKoreanCoordinates(value.latitude, value.longitude)
      && isIsoTimestamp
      && isSupportedPhotoDataUrl(value.photoDataUrl)
      && (value.source === 'seed' || value.source === 'resident')
      && (value.note === undefined || typeof value.note === 'string')
  }

  function isExistingBin(value: unknown): value is ExistingBin {
    if (!isRecord(value)) return false
    return isNonEmptyString(value.id)
      && typeof value.cityCode === 'string'
      && getCity(value.cityCode) !== undefined
      && isKoreanCoordinates(value.latitude, value.longitude)
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

  function persist(): boolean {
    if (!options.storage) {
      warning = 'storage-unavailable'
      return false
    }
    try {
      options.storage.setItem(STORAGE_KEY, JSON.stringify(state))
      if (warning === 'storage-quota' || warning === 'storage-unavailable') {
        warning = undefined
      }
      return true
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        warning = 'storage-quota'
        return false
      }
      warning = 'storage-unavailable'
      return false
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
      sessionOnlyReportIds.clear()
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
      if (persist()) sessionOnlyReportIds.clear()
      else sessionOnlyReportIds.add(report.id)
      emit()
      return structuredClone(report)
    },
    retryReportPersistence(id, photoDataUrl) {
      if (!isSupportedPhotoDataUrl(photoDataUrl)) return false
      const reportIndex = state.reports.findIndex((report) => report.id === id)
      if (reportIndex < 0) return false
      const reports = [...state.reports]
      reports[reportIndex] = { ...reports[reportIndex], photoDataUrl }
      state = { ...state, reports }
      const persisted = persist()
      if (persisted) sessionOnlyReportIds.clear()
      else sessionOnlyReportIds.add(id)
      emit()
      return persisted
    },
    isReportPersisted: (id) => !sessionOnlyReportIds.has(id),
    reset() {
      state = createSeedState(now())
      if (persist()) {
        warning = undefined
        sessionOnlyReportIds.clear()
      }
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
