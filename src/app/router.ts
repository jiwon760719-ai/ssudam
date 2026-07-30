export type AppRoute =
  | { name: 'home' }
  | { name: 'resident-report' }
  | { name: 'resident-complete'; reportId: string }
  | { name: 'admin' }

export function parseHash(hash: string): AppRoute {
  const normalized = hash || '#/'
  if (normalized === '#/' || normalized === '#') return { name: 'home' }
  if (normalized === '#/resident/report') return { name: 'resident-report' }
  if (normalized === '#/admin') return { name: 'admin' }

  const match = normalized.match(/^#\/resident\/complete\/(.+)$/)
  if (match) {
    try {
      return { name: 'resident-complete', reportId: decodeURIComponent(match[1]) }
    } catch {
      return { name: 'home' }
    }
  }
  return { name: 'home' }
}

export function toHash(route: AppRoute): string {
  switch (route.name) {
    case 'home':
      return '#/'
    case 'resident-report':
      return '#/resident/report'
    case 'resident-complete':
      return `#/resident/complete/${encodeURIComponent(route.reportId)}`
    case 'admin':
      return '#/admin'
  }
}

export function navigate(route: AppRoute): void {
  window.location.hash = toHash(route)
}
