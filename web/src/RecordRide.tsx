import { useEffect, useRef, useState } from 'react'
import { CircleMarker, MapContainer, Polyline, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

type LatLng = [number, number]

const DEFAULT_CENTER: LatLng = [37.7749, -122.4194]
const SKYLINE_QUEENSTOWN: LatLng = [-45.0313, 168.6631]
const GEOFENCE_RADIUS_KM = 2.5

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

interface RecordRideProps {
  onSave: (rideName: string, distance: number) => Promise<void>
}

function RecordRide({ onSave }: RecordRideProps) {
  const [recording, setRecording] = useState(false)
  const [path, setPath] = useState<LatLng[]>([])
  const [position, setPosition] = useState<LatLng>(DEFAULT_CENTER)
  const [rideName, setRideName] = useState('')
  const [saving, setSaving] = useState(false)
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('checking')
  const watchIdRef = useRef<number | null>(null)

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
    }
  }, [])

  const startRecording = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not available in this browser.')
      return
    }
    setPath([])
    setRideName('')
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

  const stopRecording = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setRecording(false)
  }

  const distance = totalDistanceKm(path)

  const handleSave = async () => {
    if (!rideName.trim() || distance === 0) return
    setSaving(true)
    try {
      await onSave(rideName.trim(), Math.round(distance * 100) / 100)
      setRideName('')
      setPath([])
    } finally {
      setSaving(false)
    }
  }

  if (locationStatus === 'checking') {
    return (
      <div className="record-ride">
        <p className="record-ride__status">Checking your location…</p>
      </div>
    )
  }

  if (locationStatus === 'not-at-skyline') {
    return (
      <div className="record-ride">
        <p className="record-ride__status">Please go to Skyline Queenstown to record your ride.</p>
        <button
          className="btn btn-secondary record-ride__test-btn"
          onClick={() => {
            setPosition(SKYLINE_QUEENSTOWN)
            setLocationStatus('at-skyline')
          }}
        >
          Test: Simulate being at Skyline
        </button>
      </div>
    )
  }

  return (
    <div className="record-ride">
      <div className="record-ride__map">
        <MapContainer center={position} zoom={15} scrollWheelZoom={false} style={{ height: '220px', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <RecenterMap position={position} />
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
          <button className="btn btn-danger" onClick={stopRecording}>
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
