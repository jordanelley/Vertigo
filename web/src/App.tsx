import { useEffect, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import MountainBikeIllustration from './MountainBikeIllustration'
import Ride from './components/Ride'
import { Tabs, type Tab } from './components/Tabs'
import { Feed } from './components/Feed'
import { Challenges } from './components/Challenges'
import { Leaderboard } from './components/Leaderboard'
import { syncUser } from './api'
import './App.css'

function App() {
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
    if (!isAuthenticated || !user?.sub) return
    syncUser(user)
  }, [isAuthenticated, user?.sub])

  if (isLoading) return 'Loading...'

  return (
    <div className="auth-page">
      <div className="auth-card auth-card--app">
        <div className="auth-card__banner">
          <MountainBikeIllustration />
        </div>
        <div className="auth-card__body">
          {isAuthenticated ? (
            <>
              {user?.picture ? (
                <img src={user.picture} alt="" className="avatar" />
              ) : (
                <div className="avatar avatar--fallback">
                  {(user?.nickname ?? '?').charAt(0).toUpperCase()}
                </div>
              )}
              <h1>{user?.nickname ?? 'Welcome back'}</h1>
            </>
          ) : (
            <>
              <h1>Vertigo</h1>
              <p className="subtitle">Track your rides. Chase the descent.</p>
            </>
          )}
          {error && <p className="error">Error: {error.message}</p>}

          <Tabs activeTab={activeTab} onSelect={setActiveTab} />

          <div className="tab-panel">
            {activeTab === 'feed' && <Feed />}

            {activeTab === 'ride' && <Ride />}

            {activeTab === 'leaderboard' && <Leaderboard />}

            {activeTab === 'challenges' && <Challenges />}
          </div>

          <div className="auth-card__actions">
            {isAuthenticated ? (
              <button className="btn btn-secondary" onClick={logout}>
                Log Out
              </button>
            ) : (
              <>
                <button className="btn btn-primary" onClick={() => login()}>
                  Log In
                </button>
                <button className="btn btn-secondary" onClick={signup}>
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
