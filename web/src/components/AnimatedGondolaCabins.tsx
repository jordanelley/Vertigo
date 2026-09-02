import { useEffect, useState } from 'react'
import { Marker } from 'react-leaflet'
import { divIcon } from 'leaflet'
import type { LatLng } from '../trails'
import { positionAlongPath } from '../mapGeometry'

const GONDOLA_CABIN_COUNT = 6
const GONDOLA_CYCLE_SECONDS = 40
const GONDOLA_TICK_MS = 200

const gondolaCabinIcon = divIcon({
  className: 'gondola-cabin-icon',
  html: `<svg width="10" height="16" viewBox="0 0 10 16">
    <line x1="5" y1="0" x2="5" y2="5" stroke="#9ca3af" stroke-width="1" />
    <rect x="1" y="5" width="8" height="7" rx="2" fill="#1e293b" stroke="#cbd5e1" stroke-width="1" />
  </svg>`,
  iconSize: [10, 16],
  iconAnchor: [5, 0],
})

// Cabins bounce back and forth along the lift line (0 -> 1 -> 0), evenly spaced in phase so they
// never bunch up, at a pace slow enough to read as a real gondola rather than a toy on fast-forward.
export function AnimatedGondolaCabins({ points }: { points: LatLng[] }) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), GONDOLA_TICK_MS)
    return () => window.clearInterval(id)
  }, [])

  const elapsedSeconds = (tick * GONDOLA_TICK_MS) / 1000
  return (
    <>
      {Array.from({ length: GONDOLA_CABIN_COUNT }, (_, i) => {
        const offset = i / GONDOLA_CABIN_COUNT
        const phase = (elapsedSeconds / GONDOLA_CYCLE_SECONDS + offset) % 1
        const fraction = phase < 0.5 ? phase * 2 : 2 - phase * 2
        return (
          <Marker key={i} position={positionAlongPath(points, fraction)} icon={gondolaCabinIcon} interactive={false} />
        )
      })}
    </>
  )
}
