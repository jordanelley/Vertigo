export type LatLng = [number, number]

export interface TrailDefinition {
  name: string
  file: string
  color: string
}

export const TRAILS: TrailDefinition[] = [
  { name: 'Vertigo', file: '/trails/vertigo.gpx', color: '#3b82f6' },
  { name: "Upper Hammy's Track", file: '/trails/upper-hammy-s-track-8273.gpx', color: '#22c55e' },
]

export function parseGpxTrack(gpxText: string): LatLng[] {
  const doc = new DOMParser().parseFromString(gpxText, 'application/xml')
  const points = Array.from(doc.getElementsByTagName('trkpt'))
  return points.map((pt): LatLng => [
    parseFloat(pt.getAttribute('lat') ?? '0'),
    parseFloat(pt.getAttribute('lon') ?? '0'),
  ])
}
