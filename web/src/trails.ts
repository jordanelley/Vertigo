export type LatLng = [number, number]

export interface TrailDefinition {
  name: string
  file: string
  color: string
}

// import.meta.env.BASE_URL is Vite's configured base path (e.g. "/Vertigo/" in production, "/"
// in dev) - public/ files need it prefixed manually since it's a plain fetch, not an asset import.
const trailFile = (name: string) => `${import.meta.env.BASE_URL}trails/${name}`

export const TRAILS: TrailDefinition[] = [
  { name: 'Vertigo', file: trailFile('vertigo.gpx'), color: '#3b82f6' },
  { name: "Upper Hammy's Track", file: trailFile('upper-hammy-s-track-8273.gpx'), color: '#22c55e' },
  { name: 'Thunder Goat', file: trailFile('thunder-goat.gpx'), color: '#f97316' },
  { name: 'Huck Yeah', file: trailFile('huck-yeah.gpx'), color: '#a855f7' },
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

function nearestTrailForPoint(point: LatLng, trailPaths: Record<string, LatLng[]>): string | null {
  let bestName: string | null = null
  let bestDist = Infinity
  for (const [name, points] of Object.entries(trailPaths)) {
    for (const trailPoint of points) {
      const d = haversineDistanceKm(point, trailPoint)
      if (d < bestDist) {
        bestDist = d
        bestName = name
      }
    }
  }
  return bestName
}

export interface TrailSegment {
  trailName: string
  points: LatLng[]
}

// Below this many points, a run is treated as GPS/matching noise rather than a real transition to another trail.
const MIN_SEGMENT_POINTS = 3

/**
 * Splits a recorded path into runs, each attributed to whichever loaded trail its points lie
 * closest to. Handles a ride that crosses from one trail onto another (e.g. Upper Hammy's Track
 * into Vertigo), returning one segment per trail actually ridden, in order.
 */
export function segmentPathByTrail(path: LatLng[], trailPaths: Record<string, LatLng[]>): TrailSegment[] {
  if (Object.keys(trailPaths).length === 0) return []

  const rawSegments: TrailSegment[] = []
  let currentName: string | null = null
  let currentPoints: LatLng[] = []

  for (const point of path) {
    const name = nearestTrailForPoint(point, trailPaths)
    if (name === null) continue
    if (name !== currentName) {
      if (currentName !== null && currentPoints.length > 0) {
        rawSegments.push({ trailName: currentName, points: currentPoints })
      }
      currentName = name
      currentPoints = [point]
    } else {
      currentPoints.push(point)
    }
  }
  if (currentName !== null && currentPoints.length > 0) {
    rawSegments.push({ trailName: currentName, points: currentPoints })
  }

  // Fold short runs (noise) into whichever segment came before them.
  const folded: TrailSegment[] = []
  for (const segment of rawSegments) {
    if (segment.points.length < MIN_SEGMENT_POINTS && folded.length > 0) {
      folded[folded.length - 1].points.push(...segment.points)
    } else {
      folded.push({ trailName: segment.trailName, points: [...segment.points] })
    }
  }

  // Re-merge consecutive segments that ended up on the same trail after folding.
  const merged: TrailSegment[] = []
  for (const segment of folded) {
    const last = merged[merged.length - 1]
    if (last && last.trailName === segment.trailName) {
      last.points.push(...segment.points)
    } else {
      merged.push({ trailName: segment.trailName, points: [...segment.points] })
    }
  }

  return merged.filter((segment) => segment.points.length >= 2)
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
