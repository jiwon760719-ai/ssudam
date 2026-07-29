export type Coordinates = { latitude: number; longitude: number }

const EARTH_RADIUS_METERS = 6_371_000

export function distanceMeters(a: Coordinates, b: Coordinates): number {
  const toRadians = (value: number) => (value * Math.PI) / 180
  const dLat = toRadians(b.latitude - a.latitude)
  const dLon = toRadians(b.longitude - a.longitude)
  const lat1 = toRadians(a.latitude)
  const lat2 = toRadians(b.latitude)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h))
}

export function centroid(points: Coordinates[]): Coordinates {
  return {
    latitude: points.reduce((sum, point) => sum + point.latitude, 0) / points.length,
    longitude: points.reduce((sum, point) => sum + point.longitude, 0) / points.length,
  }
}
