import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import type { LatLng } from '../trails'

export function RecenterMap({ position }: { position: LatLng }) {
  const map = useMap()
  useEffect(() => {
    map.setView(position)
  }, [position, map])
  return null
}
