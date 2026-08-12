import { haversineDistanceKm, type LatLng } from './trails'

export interface LiftDefinition {
  name: string
  file: string
}

export const LIFTS: LiftDefinition[] = [
  { name: 'Skyline Gondola', file: '/lifts/Skyline-Gondela.gpx' },
]

// Hand-traced lift lines aren't as precise as recorded GPX trails, so this is deliberately
// more generous than trail-matching distances.
const LIFT_EXCLUSION_RADIUS_KM = 0.05

function isNearAnyLift(point: LatLng, liftPaths: Record<string, LatLng[]>): boolean {
  for (const points of Object.values(liftPaths)) {
    for (const liftPoint of points) {
      if (haversineDistanceKm(point, liftPoint) <= LIFT_EXCLUSION_RADIUS_KM) {
        return true
      }
    }
  }
  return false
}

/**
 * Strips out any points that fall on/near a lift line (e.g. riding the gondola uphill), splitting
 * the path into separate runs at each removed stretch rather than bridging the gap with a single
 * long jump.
 */
export function excludeLiftPoints(path: LatLng[], liftPaths: Record<string, LatLng[]>): LatLng[][] {
  if (Object.keys(liftPaths).length === 0) return [path]

  const runs: LatLng[][] = []
  let current: LatLng[] = []
  for (const point of path) {
    if (isNearAnyLift(point, liftPaths)) {
      if (current.length > 0) {
        runs.push(current)
        current = []
      }
    } else {
      current.push(point)
    }
  }
  if (current.length > 0) runs.push(current)
  return runs
}

// Wider than LIFT_EXCLUSION_RADIUS_KM: trailheads/trail-ends near a station aren't right on the
// lift line itself, so detecting "reached the station" needs more slack than "riding the lift".
const STATION_RADIUS_KM = 0.3

/**
 * Counts completed top-to-bottom laps: each time the path gets near the lift's bottom station
 * after having gotten near the top station since the last completed lap. The lift's own points
 * are recorded bottom-to-top (lowest elevation first), so its first/last points are the stations.
 */
export function countLiftLaps(path: LatLng[], liftPoints: LatLng[]): number {
  if (liftPoints.length < 2 || path.length === 0) return 0
  const bottom = liftPoints[0]
  const top = liftPoints[liftPoints.length - 1]

  let laps = 0
  let hasReachedTop = false
  for (const point of path) {
    if (haversineDistanceKm(point, top) <= STATION_RADIUS_KM) {
      hasReachedTop = true
    } else if (hasReachedTop && haversineDistanceKm(point, bottom) <= STATION_RADIUS_KM) {
      laps += 1
      hasReachedTop = false
    }
  }
  return laps
}
