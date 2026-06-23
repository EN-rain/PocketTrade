import axios from 'axios'
import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import { tokenStore } from './tokenStore'
import { API_URL } from './config'

interface RetryableRequest extends InternalAxiosRequestConfig {
  _retry?: boolean
}

export const refreshApi = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

export const uploadApi = axios.create({
  baseURL: API_URL,
  timeout: 60000,
})

let refreshPromise: Promise<string | null> | null = null

function clearAuth(): void {
  tokenStore.clear()
  window.dispatchEvent(new Event('pt-auth-cleared'))
}

function getRefreshPromise(): Promise<string | null> {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    const refreshToken = tokenStore.getRefresh()
    if (!refreshToken) {
      clearAuth()
      return null
    }

    try {
      const response = await refreshApi.post<{ accessToken: string; refreshToken: string }>(
        '/auth/refresh',
        { refreshToken },
      )
      tokenStore.setTokens(response.data.accessToken, response.data.refreshToken)
      return response.data.accessToken
    } catch {
      clearAuth()
      return null
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

function attachAuth(instance: AxiosInstance): void {
  instance.interceptors.request.use((config) => {
    const token = tokenStore.getAccess()
    if (token) config.headers.set('Authorization', `Bearer ${token}`)
    return config
  })

  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as RetryableRequest | undefined

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
          return instance.request(originalRequest)
        }

        if (!window.location.pathname.startsWith('/login')) {
          window.location.assign('/login')
        }
      }

      return Promise.reject(error)
    },
  )
}

attachAuth(api)
attachAuth(uploadApi)
