import axios, { type AxiosError } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('accessToken');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // D004: skip the auto-redirect on 401 responses from the login endpoint
    // itself — otherwise invalid-credential attempts trigger a full page
    // reload to /admin/login and clear the inline error banner that
    // Login.tsx is trying to show. Login.tsx's own catch block handles
    // the message display.
    const requestUrl = error.config?.url ?? '';
    const isLoginAttempt = requestUrl.includes('/admin/auth/login');
    if (error.response?.status === 401 && !isLoginAttempt) {
      sessionStorage.removeItem('accessToken');
      // D003: must use the basename-aware path. The browser has basename
      // prefix `/admin`, but window.location does not — naive `/login`
      // would land at http://host:5173/login, outside the React Router's
      // route tree (matches App.tsx guard fix D002).
      window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  }
);
