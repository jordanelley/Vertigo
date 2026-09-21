import type { User } from '@auth0/auth0-react'

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5090'

export const authHeaders = (user: User | undefined): HeadersInit =>
  user?.sub ? { 'X-Auth0-Id': user.sub } : {}

export async function syncUser(user: User): Promise<void> {
  await fetch(`${API_URL}/api/users/me`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(user) },
    body: JSON.stringify({ nickname: user.nickname ?? 'Rider' }),
  })
}
