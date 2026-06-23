import type { User } from './types'

const KEYS = {
  access: 'pt_access_token',
  user: 'pt_user',
  legacyRefresh: 'pt_refresh_token',
} as const

export const tokenStore = {
  getAccess(): string | null {
    return sessionStorage.getItem(KEYS.access)
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
  setAccess(access: string): void {
    sessionStorage.setItem(KEYS.access, access)
    localStorage.removeItem(KEYS.legacyRefresh)
    localStorage.removeItem(KEYS.access)
  },
  setUser(user: User): void {
    localStorage.setItem(KEYS.user, JSON.stringify(user))
  },
  clear(): void {
    sessionStorage.removeItem(KEYS.access)
    localStorage.removeItem(KEYS.access)
    localStorage.removeItem(KEYS.legacyRefresh)
    localStorage.removeItem(KEYS.user)
  },
}
