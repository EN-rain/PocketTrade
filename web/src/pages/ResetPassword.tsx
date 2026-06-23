import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import type { AuthResponse } from '../lib/types'

export default function ResetPassword() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const { email, code } = (location.state || {}) as { email?: string; code?: string }

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email || !code) {
      setError('Invalid reset session. Please start over.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      const res = await api.post<AuthResponse>('/auth/reset-password', { email, code, password })
      const { accessToken, refreshToken, user } = res.data
      login(accessToken, refreshToken, user)
      navigate('/', { replace: true })
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  if (!email || !code) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background px-4">
        <p className="text-error">Invalid reset session. <Link to="/forgot-password" className="underline">Start over</Link></p>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm bg-surface rounded-2xl shadow-sm border border-card-border p-6 md:p-8">
        <h1 className="text-2xl font-semibold text-text-primary text-center mb-1">Reset password</h1>
        <p className="text-text-secondary text-center text-sm mb-6">
          Enter a new password for <span className="font-medium text-text-primary">{email}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">New password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-xl border border-input-border bg-surface px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Confirm new password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-input-border bg-surface px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-error text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary text-white font-medium py-3 text-sm hover:bg-primary-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Resetting…' : 'Reset password'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-text-secondary">
          <Link to="/login" className="text-primary hover:underline font-medium">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
