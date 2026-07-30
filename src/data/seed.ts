import type { AppDataState, ExistingBin, WasteReport } from '../domain/models'
import { getCity } from './cities'

const METRO_CLUSTERS = [
  { cityCode: '11', offsets: [[0.003, 0.004], [-0.004, 0.006], [0.005, -0.003]] },
  { cityCode: '26', offsets: [[0.004, -0.004], [-0.003, 0.005], [0.006, 0.002]] },
  { cityCode: '27', offsets: [[0.003, 0.004], [-0.004, -0.003], [0.005, 0.002]] },
  { cityCode: '28', offsets: [[0.004, 0.003], [-0.003, 0.005], [0.005, -0.004]] },
  { cityCode: '29', offsets: [[0.003, -0.004], [-0.004, 0.003], [0.005, 0.002]] },
  { cityCode: '30', offsets: [[0.004, 0.003], [-0.003, -0.004], [0.005, 0.002]] },
  { cityCode: '31', offsets: [[0.003, 0.004], [-0.004, 0.003], [0.005, -0.002]] },
  { cityCode: '36', offsets: [[0.004, -0.003], [-0.003, 0.004], [0.005, 0.002]] },
] as const

const SEED_PHOTO =
  'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEAAUAmJaQAA3AA/v89WAAAAA=='

function cityFor(code: string) {
  const city = getCity(code)
  if (!city) throw new Error(`Unknown seed city: ${code}`)
  return city
}

export function createSeedState(now: Date = new Date()): AppDataState {
  const reports: WasteReport[] = []
  const bins: ExistingBin[] = []

  METRO_CLUSTERS.forEach((cluster, clusterIndex) => {
    const city = cityFor(cluster.cityCode)
    cluster.offsets.forEach(([latitudeOffset, longitudeOffset], reportIndex) => {
      reports.push({
        id: `SEED-${city.code}-${String(reportIndex + 1).padStart(2, '0')}`,
        cityCode: city.code,
        cityName: city.name,
        latitude: city.centerLatitude + latitudeOffset,
        longitude: city.centerLongitude + longitudeOffset,
        createdAt: new Date(now.getTime() - ((clusterIndex * 3 + reportIndex + 1) * 3_600_000)).toISOString(),
        photoDataUrl: SEED_PHOTO,
        note: '발표용 초기 신고 데이터',
        source: 'seed',
      })
    })
    bins.push({
      id: `BIN-${city.code}-01`,
      cityCode: city.code,
      latitude: city.centerLatitude + 0.015,
      longitude: city.centerLongitude - 0.012,
    })
  })

  return { version: 1, reports, bins }
}
