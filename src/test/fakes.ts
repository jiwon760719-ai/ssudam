import type { AppDataState, ReportRepository } from '../domain/models'
import type { MapAdapter, MapFactory } from '../map/map-types'

export function createMapFactoryFake() {
  let clickListener: ((location: { latitude: number; longitude: number }) => void) | undefined
  const adapter: MapAdapter = {
    setView() {},
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
  }
}

export function createRepositoryFake(initial: AppDataState): ReportRepository {
  let state = structuredClone(initial)
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
      state.reports.push(report)
      return report
    },
    reset() {
      state = structuredClone(initial)
      return structuredClone(state)
    },
    subscribe: () => () => undefined,
    getLastWarning: () => undefined,
    destroy() {},
  }
}
