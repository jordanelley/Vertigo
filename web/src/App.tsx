import { useEffect, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import MountainBikeIllustration from './MountainBikeIllustration'
import RecordRide from './RecordRide'
import './App.css'

interface Ride {
  id: number
  rideName: string
  distance: number
  time: number
}

interface LeaderboardEntry {
  userId: number
  name: string
  time: number
  isSelf: boolean
  isFollowing: boolean
}

interface TrackLeaderboard {
  trailName: string
  totalAttempts: number
  topUsers: LeaderboardEntry[]
}

type Tab = 'feed' | 'ride' | 'leaderboard' | 'challenges'
type LeaderboardScope = 'all' | 'following'

const feedItems = [
  { id: 1, rider: 'Sam', rideName: 'Ridge Trail', distance: 24.1 },
  { id: 2, rider: 'Alex', rideName: 'Sunday Loop', distance: 18.4 },
]

const feedLeaderboard = [
  { name: 'Jamie', time: 0.09 },
  { name: 'Alex', time: 0.12 },
  { name: 'Sam', time: 0.19 },
]

const challengeBadges = [
  { id: 1, description: 'Ride every blue track in skyline' },
  { id: 2, description: 'Ride every track in Skyline' },
  { id: 3, description: 'Do a lap with another use (Friend achievement)' },
  { id: 4, description: 'Pedal up Hammys (probably better at night)' },
  { id: 5, description: 'do a lap after 9pm' },
  { id: 6, description: 'Complete 15 laps in one day' },
]

function App() {
  const [rides, setRides] = useState<Ride[]>([])
  const [leaderboard, setLeaderboard] = useState<TrackLeaderboard[]>([])
  const [leaderboardScope, setLeaderboardScope] = useState<LeaderboardScope>('all')
  const [activeTab, setActiveTab] = useState<Tab>('feed')
  const {
    isLoading,
    isAuthenticated,
    error,
    loginWithRedirect: login,
    logout: auth0Logout,
    user,
  } = useAuth0()

  const signup = () =>
    login({ authorizationParams: { screen_hint: 'signup' } })

  const logout = () =>
    auth0Logout({ logoutParams: { returnTo: window.location.origin } })

  const authHeaders = (): HeadersInit =>
    user?.sub ? { 'X-Auth0-Id': user.sub } : {}

  const fetchLeaderboard = (scope: LeaderboardScope) => {
    fetch(`http://localhost:5090/api/leaderboard?scope=${scope}`, {
      headers: authHeaders(),
    })
      .then((res) => res.json())
      .then(setLeaderboard)
      .catch(() => setLeaderboard([]))
  }

  useEffect(() => {
    if (!isAuthenticated || !user?.sub) return

    fetch('http://localhost:5090/api/users/me', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ nickname: user.nickname ?? 'Rider' }),
    }).then(() => fetchLeaderboard(leaderboardScope))

    fetch('http://localhost:5090/api/rides')
      .then((res) => res.json())
      .then(setRides)
      .catch(() => setRides([]))
    // Only re-run when auth state changes; scope changes are handled by handleScopeChange.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.sub])

  const handleScopeChange = (scope: LeaderboardScope) => {
    setLeaderboardScope(scope)
    fetchLeaderboard(scope)
  }

  const handleToggleFollow = async (entry: LeaderboardEntry) => {
    await fetch(`http://localhost:5090/api/users/${entry.userId}/follow`, {
      method: entry.isFollowing ? 'DELETE' : 'POST',
      headers: authHeaders(),
    })
    fetchLeaderboard(leaderboardScope)
  }

  const handleSaveRide = async (rideName: string, distance: number, time: number) => {
    const res = await fetch('http://localhost:5090/api/rides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rideName, distance, time }),
    })
    const newRide = await res.json()
    setRides((prev) => [...prev, newRide])
  }

  const handleDeleteRide = async (id: number, rideName: string) => {
    if (!window.confirm(`Delete "${rideName}"? This can't be undone.`)) return
    await fetch(`http://localhost:5090/api/rides/${id}`, { method: 'DELETE' })
    setRides((prev) => prev.filter((ride) => ride.id !== id))
  }

  if (isLoading) return 'Loading...'

  return (
    <>
      {isAuthenticated ? (
        <div className="auth-page">
          <div className="auth-card auth-card--app">
            <div className="auth-card__banner">
              <MountainBikeIllustration />
            </div>
            <div className="auth-card__body">
              {user?.picture ? (
                <img src={user.picture} alt="" className="avatar" />
              ) : (
                <div className="avatar avatar--fallback">
                  {(user?.nickname ?? '?').charAt(0).toUpperCase()}
                </div>
              )}
              <h1>{user?.nickname ?? 'Welcome back'}</h1>

              <nav className="tabs">
                {(['feed', 'ride', 'leaderboard', 'challenges'] as Tab[]).map((tab) => (
                  <button
                    key={tab}
                    className={`tab${activeTab === tab ? ' tab--active' : ''}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </nav>

              <div className="tab-panel">
                {activeTab === 'feed' && (
                  <>
                    <div className="feed-highlights">
                      <div className="popup-challenge">
                        <h3 className="popup-challenge__title">Pop-up Challenge</h3>
                        <p className="popup-challenge__body">Complete Bubba</p>
                      </div>
                      <div className="feed-highlights__divider" />
                      <div className="feed-leaderboard">
                        <h3 className="feed-leaderboard__title">Leaderboard</h3>
                        <ol className="feed-leaderboard__list">
                          {feedLeaderboard.map((entry, index) => (
                            <li key={entry.name} className="feed-leaderboard__item">
                              <span>{index + 1}. {entry.name}</span>
                              <span className="feed-leaderboard__time">{entry.time} min</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>
                    <ul className="data-list">
                      {feedItems.map((item) => (
                        <li key={item.id} className="data-list__item">
                          <span className="data-list__primary">{item.rider}</span>
                          <span className="data-list__secondary">
                            {item.rideName} · {item.distance} km
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {activeTab === 'ride' && (
                  <>
                    <RecordRide
                      onSave={handleSaveRide}
                      existingRideNames={rides.map((ride) => ride.rideName)}
                    />
                    <ul className="data-list">
                      {rides.length === 0 && (
                        <li className="data-list__empty">No rides yet.</li>
                      )}
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
                            onClick={() => handleDeleteRide(ride.id, ride.rideName)}
                            aria-label={`Delete ${ride.rideName}`}
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {activeTab === 'leaderboard' && (
                  <div className="leaderboard">
                    <div className="leaderboard__scope">
                      {(['all', 'following'] as LeaderboardScope[]).map((scope) => (
                        <button
                          key={scope}
                          className={`leaderboard__scope-btn${leaderboardScope === scope ? ' leaderboard__scope-btn--active' : ''}`}
                          onClick={() => handleScopeChange(scope)}
                        >
                          {scope === 'all' ? 'Everyone' : 'Following'}
                        </button>
                      ))}
                    </div>

                    {leaderboard.length === 0 && (
                      <p className="data-list__empty">
                        {leaderboardScope === 'following'
                          ? "No rides from people you follow yet."
                          : 'No rides yet.'}
                      </p>
                    )}
                    {leaderboard.map((track) => (
                      <div key={track.trailName} className="leaderboard__track">
                        <h3 className="leaderboard__track-name">
                          {track.trailName}
                          <span className="leaderboard__attempts">
                            {track.totalAttempts} attempt{track.totalAttempts === 1 ? '' : 's'}
                          </span>
                        </h3>
                        <ol className="data-list">
                          {track.topUsers.map((entry, index) => (
                            <li key={entry.name} className="data-list__item">
                              <span className="data-list__primary">
                                {index + 1}. {entry.name}
                              </span>
                              <span className="data-list__secondary leaderboard__entry-right">
                                {entry.time} min
                                {!entry.isSelf && (
                                  <button
                                    className={`leaderboard__follow-btn${entry.isFollowing ? ' leaderboard__follow-btn--active' : ''}`}
                                    onClick={() => handleToggleFollow(entry)}
                                  >
                                    {entry.isFollowing ? 'Following' : 'Follow'}
                                  </button>
                                )}
                              </span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'challenges' && (
                  <div className="badges-grid">
                    {challengeBadges.map((badge) => (
                      <div key={badge.id} className="badge" data-tooltip={badge.description}>
                        <span className="badge__icon" aria-hidden="true">🔒</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="auth-card__actions">
                <button className="btn btn-secondary" onClick={logout}>
                  Log Out
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="auth-page">
          <div className="auth-card">
            <div className="auth-card__banner">
              <MountainBikeIllustration />
            </div>
            <div className="auth-card__body">
              <h1>Vertigo</h1>
              <p className="subtitle">Track your rides. Chase the descent.</p>
              {error && <p className="error">Error: {error.message}</p>}
              <div className="auth-card__actions">
                <button className="btn btn-primary" onClick={() => login()}>
                  Log In
                </button>
                <button className="btn btn-secondary" onClick={signup}>
                  Sign Up
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default App
