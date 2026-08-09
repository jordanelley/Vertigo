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

type Tab = 'feed' | 'ride' | 'leaderboard'

const feedItems = [
  { id: 1, rider: 'Sam', rideName: 'Ridge Trail', distance: 24.1 },
  { id: 2, rider: 'Alex', rideName: 'Sunday Loop', distance: 18.4 },
]

const leaderboard = [
  { name: 'Alex', distance: 142 },
  { name: 'Sam', distance: 118 },
  { name: 'You', distance: 84 },
]

function App() {
  const [rides, setRides] = useState<Ride[]>([])
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

  useEffect(() => {
    if (!isAuthenticated) return

    fetch('http://localhost:5090/api/rides')
      .then((res) => res.json())
      .then(setRides)
      .catch(() => setRides([]))
  }, [isAuthenticated])

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
                {(['feed', 'ride', 'leaderboard'] as Tab[]).map((tab) => (
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
                  <ol className="data-list">
                    {leaderboard.map((entry, index) => (
                      <li key={entry.name} className="data-list__item">
                        <span className="data-list__primary">
                          {index + 1}. {entry.name}
                        </span>
                        <span className="data-list__secondary">{entry.distance} km</span>
                      </li>
                    ))}
                  </ol>
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
