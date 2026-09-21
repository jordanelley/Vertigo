import { useEffect, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { API_URL, authHeaders } from '../api'
import type { LeaderboardEntry, TrackLeaderboard, LeaderboardScope } from '../types'

const SCOPES: LeaderboardScope[] = ['all', 'following']

export function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<TrackLeaderboard[]>([])
  const [scope, setScope] = useState<LeaderboardScope>('all')
  const { user } = useAuth0()

  const fetchLeaderboard = (next: LeaderboardScope) => {
    fetch(`${API_URL}/api/leaderboard?scope=${next}`, {
      headers: authHeaders(user),
    })
      .then((res) => res.json())
      .then(setLeaderboard)
      .catch(() => setLeaderboard([]))
  }

  useEffect(() => {
    fetchLeaderboard(scope)
    // Only fetch on mount; scope changes are handled by handleScopeChange.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleScopeChange = (next: LeaderboardScope) => {
    setScope(next)
    fetchLeaderboard(next)
  }

  const handleToggleFollow = async (entry: LeaderboardEntry) => {
    await fetch(`${API_URL}/api/users/${entry.userId}/follow`, {
      method: entry.isFollowing ? 'DELETE' : 'POST',
      headers: authHeaders(user),
    })
    fetchLeaderboard(scope)
  }

  return (
    <div className="leaderboard">
      <div className="leaderboard__scope">
        {SCOPES.map((s) => (
          <button
            key={s}
            className={`leaderboard__scope-btn${scope === s ? ' leaderboard__scope-btn--active' : ''}`}
            onClick={() => handleScopeChange(s)}
          >
            {s === 'all' ? 'Everyone' : 'Following'}
          </button>
        ))}
      </div>

      {leaderboard.length === 0 && (
        <p className="data-list__empty">
          {scope === 'following' ? 'No rides from people you follow yet.' : 'No rides yet.'}
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
  )
}
