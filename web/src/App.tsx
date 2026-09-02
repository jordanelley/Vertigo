import { useEffect, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import MountainBikeIllustration from './MountainBikeIllustration'
import Ride from './components/Ride'
import { Tabs, type Tab } from './components/Tabs'
import { Feed } from './components/Feed'
import { Challenges } from './components/Challenges'
import { Leaderboard } from './components/Leaderboard'
import { AuthPage } from './components/AuthPage'
import { API_URL } from './api'
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

  const authHeaders = (): HeadersInit =>
    user?.sub ? { 'X-Auth0-Id': user.sub } : {}

  useEffect(() => {
    if (!isAuthenticated || !user?.sub) return

    fetch(`${API_URL}/api/users/me`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ nickname: user.nickname ?? 'Rider' }),
    })
  }, [isAuthenticated, user?.sub])

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

              <Tabs activeTab={activeTab} onSelect={setActiveTab} />

              <div className="tab-panel">
                {activeTab === 'feed' && <Feed />}

                {activeTab === 'ride' && <Ride />}

                {activeTab === 'leaderboard' && <Leaderboard />}

                {activeTab === 'challenges' && <Challenges />}
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
        <AuthPage error={error} onLogin={() => login()} onSignup={signup} />
      )}
    </>
  )
}

export default App
