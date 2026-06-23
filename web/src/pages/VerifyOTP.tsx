import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import type { AuthResponse, OtpResponse } from '../lib/types'

export default function VerifyOTP() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const { email, mode } = (location.state || {}) as { email?: string; mode?: string }

  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (!email) {
      navigate('/register')
    }
  }, [email, navigate])

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const next = [...code]
    next[index] = value.slice(-1)
    setCode(next)
    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const fullCode = code.join('')
    if (fullCode.length !== 6) {
      setError('Please enter all 6 digits')
      return
    }
    setError('')
    setLoading(true)
    try {
      if (mode === 'reset') {
        navigate('/reset-password', { state: { email, code: fullCode } })
        return
      }
      const res = await api.post<AuthResponse>('/auth/verify-otp', { email, code: fullCode })
      const { accessToken, refreshToken, user } = res.data
      login(accessToken, refreshToken, user)
      navigate('/', { replace: true })
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid verification code')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!email) return
    setResendLoading(true)
    try {
      await api.post<OtpResponse>('/auth/request-otp', { email })
      setError('')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend code')
    } finally {
      setResendLoading(false)
    }
  }

  if (!email) return null

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm bg-surface rounded-2xl shadow-sm border border-card-border p-6 md:p-8">
        <h1 className="text-2xl font-semibold text-text-primary text-center mb-1">Verify your email</h1>
        <p className="text-text-secondary text-center text-sm mb-6">
          Enter the 6-digit code sent to <span className="font-medium text-text-primary">{email}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex justify-center gap-2">
            {code.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputsRef.current[i] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-12 h-14 text-center text-xl font-semibold rounded-xl border border-input-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            ))}
          </div>

          {error && (
            <p className="text-error text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary text-white font-medium py-3 text-sm hover:bg-primary-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Verifying…' : 'Verify'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-text-secondary">
          Didn&apos;t receive a code?{' '}
          <button
            type="button"
            onClick={handleResend}
            disabled={resendLoading}
            className="text-primary hover:underline font-medium disabled:opacity-60"
          >
            {resendLoading ? 'Sending…' : 'Resend'}
          </button>
        </p>

        <p className="mt-2 text-center text-sm text-text-secondary">
          <Link to="/login" className="text-primary hover:underline font-medium">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
