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
  const seoulDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const today = seoulDate.format(now)

  return {
    totalReports: reports.length,
    todayReports: reports.filter((report) => seoulDate.format(new Date(report.createdAt)) === today).length,
    focusedCityCount: new Set(reports.map((report) => report.cityCode)).size,
    candidateCount: candidates.length,
  }
}
