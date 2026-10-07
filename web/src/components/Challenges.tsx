import { useEffect, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { API_URL, authHeaders } from '../api'
import { TRAILS, baseTrailName } from '../trails'
import type { Ride } from '../types'

const BLUE_LEVELS = [3, 4]
const blueTrailNames = TRAILS.filter((trail) => BLUE_LEVELS.includes(trail.level)).map((trail) => trail.name)
const allTrailNames = TRAILS.map((trail) => trail.name)

function percentRidden(trailNames: string[], riddenTrails: Set<string>): number {
  const completed = trailNames.filter((name) => riddenTrails.has(name)).length
  return Math.round((completed / trailNames.length) * 100)
}

const challengeBadges = [
  { id: 1, name: 'Blue Runner', description: 'Ride every blue track in skyline' },
  { id: 2, name: 'Trail Master', description: 'Ride every track in Skyline' },
  { id: 3, name: 'I Have A Friend', description: 'Do a lap with another user', progress: 0 },
  { id: 4, name: 'Night Climber', description: 'Pedal up Hammys (probably better at night)', progress: 60 },
  { id: 5, name: 'Night Owl', description: 'do a lap after 9pm', progress: 0 },
  { id: 6, name: 'Lap Legend', description: 'Complete 15 laps in one day', progress: 80 },
  { id: 7, name: 'Weekly Warrior', description: 'Ride every day of the week', progress: 30 },
  { id: 8, name: 'Festive', description: 'Complete a lap on Christmas Day and new years in the same season', progress: 0 },
  { id: 9, name: 'Winter Send', description: 'Complete a lap in July', progress: 0 },
  { id: 10, name: 'STOKE', description: 'Ride Squid Run → Thingymajig → One82 → K Fry → El Gato in 3 consecutive laps', progress: 0 },
  { id: 11, name: 'SHRED', description: 'Ride Slippery Ninja → Hobbit → Rat Attack → El Gato → Diesel in 3 consecutive laps', progress: 0 },
  { id: 12, name: 'GRAVEL', description: 'Ride Give It Barry → Rock Garden → Armageddon → Vertigo → El Gato → Lazy Vertigo in 6 consecutive laps', progress: 0 },
  { id: 13, name: 'Hammy Hustle', description: "Get down Hammy's Track in under 6 minutes", progress: 0 },
  { id: 14, name: 'LIT', description: "Ride Lazy Vertigo → I'm A Shreddin → TigerGoose all in one lap (pedaling required)", progress: 0 },
  { id: 15, name: 'Pop-Up Pro', description: 'Win a pop up challenge', progress: 0 },
  { id: 16, name: 'Not So Original', description: 'Complete a session without riding Original', progress: 0 },
  { id: 17, name: 'Yo-Yo', description: 'Ride Huck Yeah → Original, 8 times in a row', progress: 0 },
  { id: 18, name: 'Nice', description: 'Take a lunch break', progress: 0 },
  { id: 19, name: 'Flatty', description: 'go down the bottom half of the Access Road', progress: 0 },
  { id: 20, name: 'Spice Sandwich', description: 'Ride World Cup → Hobbit → Killer Bee', progress: 0 },
  { id: 21, name: 'Seeing Red', description: 'Ride every grade 6 (red) track', progress: 0 },
  { id: 22, name: 'Century Club', description: 'Complete 100 laps', progress: 0 },
  { id: 23, name: 'Double Century', description: 'Complete 200 laps', progress: 0 },
  { id: 24, name: 'Triple Century', description: 'Complete 300 laps', progress: 0 },
  { id: 25, name: 'Last Lap', description: 'Start a lap at 7:15', progress: 0 },
  { id: 26, name: 'Dizzy Fifty', description: 'Ride Vertigo 50 times', progress: 0 },
  { id: 27, name: 'Lazy Hundred', description: 'Ride Lazy Vertigo 100 times', progress: 0 },
]

export function Challenges() {
  const { isAuthenticated, user } = useAuth0()
  const [blueRunnerProgress, setBlueRunnerProgress] = useState(0)
  const [trailMasterProgress, setTrailMasterProgress] = useState(0)

  useEffect(() => {
    if (!isAuthenticated) {
      setBlueRunnerProgress(0)
      setTrailMasterProgress(0)
      return
    }
    fetch(`${API_URL}/api/rides?mine=true`, { headers: authHeaders(user) })
      .then((res) => res.json())
      .then((rides: Ride[]) => {
        const riddenTrails = new Set(rides.map((ride) => baseTrailName(ride.rideName)))
        setBlueRunnerProgress(percentRidden(blueTrailNames, riddenTrails))
        setTrailMasterProgress(percentRidden(allTrailNames, riddenTrails))
      })
      .catch(() => {
        setBlueRunnerProgress(0)
        setTrailMasterProgress(0)
      })
  }, [isAuthenticated, user])

  return (
    <ul className="data-list">
      {challengeBadges.map((badge) => {
        const progress =
          badge.id === 1 ? blueRunnerProgress : badge.id === 2 ? trailMasterProgress : badge.progress
        return (
          <li key={badge.id} className="data-list__item badge-row">
            <div className="badge-row__top">
              <span className="badge-row__icon" aria-hidden="true">🔒</span>
              <span className="badge-row__text">
                <span className="data-list__primary">{badge.name}</span>
                <span className="data-list__secondary">{badge.description}</span>
              </span>
              <span className="badge-row__percent">{progress}%</span>
            </div>
            <div className="badge-row__progress">
              <div className="badge-row__progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
