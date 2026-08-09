import { useEffect, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import MountainBikeIllustration from './MountainBikeIllustration'
import './App.css'

interface Ride {
  id: number
  rideName: string
  distance: number
}

function App() {
  const [rides, setRides] = useState<Ride[]>([])
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

  if (isLoading) return 'Loading...'

  return (
    <>
      {isAuthenticated ? (
        <div className="auth-page">
          <div className="auth-card">
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
              <ul className="ride-list">
                {rides.map((ride) => (
                  <li key={ride.id} className="ride-list__item">
                    <span className="ride-list__name">{ride.rideName}</span>
                    <span className="ride-list__distance">{ride.distance} km</span>
                  </li>
                ))}
              </ul>
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
