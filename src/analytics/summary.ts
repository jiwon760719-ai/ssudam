import type { BinCandidate, WasteReport } from '../domain/models'

export type AdminSummary = {
  totalReports: number
  todayReports: number
  focusedCityCount: number
  candidateCount: number
}

export function computeAdminSummary(
  reports: WasteReport[],
  candidates: BinCandidate[],
  now = new Date(),
): AdminSummary {
  const today = now.toISOString().slice(0, 10)

  return {
    totalReports: reports.length,
    todayReports: reports.filter((report) => report.createdAt.startsWith(today)).length,
    focusedCityCount: new Set(reports.map((report) => report.cityCode)).size,
    candidateCount: candidates.length,
  }
}
