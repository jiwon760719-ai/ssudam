import type { AppDataState, ReportRepository } from '../domain/models'
import type { MapAdapter, MapFactory } from '../map/map-types'

export function createMapFactoryFake() {
  let clickListener: ((location: { latitude: number; longitude: number }) => void) | undefined
  const setViews: Array<{ center: { latitude: number; longitude: number }; zoom: number }> = []
  const adapter: MapAdapter = {
    setView(center, zoom) { setViews.push({ center, zoom }) },
    setSelectedLocation() {},
    onMapClick(listener) {
      clickListener = listener
      return () => { clickListener = undefined }
    },
    renderReports() {},
    renderHeat() {},
    renderBins() {},
    renderCandidates() {},
    setLayerVisibility() {},
    retryTiles() {},
    destroy() {},
  }
  return {
    factory: (() => adapter) as MapFactory,
    click(latitude: number, longitude: number) {
      clickListener?.({ latitude, longitude })
    },
    setViews,
  }
}

export function createRepositoryFake(initial: AppDataState): ReportRepository & { listenerCount(): number } {
  let state = structuredClone(initial)
  const listeners = new Set<(state: AppDataState) => void>()
  const notify = () => listeners.forEach((listener) => listener(structuredClone(state)))
  return {
    getState: () => structuredClone(state),
    getReport: (id) => state.reports.find((report) => report.id === id),
    addReport(input) {
      const report = {
        ...input,
        id: 'SSUDAM-TEST-1',
        createdAt: '2026-07-29T03:00:00.000Z',
        source: 'resident' as const,
      }
      state = { ...state, reports: [...state.reports, report] }
      notify()
      return report
    },
    reset() {
      state = structuredClone(initial)
      notify()
      return structuredClone(state)
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getLastWarning: () => undefined,
    destroy() {},
    listenerCount: () => listeners.size,
  }
}
