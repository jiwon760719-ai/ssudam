import { describe, expect, it } from 'vitest'
import type { ExistingBin, WasteReport } from '../domain/models'
import { buildHeatPoints, recommendBinCandidates } from './recommendations'

const photoDataUrl = 'data:image/webp;base64,AAAA'
const reports: WasteReport[] = [
  [37.5665, 126.978, '2026-07-27'],
  [37.5667, 126.9782, '2026-07-28'],
  [37.5666, 126.9781, '2026-07-29'],
  [37.57, 126.982, '2026-07-29'],
].map(([latitude, longitude, day], index) => ({
  id: `R${index}`,
  cityCode: '11',
  cityName: '서울특별시',
  latitude: Number(latitude),
  longitude: Number(longitude),
  createdAt: `${day}T03:00:00.000Z`,
  photoDataUrl,
  source: 'seed',
}))

const bins: ExistingBin[] = [
  { id: 'B1', cityCode: '11', latitude: 37.58, longitude: 126.99 },
]

describe('buildHeatPoints', () => {
  it('assigns larger normalized weight to denser cells', () => {
    const points = buildHeatPoints(reports)

    expect(points[0].weight).toBe(1)
    expect(points.at(-1)?.weight).toBeLessThan(1)
  })
})

describe('recommendBinCandidates', () => {
  it('returns explainable, separated candidates ordered by score', () => {
    const candidates = recommendBinCandidates(reports, bins, '11')

    expect(candidates.length).toBeLessThanOrEqual(3)
    expect(candidates[0]).toMatchObject({
      cityCode: '11',
      reportCount: 3,
    })
    expect(candidates[0].score).toBeGreaterThan(candidates.at(-1)?.score ?? 0)
    expect(candidates[0].nearestBinDistanceMeters).toBeGreaterThan(0)
  })
})
