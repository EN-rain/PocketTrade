import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { User } from '../lib/types'
import { tokenStore } from '../lib/tokenStore'
import { api } from '../lib/api'

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (accessToken: string, refreshToken: string, user: User) => void
  logout: () => Promise<void>
  setUser: (user: User) => void
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const restoreSession = () => {
      const accessToken = tokenStore.getAccess()
      const refreshToken = tokenStore.getRefresh()
      const storedUser = tokenStore.getUser()

      if (accessToken && refreshToken && storedUser) {
        setUserState(storedUser)
      } else {
        tokenStore.clear()
        setUserState(null)
      }
      setIsLoading(false)
    }

    const handleAuthCleared = () => {
      tokenStore.clear()
      setUserState(null)
      setIsLoading(false)
    }

    restoreSession()
    window.addEventListener('pt-auth-cleared', handleAuthCleared)
    window.addEventListener('storage', restoreSession)

    return () => {
      window.removeEventListener('pt-auth-cleared', handleAuthCleared)
      window.removeEventListener('storage', restoreSession)
    }
  }, [])

  const login = useCallback((accessToken: string, refreshToken: string, user: User) => {
    tokenStore.setTokens(accessToken, refreshToken)
    tokenStore.setUser(user)
    setUserState(user)
  }, [])

  const logout = useCallback(async () => {
    const refreshToken = tokenStore.getRefresh()
    if (refreshToken) {
      try {
        await api.post('/auth/logout', { refreshToken })
      } catch {
        // Local logout must still complete when the server is unavailable.
      }
    }
    tokenStore.clear()
    setUserState(null)
  }, [])

  const setUser = useCallback((user: User) => {
    tokenStore.setUser(user)
    setUserState(user)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: Boolean(user && tokenStore.getAccess() && tokenStore.getRefresh()),
        login,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
