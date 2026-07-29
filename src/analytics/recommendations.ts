import type { BinCandidate, ExistingBin, WasteReport } from '../domain/models'
import { centroid, distanceMeters } from './geo'

export type HeatPoint = {
  latitude: number
  longitude: number
  weight: number
  reportCount: number
}

type Cluster = {
  key: string
  reports: WasteReport[]
  latitude: number
  longitude: number
}

function groupReports(reports: WasteReport[]): Cluster[] {
  const cells = new Map<string, WasteReport[]>()

  for (const report of reports) {
    const latStep = 300 / 111_320
    const lngStep = 300 / (111_320 * Math.cos((report.latitude * Math.PI) / 180))
    const key = `${Math.floor(report.latitude / latStep)}:${Math.floor(report.longitude / lngStep)}`
    cells.set(key, [...(cells.get(key) ?? []), report])
  }

  return [...cells.entries()].map(([key, grouped]) => ({
    key,
    reports: grouped,
    ...centroid(grouped),
  }))
}

export function buildHeatPoints(reports: WasteReport[]): HeatPoint[] {
  const clusters = groupReports(reports)
  const maxCount = Math.max(1, ...clusters.map((cluster) => cluster.reports.length))

  return clusters
    .map((cluster) => ({
      latitude: cluster.latitude,
      longitude: cluster.longitude,
      reportCount: cluster.reports.length,
      weight: cluster.reports.length / maxCount,
    }))
    .sort((a, b) => b.reportCount - a.reportCount)
}

export function recommendBinCandidates(
  reports: WasteReport[],
  bins: ExistingBin[],
  cityCode: string,
): BinCandidate[] {
  const cityReports = reports.filter((report) => report.cityCode === cityCode)
  const cityBins = bins.filter((bin) => bin.cityCode === cityCode)
  const clusters = groupReports(cityReports)
  const maxCount = Math.max(1, ...clusters.map((cluster) => cluster.reports.length))

  const ranked = clusters
    .map((cluster) => {
      const uniqueDays = new Set(cluster.reports.map((report) => report.createdAt.slice(0, 10))).size
      const nearestBinDistanceMeters = cityBins.length
        ? Math.min(...cityBins.map((bin) => distanceMeters(cluster, bin)))
        : 1_000
      const density = cluster.reports.length / maxCount
      const recurrenceScore = Math.min(uniqueDays / 7, 1)
      const distanceScore = Math.min(nearestBinDistanceMeters / 1_000, 1)
      const score = Math.round((density * 0.7 + recurrenceScore * 0.2 + distanceScore * 0.1) * 100)

      return {
        id: `CANDIDATE-${cityCode}-${cluster.key}`,
        cityCode,
        latitude: cluster.latitude,
        longitude: cluster.longitude,
        score,
        reportCount: cluster.reports.length,
        recurrenceScore,
        nearestBinDistanceMeters: Math.round(nearestBinDistanceMeters),
      }
    })
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))

  return ranked.reduce<BinCandidate[]>((selected, candidate) => {
    if (selected.length === 3) return selected
    if (selected.every((item) => distanceMeters(item, candidate) >= 500)) {
      selected.push(candidate)
    }
    return selected
  }, [])
}
