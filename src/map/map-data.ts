import type { BinCandidate, ExistingBin, WasteReport } from '../domain/models'

export type MapMarker = {
  id: string
  latitude: number
  longitude: number
  kind: 'report' | 'bin' | 'candidate'
  label: string
  emphasized: boolean
}

export function toReportMarkers(reports: WasteReport[]): MapMarker[] {
  return reports.map((report) => ({
    id: report.id,
    latitude: report.latitude,
    longitude: report.longitude,
    kind: 'report',
    label: `${report.cityName} · ${new Date(report.createdAt).toLocaleString('ko-KR')}`,
    emphasized: report.source === 'resident',
  }))
}

export function toBinMarkers(bins: ExistingBin[]): MapMarker[] {
  return bins.map((bin) => ({
    id: bin.id,
    latitude: bin.latitude,
    longitude: bin.longitude,
    kind: 'bin',
    label: '기존 쓰레기통',
    emphasized: false,
  }))
}

export function toCandidateMarkers(candidates: BinCandidate[]): MapMarker[] {
  return candidates.map((candidate) => ({
    id: candidate.id,
    latitude: candidate.latitude,
    longitude: candidate.longitude,
    kind: 'candidate',
    label: `추천 ${candidate.score}점 · 제보 ${candidate.reportCount}건 · 기존 쓰레기통까지 ${candidate.nearestBinDistanceMeters}m`,
    emphasized: true,
  }))
}
