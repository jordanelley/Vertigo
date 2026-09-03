const feedItems = [
  { id: 1, rider: 'Sam', laps: 5, highlight: 'New PR on Original' },
  { id: 2, rider: 'Alex', laps: 3 },
  { id: 3, rider: 'Sarah', message: 'just beat your time on Grundy', time: '5:12' },
]

const feedLeaderboard = [
  { name: 'Jamie', time: 0.09 },
  { name: 'Alex', time: 0.12 },
  { name: 'Sam', time: 0.19 },
]

export function Feed() {
  return (
    <>
      <div className="feed-header">
        <button className="btn btn-secondary feed-header__add-friends">
          + Add Friends
        </button>
      </div>
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
            {item.message ? (
              <>
                <span className="data-list__primary">
                  {item.rider} {item.message}
                </span>
                {item.time && (
                  <span className="data-list__secondary">{item.time}</span>
                )}
              </>
            ) : (
              <>
                <span className="data-list__primary">{item.rider}</span>
                <span className="data-list__meta">
                  <span className="data-list__secondary">
                    {item.laps} {item.laps === 1 ? 'lap' : 'laps'}
                  </span>
                  {item.highlight && (
                    <span className="data-list__highlight">{item.highlight}</span>
                  )}
                </span>
              </>
            )}
          </li>
        ))}
      </ul>
    </>
  )
}
