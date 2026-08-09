import { useEffect, useRef, useState } from 'react'
import { CircleMarker, MapContainer, Polyline, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { TRAILS, parseGpxTrack, type LatLng } from './trails'

const DEFAULT_CENTER: LatLng = [37.7749, -122.4194]
// Skyline Queenstown gondola top station, Bob's Peak (45°01'36"S 168°38'58"E)
const SKYLINE_QUEENSTOWN: LatLng = [-45.0266, 168.6495]
const GEOFENCE_RADIUS_KM = 2.5
const STADIA_API_KEY = import.meta.env.VITE_STADIA_API_KEY
const VERTIGO_TRAIL_FILE = TRAILS.find((trail) => trail.name === 'Vertigo')?.file ?? '/trails/vertigo.gpx'
const SIMULATED_RIDE_DURATION_MS = 10 * 1000

type LocationStatus = 'checking' | 'at-skyline' | 'not-at-skyline'

function haversineDistanceKm(a: LatLng, b: LatLng): number {
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

function totalDistanceKm(path: LatLng[]): number {
  let total = 0
  for (let i = 1; i < path.length; i++) {
    total += haversineDistanceKm(path[i - 1], path[i])
  }
  return total
}

function RecenterMap({ position }: { position: LatLng }) {
  const map = useMap()
  useEffect(() => {
    map.setView(position)
  }, [position, map])
  return null
}

function TrailOverlays() {
  const [trailPaths, setTrailPaths] = useState<Record<string, LatLng[]>>({})

  useEffect(() => {
    TRAILS.forEach((trail) => {
      fetch(trail.file)
        .then((res) => res.text())
        .then((gpxText) => {
          setTrailPaths((prev) => ({ ...prev, [trail.name]: parseGpxTrack(gpxText) }))
        })
        .catch((err) => console.error(`Failed to load trail "${trail.name}":`, err))
    })
  }, [])

  return (
    <>
      {TRAILS.map((trail) => {
        const points = trailPaths[trail.name]
        if (!points) return null
        return (
          <Polyline
            key={trail.name}
            positions={points}
            pathOptions={{ color: trail.color, weight: 4, dashArray: '8 8', opacity: 0.9 }}
          />
        )
      })}
    </>
  )
}

interface RecordRideProps {
  onSave: (rideName: string, distance: number, time: number) => Promise<void>
}

function RecordRide({ onSave }: RecordRideProps) {
  const [recording, setRecording] = useState(false)
  const [path, setPath] = useState<LatLng[]>([])
  const [position, setPosition] = useState<LatLng>(DEFAULT_CENTER)
  const [rideName, setRideName] = useState('')
  const [saving, setSaving] = useState(false)
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('checking')
  const [elapsedMinutes, setElapsedMinutes] = useState(0)
  const watchIdRef = useRef<number | null>(null)
  const simulationIntervalRef = useRef<number | null>(null)
  const recordingStartRef = useRef<number | null>(null)

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus('not-at-skyline')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const here: LatLng = [pos.coords.latitude, pos.coords.longitude]
        setPosition(here)
        const distanceFromSkyline = haversineDistanceKm(here, SKYLINE_QUEENSTOWN)
        setLocationStatus(distanceFromSkyline <= GEOFENCE_RADIUS_KM ? 'at-skyline' : 'not-at-skyline')
      },
      () => setLocationStatus('not-at-skyline'),
      { enableHighAccuracy: true },
    )
  }, [])

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
      if (simulationIntervalRef.current !== null) {
        window.clearInterval(simulationIntervalRef.current)
      }
    }
  }, [])

  const finishRecording = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    if (simulationIntervalRef.current !== null) {
      window.clearInterval(simulationIntervalRef.current)
      simulationIntervalRef.current = null
    }
    if (recordingStartRef.current !== null) {
      setElapsedMinutes((Date.now() - recordingStartRef.current) / 60000)
      recordingStartRef.current = null
    }
    setRecording(false)
  }

  const startRecording = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not available in this browser.')
      return
    }
    setPath([])
    setRideName('')
    setElapsedMinutes(0)
    recordingStartRef.current = Date.now()
    setRecording(true)
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const next: LatLng = [pos.coords.latitude, pos.coords.longitude]
        setPosition(next)
        setPath((prev) => [...prev, next])
      },
      (err) => console.error('Geolocation error:', err),
      { enableHighAccuracy: true },
    )
  }

  const simulateMovement = async () => {
    if (!recording || simulationIntervalRef.current !== null) return

    let points: LatLng[]
    try {
      const res = await fetch(VERTIGO_TRAIL_FILE)
      points = parseGpxTrack(await res.text())
    } catch (err) {
      console.error('Failed to load Vertigo trail for simulation:', err)
      return
    }
    if (points.length < 2) return

    const stepMs = SIMULATED_RIDE_DURATION_MS / (points.length - 1)
    let index = 0
    setPosition(points[0])
    setPath((prev) => [...prev, points[0]])

    simulationIntervalRef.current = window.setInterval(() => {
      index += 1
      if (index >= points.length) {
        finishRecording()
        return
      }
      const next = points[index]
      setPosition(next)
      setPath((prev) => [...prev, next])
    }, stepMs)
  }

  const distance = totalDistanceKm(path)

  const handleSave = async () => {
    if (!rideName.trim() || distance === 0) return
    setSaving(true)
    try {
      await onSave(rideName.trim(), Math.round(distance * 100) / 100, Math.round(elapsedMinutes * 10) / 10)
      setRideName('')
      setPath([])
    } finally {
      setSaving(false)
    }
  }

  const testButton = (
    <button
      className="btn btn-secondary record-ride__test-btn"
      onClick={() => {
        setPosition(SKYLINE_QUEENSTOWN)
        setLocationStatus('at-skyline')
      }}
    >
      Test: Simulate being at Skyline
    </button>
  )

  if (locationStatus === 'checking') {
    return (
      <div className="record-ride">
        <p className="record-ride__status">Checking your location…</p>
        {testButton}
      </div>
    )
  }

  if (locationStatus === 'not-at-skyline') {
    return (
      <div className="record-ride">
        <p className="record-ride__status">Please go to Skyline Queenstown to record your ride.</p>
        {testButton}
      </div>
    )
  }

  return (
    <div className="record-ride">
      {testButton}
      <button
        className="btn btn-secondary record-ride__test-btn"
        onClick={simulateMovement}
        disabled={!recording}
      >
        Test: Move Along Vertigo (10 sec)
      </button>
      <div className="record-ride__map">
        <MapContainer center={position} zoom={15} scrollWheelZoom={false} style={{ height: '220px', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://stamen.com/" target="_blank">Stamen Design</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
            url={`https://tiles.stadiamaps.com/tiles/stamen_terrain/{z}/{x}/{y}{r}.png?api_key=${STADIA_API_KEY}`}
          />
          <RecenterMap position={position} />
          <TrailOverlays />
          {path.length > 1 && <Polyline positions={path} color="#ff6b35" weight={4} />}
          <CircleMarker
            center={position}
            radius={7}
            pathOptions={{ color: '#2563eb', fillColor: '#60a5fa', fillOpacity: 1 }}
          />
        </MapContainer>
      </div>

      <div className="record-ride__controls">
        <span className="record-ride__distance">{distance.toFixed(2)} km</span>
        {!recording ? (
          <button className="btn btn-primary" onClick={startRecording}>
            {path.length > 0 ? 'Record Again' : 'Record'}
          </button>
        ) : (
          <button className="btn btn-danger" onClick={finishRecording}>
            Stop
          </button>
        )}
      </div>

      {!recording && path.length > 1 && (
        <div className="record-ride__save">
          <input
            className="text-input"
            type="text"
            placeholder="Ride name"
            value={rideName}
            onChange={(e) => setRideName(e.target.value)}
          />
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !rideName.trim()}>
            {saving ? 'Saving…' : 'Save Ride'}
          </button>
        </div>
      )}
    </div>
  )
}

export default RecordRide
