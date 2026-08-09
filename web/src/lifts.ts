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
