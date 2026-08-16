import { useEffect, useMemo, useRef, useState } from 'react'
import { CircleMarker, ImageOverlay, MapContainer, Polyline, useMap } from 'react-leaflet'
import { latLngBounds, type LatLngBounds } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  TRAILS,
  parseGpxTrack,
  haversineDistanceKm,
  segmentPathByTrail,
  nextAttemptRideName,
  type LatLng,
  type TrailDefinition,
} from './trails'
import { LIFTS, excludeLiftPoints, countLiftLaps } from './lifts'
import { MOUNTAIN_BACKDROP_URL } from './MountainBackdrop'

const DEFAULT_CENTER: LatLng = [37.7749, -122.4194]
// Skyline Queenstown gondola top station, Bob's Peak (45°01'36"S 168°38'58"E)
const SKYLINE_QUEENSTOWN: LatLng = [-45.0266, 168.6495]
const GEOFENCE_RADIUS_KM = 2.5
const SIMULATED_RIDE_DURATION_MS = 10 * 1000
const vertigoAndThunderGoat = TRAILS.filter((trail) => trail.name === 'Vertigo' || trail.name === 'Thunder Goat')

const hammysTrail = TRAILS.find((trail) => trail.name === "Upper Hammy's Track")
const thunderGoatTrail = TRAILS.find((trail) => trail.name === 'Thunder Goat')
const vertigoTrail = TRAILS.find((trail) => trail.name === 'Vertigo')
const gondolaLift = LIFTS.find((lift) => lift.name === 'Skyline Gondola')
const bigRideSequence =
  hammysTrail && thunderGoatTrail && vertigoTrail && gondolaLift
    ? [
        hammysTrail,
        thunderGoatTrail,
        gondolaLift,
        vertigoTrail,
        thunderGoatTrail,
        gondolaLift,
        hammysTrail,
        thunderGoatTrail,
      ]
    : null

type LocationStatus = 'checking' | 'at-skyline' | 'not-at-skyline'

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

// Trail/lift GPX files finish loading in a burst right after mount and then never change again,
// so this only re-fires a handful of times as they resolve before settling - it won't fight with
// RecenterMap's continuous re-centering once a ride is actually being recorded.
function FitAllTrails({
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

function TrailOverlays({ trailPaths }: { trailPaths: Record<string, LatLng[]> }) {
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

function LiftOverlays({ liftPaths }: { liftPaths: Record<string, LatLng[]> }) {
  return (
    <>
      {LIFTS.map((lift) => {
        const points = liftPaths[lift.name]
        if (!points) return null
        return (
          <Polyline
            key={lift.name}
            positions={points}
            pathOptions={{ color: '#9ca3af', weight: 1.5, dashArray: '2 10', opacity: 0.8 }}
          />
        )
      })}
    </>
  )
}

interface RecordRideProps {
  onSave: (rideName: string, distance: number, time: number) => Promise<void>
  existingRideNames: string[]
}

function RecordRide({ onSave, existingRideNames }: RecordRideProps) {
  const [recording, setRecording] = useState(false)
  const [path, setPath] = useState<LatLng[]>([])
  const [position, setPosition] = useState<LatLng>(DEFAULT_CENTER)
  const [saving, setSaving] = useState(false)
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('checking')
  const [elapsedMinutes, setElapsedMinutes] = useState(0)
  const [trailPaths, setTrailPaths] = useState<Record<string, LatLng[]>>({})
  const [liftPaths, setLiftPaths] = useState<Record<string, LatLng[]>>({})
  const [showTrailPicker, setShowTrailPicker] = useState(false)
  const watchIdRef = useRef<number | null>(null)
  const simulationIntervalRef = useRef<number | null>(null)
  const recordingStartRef = useRef<number | null>(null)

  useEffect(() => {
    TRAILS.forEach((trail) => {
      fetch(trail.file)
        .then((res) => res.text())
        .then((gpxText) => {
          setTrailPaths((prev) => ({ ...prev, [trail.name]: parseGpxTrack(gpxText) }))
        })
        .catch((err) => console.error(`Failed to load trail "${trail.name}":`, err))
    })
    LIFTS.forEach((lift) => {
      fetch(lift.file)
        .then((res) => res.text())
        .then((gpxText) => {
          setLiftPaths((prev) => ({ ...prev, [lift.name]: parseGpxTrack(gpxText) }))
        })
        .catch((err) => console.error(`Failed to load lift "${lift.name}":`, err))
    })
  }, [])

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
    setElapsedMinutes(0)
    setShowTrailPicker(false)
    recordingStartRef.current = Date.now()
    setRecording(true)
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const next: LatLng = [pos.coords.latitude, pos.coords.longitude]
        if (haversineDistanceKm(next, SKYLINE_QUEENSTOWN) > GEOFENCE_RADIUS_KM) {
          console.warn('Ignoring GPS update outside the Skyline area:', next)
          return
        }
        setPosition(next)
        setPath((prev) => [...prev, next])
      },
      (err) => console.error('Geolocation error:', err),
      { enableHighAccuracy: true },
    )
  }

  const loadPoints = async (item: { name: string; file: string }): Promise<LatLng[]> => {
    const cached = trailPaths[item.name] ?? liftPaths[item.name]
    if (cached) return cached
    const res = await fetch(item.file)
    return parseGpxTrack(await res.text())
  }

  const runSimulatedPath = (points: LatLng[], durationMs: number) => {
    const stepMs = durationMs / (points.length - 1)
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

  const simulateMovement = async (trail: TrailDefinition) => {
    if (!recording || simulationIntervalRef.current !== null) return
    setShowTrailPicker(false)

    let points: LatLng[]
    try {
      points = await loadPoints(trail)
    } catch (err) {
      console.error(`Failed to load trail "${trail.name}" for simulation:`, err)
      return
    }
    if (points.length < 2) return

    runSimulatedPath(points, SIMULATED_RIDE_DURATION_MS)
  }

  const simulateCombinedRide = async (trails: TrailDefinition[]) => {
    if (!recording || simulationIntervalRef.current !== null) return
    setShowTrailPicker(false)

    let combined: LatLng[]
    try {
      const pointSets: LatLng[][] = await Promise.all(trails.map((trail) => loadPoints(trail)))
      combined = pointSets.flat()
    } catch (err) {
      console.error('Failed to load trails for combined simulation:', err)
      return
    }
    if (combined.length < 2) return

    runSimulatedPath(combined, SIMULATED_RIDE_DURATION_MS * trails.length)
  }

  const simulateBigRide = async () => {
    if (!recording || simulationIntervalRef.current !== null || !bigRideSequence) return
    setShowTrailPicker(false)

    let combined: LatLng[]
    try {
      const pointSets: LatLng[][] = await Promise.all(bigRideSequence.map((item) => loadPoints(item)))
      combined = pointSets.flat()
    } catch (err) {
      console.error('Failed to load trails/lifts for big ride simulation:', err)
      return
    }
    if (combined.length < 2) return

    runSimulatedPath(combined, SIMULATED_RIDE_DURATION_MS)
  }

  const distance = totalDistanceKm(path)

  // Geographic bounds the mountain backdrop image is pinned to, padded out past the trail
  // network itself so the art doesn't end exactly at the last trail point. Padded in real
  // lat/lng space (not screen pixels), so zooming out on the map eventually pans past the
  // image's edge into the plain blue .leaflet-container background beneath it.
  const trailBounds = useMemo((): LatLngBounds | null => {
    const allPoints = [...Object.values(trailPaths), ...Object.values(liftPaths)].flat()
    if (allPoints.length === 0) return null
    return latLngBounds(allPoints).pad(0.4)
  }, [trailPaths, liftPaths])

  const gondolaLaps = useMemo(() => {
    if (recording || path.length < 2 || !gondolaLift) return 0
    const liftPoints = liftPaths[gondolaLift.name]
    if (!liftPoints) return 0
    return countLiftLaps(path, liftPoints)
  }, [recording, path, liftPaths])

  const computedSegments = useMemo(() => {
    if (recording || path.length < 2) return []
    const runs = excludeLiftPoints(path, liftPaths)
    const rawSegments = runs.flatMap((run) => segmentPathByTrail(run, trailPaths))
    const namesSoFar: string[] = []
    return rawSegments.map((segment) => {
      const segDistance = totalDistanceKm(segment.points)
      const name = nextAttemptRideName(segment.trailName, [...existingRideNames, ...namesSoFar])
      namesSoFar.push(name)
      return { name, distance: segDistance }
    })
  }, [recording, path, trailPaths, liftPaths, existingRideNames])

  const handleSave = async () => {
    if (computedSegments.length === 0) return
    const totalSegmentDistance = computedSegments.reduce((sum, s) => sum + s.distance, 0)
    setSaving(true)
    try {
      for (const segment of computedSegments) {
        const segTime =
          totalSegmentDistance > 0 ? (elapsedMinutes * segment.distance) / totalSegmentDistance : 0
        await onSave(segment.name, Math.round(segment.distance * 100) / 100, Math.round(segTime * 10) / 10)
      }
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
        onClick={() => setShowTrailPicker((prev) => !prev)}
        disabled={!recording}
      >
        Test: Moving
      </button>
      {showTrailPicker && (
        <div className="record-ride__trail-picker">
          {TRAILS.map((trail) => (
            <button
              key={trail.name}
              className="btn btn-secondary record-ride__test-btn"
              onClick={() => simulateMovement(trail)}
            >
              {trail.name}
            </button>
          ))}
          {vertigoAndThunderGoat.length === 2 && (
            <button
              className="btn btn-secondary record-ride__test-btn"
              onClick={() => simulateCombinedRide(vertigoAndThunderGoat)}
            >
              Vertigo + Thunder Goat
            </button>
          )}
          {bigRideSequence && (
            <button className="btn btn-secondary record-ride__test-btn" onClick={simulateBigRide}>
              Big Ride: Hammy's → TG → Gondola → Vertigo → TG → Gondola → Hammy's → TG
            </button>
          )}
        </div>
      )}
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
          <p className="record-ride__laps">
            {gondolaLaps} lap{gondolaLaps === 1 ? '' : 's'} this session
          </p>
          <ul className="record-ride__save-names">
            {computedSegments.length === 0 ? (
              <li>Matching trail…</li>
            ) : (
              computedSegments.map((segment) => (
                <li key={segment.name}>
                  {segment.name} <span>({segment.distance.toFixed(2)} km)</span>
                </li>
              ))
            )}
          </ul>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || computedSegments.length === 0}>
            {saving ? 'Saving…' : computedSegments.length > 1 ? 'Save Rides' : 'Save Ride'}
          </button>
        </div>
      )}
    </div>
  )
}

export default RecordRide
