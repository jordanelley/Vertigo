export type LatLng = [number, number]

export interface TrailDefinition {
  name: string
  file: string
  color: string
}

// import.meta.env.BASE_URL is Vite's configured base path (e.g. "/Vertigo/" in production, "/"
// in dev) - public/ files need it prefixed manually since it's a plain fetch, not an asset import.
const trailFile = (name: string) => `${import.meta.env.BASE_URL}trails/${name}`

// 1-6 difficulty scale: purple (easiest) through red (hardest).
const LEVEL_COLORS: Record<number, string> = {
  1: '#895489', // purple
  2: '#46b415', // green
  3: '#3298ee', // light blue
  4: '#151163', // dark blue
  5: '#000000', // black
  6: '#c72a3a', // red
}

// Difficulty ratings pulled from Trailforks (trailforks.com/trails/<slug>). Trailforks itself
// only distinguishes Blue / Black-ish / Double Black for these trails, so that's bucketed onto
// this park's 6-level scale as: Blue -> 3, Black Diamond/Advanced -> 5, Double Black Diamond -> 6.
// Skyline Access Road isn't a difficulty-rated trail (it's the paved/gravel road to the gondola).
const trail = (name: string, file: string, level: number): TrailDefinition => ({
  name,
  file: trailFile(file),
  color: LEVEL_COLORS[level],
})

export const TRAILS: TrailDefinition[] = [
  trail('Vertigo', 'vertigo.gpx', 3),
  trail("Upper Hammy's Track", 'upper-hammy-s-track-8273.gpx', 3),
  trail('Thunder Goat', 'thunder-goat.gpx', 3),
  trail('Lazy Vertigo', 'lazy-vertigo.gpx', 3),
  trail("Hammy's Return", 'hammy-s-return.gpx', 3),
  trail("Lower Hammy's Track", 'lower-hammy-s-track-16507.gpx', 3),
  trail('Skyline Access Road', 'skyline-access-road.gpx', 1),
  trail('Huck Yeah', 'huck-yeah.gpx', 5),
  trail('Armageddon', 'armageddon-8266.gpx', 5),
  trail('Black Beard', 'black-beard.gpx', 5),
  trail('El Gato', 'el-gato-721751.gpx', 5),
  trail('Give It Barry', 'give-it-barry.gpx', 5),
  trail('Grundy', 'grundy.gpx', 5),
  trail("I'm A Shreddin", 'i-m-a-shreddin-71818.gpx', 5),
  trail('Rock Garden', 'rock-garden-12336.gpx', 5),
  trail('Shikaka', 'shikaka.gpx', 5),
  trail('Squid Run', 'squid-run.gpx', 4),
  trail('Thingymajig', 'thingymajig.gpx', 4),
  trail("Ant's Track", 'ant-s-track.gpx', 6),
  trail('Drop Garden', 'drop-garden.gpx', 6),
  trail('Fundy', 'fundy.gpx', 6),
  trail('G.S.D.', 'g-s-d.gpx', 6),
  trail('Hobbit to GSD Link', 'hobbit-to-gsd-link.gpx', 6),
  trail('Hobbit', 'hobbit.gpx', 6),
  trail('Slippery Ninja', 'slippery-ninja.gpx', 6),
  trail('World Cup', 'world-cup-8261.gpx', 6),
  trail('Bubba', 'bubba.gpx', 5),
  trail('Original', 'original.gpx', 4),
  trail('Battlestag', 'battlestag.gpx', 5),
  trail('Colonel Senders', 'colonel-senders-709986.gpx', 4),
  trail('Single Track Sandwich', 'single-track-sandwich.gpx', 4),
  trail("Hammy's Link", 'hammy-s-link-12333.gpx', 3),
  trail('KY', 'ky.gpx', 5),
  trail('Col Pith', 'col-pith.gpx', 5),
  trail("Jeremy's", 'jeremy-s.gpx', 6),
  trail('Diesel', 'diesel.gpx', 5),
  trail('Old Original', 'old-original.gpx', 5),
  trail('Rat Attack', 'rat-attack.gpx', 6),
  trail('Jungle Adventure', 'jungle-adventure.gpx', 5),
  trail('Fan Trail', 'fan-trail.gpx', 5),
  trail('Killer Bee', 'killer-bee.gpx', 6),
  trail('One82', 'one82.gpx', 5),
  trail('K Fry', 'k-fry.gpx', 5),
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
