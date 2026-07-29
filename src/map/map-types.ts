import type { HeatPoint } from '../analytics/recommendations'
import type { BinCandidate, ExistingBin, WasteReport } from '../domain/models'

export type Coordinates = { latitude: number; longitude: number }

export type MapLayerVisibility = {
  reports: boolean
  heat: boolean
  bins: boolean
  candidates: boolean
}

export type MapAdapter = {
  setView(center: Coordinates, zoom: number): void
  setSelectedLocation(location: Coordinates | undefined): void
  onMapClick(listener: (location: Coordinates) => void): () => void
  renderReports(reports: WasteReport[]): void
  renderHeat(points: HeatPoint[]): void
  renderBins(bins: ExistingBin[]): void
  renderCandidates(candidates: BinCandidate[]): void
  setLayerVisibility(visibility: MapLayerVisibility): void
  retryTiles(): void
  destroy(): void
}

export type MapFactory = (
  container: HTMLElement,
  options: {
    center: Coordinates
    zoom: number
    onTileError(message: string): void
    onTileReady(): void
  },
) => MapAdapter
