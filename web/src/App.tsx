import { useAuth0 } from '@auth0/auth0-react'
import MountainBikeIllustration from './MountainBikeIllustration'
import './App.css'

function App() {
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
