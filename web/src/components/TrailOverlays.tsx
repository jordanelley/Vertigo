import { Polyline } from 'react-leaflet'
import { TRAILS, type LatLng } from '../trails'

export function TrailOverlays({ trailPaths }: { trailPaths: Record<string, LatLng[]> }) {
  return (
    <>
      {TRAILS.map((trail) => {
        const points = trailPaths[trail.name]
        if (!points) return null
        return (
          <Polyline
            key={trail.name}
            positions={points}
            pathOptions={{ color: trail.color, weight: 2, opacity: 0.9 }}
          />
        )
      })}
    </>
  )
}
