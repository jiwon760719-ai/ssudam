export type CityOption = {
  code: string
  name: string
  provinceName: string
  centerLatitude: number
  centerLongitude: number
  defaultZoom: number
}

export type WasteReport = {
  id: string
  cityCode: string
  cityName: string
  latitude: number
  longitude: number
  createdAt: string
  photoDataUrl: string
  note?: string
  source: 'seed' | 'resident'
}

export type ExistingBin = {
  id: string
  cityCode: string
  latitude: number
  longitude: number
}

export type BinCandidate = {
  id: string
  cityCode: string
  latitude: number
  longitude: number
  score: number
  reportCount: number
  recurrenceScore: number
  nearestBinDistanceMeters: number
}

export type CreateReportInput = Omit<WasteReport, 'id' | 'createdAt' | 'source'>

export type AppDataState = {
  version: 1
  reports: WasteReport[]
  bins: ExistingBin[]
}

export type ReportRepository = {
  getState(): AppDataState
  getReport(id: string): WasteReport | undefined
  addReport(input: CreateReportInput): WasteReport
  reset(): AppDataState
  subscribe(listener: (state: AppDataState) => void): () => void
  getLastWarning(): 'storage-unavailable' | 'storage-quota' | 'corrupt-data' | undefined
  destroy(): void
}
