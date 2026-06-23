import type { User } from './types'

const KEYS = {
  access: 'pt_access_token',
  refresh: 'pt_refresh_token',
  user: 'pt_user',
} as const

export const tokenStore = {
  getAccess(): string | null {
    return localStorage.getItem(KEYS.access)
  },
  getRefresh(): string | null {
    return localStorage.getItem(KEYS.refresh)
  },
  getUser(): User | null {
    const raw = localStorage.getItem(KEYS.user)
    if (!raw) return null
    try {
      return JSON.parse(raw) as User
    } catch {
      return null
    }
  },
  setTokens(access: string, refresh: string): void {
    localStorage.setItem(KEYS.access, access)
    localStorage.setItem(KEYS.refresh, refresh)
  },
  setUser(user: User): void {
    localStorage.setItem(KEYS.user, JSON.stringify(user))
  },
  clear(): void {
    localStorage.removeItem(KEYS.access)
    localStorage.removeItem(KEYS.refresh)
    localStorage.removeItem(KEYS.user)
  },
}
