import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
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
} from '../trails'
import { LIFTS, excludeLiftPoints, countLiftLaps } from '../lifts'
import { DEFAULT_CENTER } from '../mapGeometry'
import { API_URL, authHeaders, syncUser } from '../api'
import type { Ride } from '../types'
import { RecordRideMap } from './RecordRideMap'
import { RideSimulationControls } from './RideSimulationControls'

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

// How close the last recorded point needs to be to the trail's real endpoint to count as
// finished, rather than abandoned partway through when the rider stopped recording early.
const TRAIL_COMPLETION_RADIUS_KM = 0.1

function reachedTrailEnd(segmentPoints: LatLng[], trailPoints: LatLng[]): boolean {
  if (segmentPoints.length === 0 || trailPoints.length === 0) return false
  const lastRecorded = segmentPoints[segmentPoints.length - 1]
  const trailEnd = trailPoints[trailPoints.length - 1]
  return haversineDistanceKm(lastRecorded, trailEnd) <= TRAIL_COMPLETION_RADIUS_KM
}

function Ride() {
  const { isAuthenticated, user, loginWithPopup } = useAuth0()
  const [rides, setRides] = useState<Ride[]>([])
  const [recording, setRecording] = useState(false)
  const [path, setPath] = useState<LatLng[]>([])
  const [position, setPosition] = useState<LatLng>(DEFAULT_CENTER)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [pendingSave, setPendingSave] = useState(false)
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('checking')
  const [elapsedMinutes, setElapsedMinutes] = useState(0)
  const [trailPaths, setTrailPaths] = useState<Record<string, LatLng[]>>({})
  const [liftPaths, setLiftPaths] = useState<Record<string, LatLng[]>>({})
  const [showTrailPicker, setShowTrailPicker] = useState(false)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null)
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
    if (!isAuthenticated) {
      setRides([])
      return
    }
    fetch(`${API_URL}/api/rides?mine=true`, { headers: authHeaders(user) })
      .then((res) => res.json())
      .then(setRides)
      .catch(() => setRides([]))
  }, [isAuthenticated, user])

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

  const existingRideNames = rides.map((ride) => ride.rideName)

  const { computedSegments, hasIncompleteSegments } = useMemo(() => {
    if (recording || path.length < 2) return { computedSegments: [], hasIncompleteSegments: false }
    const runs = excludeLiftPoints(path, liftPaths)
    const allSegments = runs.flatMap((run) => segmentPathByTrail(run, trailPaths))
    const completedRawSegments = allSegments.filter((segment) =>
      reachedTrailEnd(segment.points, trailPaths[segment.trailName] ?? []),
    )
    const namesSoFar: string[] = []
    const named = completedRawSegments.map((segment) => {
      const segDistance = totalDistanceKm(segment.points)
      const name = nextAttemptRideName(segment.trailName, [...existingRideNames, ...namesSoFar])
      namesSoFar.push(name)
      return { name, distance: segDistance }
    })
    return { computedSegments: named, hasIncompleteSegments: completedRawSegments.length < allSegments.length }
  }, [recording, path, trailPaths, liftPaths, existingRideNames])

  const saveRide = async (rideName: string, distance: number, time: number) => {
    const res = await fetch(`${API_URL}/api/rides`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(user) },
      body: JSON.stringify({ rideName, distance, time }),
    })
    const newRide = await res.json()
    setRides((prev) => [...prev, newRide])
  }

  const deleteRide = async (id: number, rideName: string) => {
    if (!window.confirm(`Delete "${rideName}"? This can't be undone.`)) return
    await fetch(`${API_URL}/api/rides/${id}`, { method: 'DELETE' })
    setRides((prev) => prev.filter((ride) => ride.id !== id))
  }

  const performSave = async () => {
    const totalSegmentDistance = computedSegments.reduce((sum, s) => sum + s.distance, 0)
    setSaving(true)
    setSaveError(null)
    try {
      for (const segment of computedSegments) {
        const segTime =
          totalSegmentDistance > 0 ? (elapsedMinutes * segment.distance) / totalSegmentDistance : 0
        await saveRide(segment.name, Math.round(segment.distance * 100) / 100, Math.round(segTime * 10) / 10)
      }
      setPath([])
      setPhotoPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
    } catch (err) {
      console.error('Failed to save ride:', err)
      setSaveError('Failed to save ride. Try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    if (computedSegments.length === 0) return
    setSaveError(null)
    if (!isAuthenticated) {
      setPendingSave(true)
      try {
        await loginWithPopup()
      } catch (err) {
        console.error('Login popup failed or was cancelled:', err)
        setSaveError('Log in to save this ride.')
        setPendingSave(false)
      }
      return
    }
    await performSave()
  }

  useEffect(() => {
    if (!pendingSave || !isAuthenticated || !user?.sub) return
    setPendingSave(false)
    syncUser(user).then(performSave)
    // performSave/computedSegments intentionally omitted: this effect should only react to the
    // pending-save + auth-state transition, not re-fire on every recompute of the derived segments.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSave, isAuthenticated, user?.sub])

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
  }

  const handleRemovePhoto = () => {
    setPhotoPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
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

  const savedRidesList = (
    <ul className="data-list">
      {rides.length === 0 && <li className="data-list__empty">No rides yet.</li>}
      {rides.map((ride) => (
        <li key={ride.id} className="data-list__item">
          <div className="data-list__info">
            <span className="data-list__primary">{ride.rideName}</span>
            <span className="data-list__secondary">
              {ride.distance} km · {ride.time} min
            </span>
          </div>
          <button
            className="data-list__delete"
            onClick={() => deleteRide(ride.id, ride.rideName)}
            aria-label={`Delete ${ride.rideName}`}
          >
            ×
          </button>
        </li>
      ))}
    </ul>
  )

  if (locationStatus === 'checking') {
    return (
      <>
        <div className="record-ride">
          <p className="record-ride__status">Checking your location…</p>
          {testButton}
        </div>
        {savedRidesList}
      </>
    )
  }

  if (locationStatus === 'not-at-skyline') {
    return (
      <>
        <div className="record-ride">
          <p className="record-ride__status">Please go to Skyline Queenstown to record your ride.</p>
          {testButton}
        </div>
        {savedRidesList}
      </>
    )
  }

  return (
    <>
      <div className="record-ride">
        {testButton}
        <RideSimulationControls
          recording={recording}
          open={showTrailPicker}
          onToggle={() => setShowTrailPicker((prev) => !prev)}
          onSimulateCombined={
            vertigoAndThunderGoat.length === 2 ? () => simulateCombinedRide(vertigoAndThunderGoat) : null
          }
          onSimulateBigRide={bigRideSequence ? simulateBigRide : null}
        />
        <RecordRideMap
          position={position}
          path={path}
          trailPaths={trailPaths}
          liftPaths={liftPaths}
          trailBounds={trailBounds}
        />

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
                <li>{hasIncompleteSegments ? "Stopped before finishing - not saved" : 'Matching trail…'}</li>
              ) : (
                computedSegments.map((segment) => (
                  <li key={segment.name}>
                    {segment.name} <span>({segment.distance.toFixed(2)} km)</span>
                  </li>
                ))
              )}
            </ul>
            <div className="record-ride__photo">
              {photoPreviewUrl ? (
                <div className="record-ride__photo-preview">
                  <img src={photoPreviewUrl} alt="Ride" className="record-ride__photo-thumb" />
                  <button
                    type="button"
                    className="btn btn-secondary record-ride__photo-remove"
                    onClick={handleRemovePhoto}
                  >
                    Remove Photo
                  </button>
                </div>
              ) : (
                <label className="btn btn-secondary record-ride__photo-add">
                  Add Photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    style={{ display: 'none' }}
                  />
                </label>
              )}
            </div>
            {saveError && <p className="error">{saveError}</p>}
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving || pendingSave || computedSegments.length === 0}
            >
              {!isAuthenticated
                ? 'Log In to Save'
                : saving
                  ? 'Saving…'
                  : computedSegments.length > 1
                    ? 'Save Rides'
                    : 'Save Ride'}
            </button>
          </div>
        )}
      </div>
      {savedRidesList}
    </>
  )
}

export default Ride
