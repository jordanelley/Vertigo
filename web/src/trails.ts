export type LatLng = [number, number]

export interface TrailDefinition {
  name: string
  file: string
  color: string
}

export const TRAILS: TrailDefinition[] = [
  { name: 'Vertigo', file: '/trails/vertigo.gpx', color: '#3b82f6' },
  { name: "Upper Hammy's Track", file: '/trails/upper-hammy-s-track-8273.gpx', color: '#22c55e' },
  { name: 'Thunder Goat', file: '/trails/thunder-goat.gpx', color: '#f97316' },
]

export function parseGpxTrack(gpxText: string): LatLng[] {
  const doc = new DOMParser().parseFromString(gpxText, 'application/xml')
  const points = Array.from(doc.getElementsByTagName('trkpt'))
  return points.map((pt): LatLng => [
    parseFloat(pt.getAttribute('lat') ?? '0'),
    parseFloat(pt.getAttribute('lon') ?? '0'),
  ])
}

export function haversineDistanceKm(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const R = 6371
  const dLat = toRad(b[0] - a[0])
  const dLng = toRad(b[1] - a[1])
  const lat1 = toRad(a[0])
  const lat2 = toRad(b[0])
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(h))
}

/** Average distance (km) from each point in `path` to its nearest point on `trailPoints`. Lower = closer match. */
function averageDistanceToTrail(path: LatLng[], trailPoints: LatLng[]): number {
  if (path.length === 0 || trailPoints.length === 0) return Infinity
  let total = 0
  for (const point of path) {
    let nearest = Infinity
    for (const trailPoint of trailPoints) {
      const d = haversineDistanceKm(point, trailPoint)
      if (d < nearest) nearest = d
    }
    total += nearest
  }
  return total / path.length
}

/** Picks whichever loaded trail the recorded path lies closest to, always returning a match. */
export function findClosestTrailName(
  path: LatLng[],
  trailPaths: Record<string, LatLng[]>,
): string | null {
  let bestName: string | null = null
  let bestScore = Infinity
  for (const [name, points] of Object.entries(trailPaths)) {
    const score = averageDistanceToTrail(path, points)
    if (score < bestScore) {
      bestScore = score
      bestName = name
    }
  }
  return bestName
}

/** Builds "<Trail Name> #N" using the next attempt number after any existing matches. */
export function nextAttemptRideName(trailName: string, existingRideNames: string[]): string {
  const escaped = trailName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(`^${escaped} #(\\d+)$`)
  let maxAttempt = 0
  for (const name of existingRideNames) {
    const match = name.match(pattern)
    if (match) {
      const attempt = parseInt(match[1], 10)
      if (attempt > maxAttempt) maxAttempt = attempt
    }
  }
  return `${trailName} #${maxAttempt + 1}`
}
