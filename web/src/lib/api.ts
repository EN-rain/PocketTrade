import axios, { AxiosError } from 'axios'
import { tokenStore } from './tokenStore'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// Separate axios instance for refresh requests to avoid interceptor loops
export const refreshApi = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

// Main API instance with interceptors
export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

// Deduplicate concurrent refresh attempts with a single promise
let refreshPromise: Promise<string | null> | null = null

function getRefreshPromise(): Promise<string | null> {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    const refreshToken = tokenStore.getRefresh()
    if (!refreshToken) {
      tokenStore.clear()
      return null
    }
    try {
      const res = await refreshApi.post<{ accessToken: string; refreshToken: string }>(
        '/auth/refresh',
        { refreshToken }
      )
      const { accessToken, refreshToken: newRefresh } = res.data
      tokenStore.setTokens(accessToken, newRefresh)
      return accessToken
    } catch {
      tokenStore.clear()
      return null
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

// Request interceptor: inject Bearer access token
api.interceptors.request.use((config) => {
  const token = tokenStore.getAccess()
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

// Response interceptor: auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any & { _retry?: boolean }

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      originalRequest._retry = true
      const newToken = await getRefreshPromise()
      if (newToken) {
        originalRequest.headers.set('Authorization', `Bearer ${newToken}`)
        return api.request(originalRequest)
      }
      // Refresh failed — clear tokens and redirect to login
      tokenStore.clear()
      // Only redirect if we're not already on the login page
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

// Upload API instance for multipart requests (images)
export const uploadApi = axios.create({
  baseURL: API_URL,
  timeout: 60000,
})

uploadApi.interceptors.request.use((config) => {
  const token = tokenStore.getAccess()
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})
