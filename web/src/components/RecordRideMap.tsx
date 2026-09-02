import { CircleMarker, ImageOverlay, MapContainer, Polyline } from 'react-leaflet'
import type { LatLngBounds } from 'leaflet'
import type { LatLng } from '../trails'
import { MOUNTAIN_BACKDROP_URL } from '../MountainBackdrop'
import { RecenterMap } from './RecenterMap'
import { FitAllTrails } from './FitAllTrails'
import { TrailOverlays } from './TrailOverlays'
import { LiftOverlays } from './LiftOverlays'

interface RecordRideMapProps {
  position: LatLng
  path: LatLng[]
  trailPaths: Record<string, LatLng[]>
  liftPaths: Record<string, LatLng[]>
  // Bounds the mountain backdrop image is pinned to; null until the trail/lift GPX files load.
  trailBounds: LatLngBounds | null
}

// The live ride map: the mountain backdrop, every trail/lift overlay, the trace of the ride so
// far, and a marker for the rider's current position.
export function RecordRideMap({ position, path, trailPaths, liftPaths, trailBounds }: RecordRideMapProps) {
  return (
    <div className="record-ride__map">
      <MapContainer center={position} zoom={15} scrollWheelZoom={true} style={{ height: '220px', width: '100%' }}>
        {trailBounds && <ImageOverlay url={MOUNTAIN_BACKDROP_URL} bounds={trailBounds} />}
        <RecenterMap position={position} />
        <FitAllTrails trailPaths={trailPaths} liftPaths={liftPaths} />
        <TrailOverlays trailPaths={trailPaths} />
        <LiftOverlays liftPaths={liftPaths} />
        {path.length > 1 && <Polyline positions={path} color="#ff6b35" weight={2} />}
        <CircleMarker
          center={position}
          radius={7}
          pathOptions={{ color: '#2563eb', fillColor: '#60a5fa', fillOpacity: 1 }}
        />
      </MapContainer>
    </div>
  )
}
