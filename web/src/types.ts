export interface Ride {
  id: number
  rideName: string
  distance: number
  time: number
}

export interface LeaderboardEntry {
  userId: number
  name: string
  time: number
  isSelf: boolean
  isFollowing: boolean
}

export interface TrackLeaderboard {
  trailName: string
  totalAttempts: number
  topUsers: LeaderboardEntry[]
}

export type LeaderboardScope = 'all' | 'following'
