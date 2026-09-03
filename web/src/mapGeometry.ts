import { haversineDistanceKm, type LatLng } from './trails'

export const DEFAULT_CENTER: LatLng = [37.7749, -122.4194]

// Walks the cumulative distance along a path to find the point sitting at `fraction` (0-1) of
// the way along it, interpolating between whichever two points straddle that distance.
export function positionAlongPath(points: LatLng[], fraction: number): LatLng {
  if (points.length === 0) return DEFAULT_CENTER
  if (points.length === 1) return points[0]

  const segmentLengths = points.slice(1).map((point, i) => haversineDistanceKm(points[i], point))
  const totalLength = segmentLengths.reduce((sum, length) => sum + length, 0)
  if (totalLength === 0) return points[0]

  let remaining = fraction * totalLength
  for (let i = 0; i < segmentLengths.length; i++) {
    const segmentLength = segmentLengths[i]
    if (remaining <= segmentLength || i === segmentLengths.length - 1) {
      const t = segmentLength === 0 ? 0 : Math.min(remaining / segmentLength, 1)
      const [lat1, lon1] = points[i]
      const [lat2, lon2] = points[i + 1]
      return [lat1 + (lat2 - lat1) * t, lon1 + (lon2 - lon1) * t]
    }
    remaining -= segmentLength
  }
  return points[points.length - 1]
}
