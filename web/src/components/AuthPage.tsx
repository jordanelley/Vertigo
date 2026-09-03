import MountainBikeIllustration from '../MountainBikeIllustration'

interface AuthPageProps {
  error?: Error
  onLogin: () => void
  onSignup: () => void
}

// The signed-out landing screen: branding plus the log in / sign up actions.
export function AuthPage({ error, onLogin, onSignup }: AuthPageProps) {
  return (
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
            <button className="btn btn-primary" onClick={onLogin}>
              Log In
            </button>
            <button className="btn btn-secondary" onClick={onSignup}>
              Sign Up
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
