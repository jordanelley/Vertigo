import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import type { LatLng } from '../trails'

// Trail/lift GPX files finish loading in a burst right after mount and then never change again,
// so this only re-fires a handful of times as they resolve before settling - it won't fight with
// RecenterMap's continuous re-centering once a ride is actually being recorded.
export function FitAllTrails({
  trailPaths,
  liftPaths,
}: {
  trailPaths: Record<string, LatLng[]>
  liftPaths: Record<string, LatLng[]>
}) {
  const map = useMap()
  useEffect(() => {
    const allPoints = [...Object.values(trailPaths), ...Object.values(liftPaths)].flat()
    if (allPoints.length === 0) return
    map.fitBounds(allPoints, { padding: [20, 20] })
  }, [trailPaths, liftPaths, map])
  return null
}
