import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { useAdminShortcut } from './hooks/useAdminShortcut'
import Login from './pages/Login'
import Register from './pages/Register'
import VerifyOTP from './pages/VerifyOTP'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Home from './pages/Home'
import Search from './pages/Search'
import CreateListing from './pages/CreateListing'
import ListingDetails from './pages/ListingDetails'
import Favorites from './pages/Favorites'
import Messages from './pages/Messages'
import Chat from './pages/Chat'
import Profile from './pages/Profile'
import NotFound from './pages/NotFound'

function AdminShortcutListener() {
  useAdminShortcut()
  return null
}

const ADMIN_ENTRY_TOKEN_KEY = 'pockettrade-admin-entry-token'

function App() {
  useEffect(() => {
    const handleAdminShortcut = (event: KeyboardEvent) => {
      if (
        event.ctrlKey &&
        event.altKey &&
        event.shiftKey &&
        event.key.toLowerCase() === 'z'
      ) {
        event.preventDefault()

        const token = crypto.randomUUID()
        sessionStorage.setItem(ADMIN_ENTRY_TOKEN_KEY, token)

        const destination = new URL('/admin', window.location.origin)
        destination.searchParams.set('entry', token)
        window.location.assign(destination.toString())
      }
    }

    window.addEventListener('keydown', handleAdminShortcut)
    return () => window.removeEventListener('keydown', handleAdminShortcut)
  }, [])

  return (
    <AuthProvider>
      <AdminShortcutListener />
      <div className="min-h-dvh text-foreground animate-fade-in">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-otp" element={<VerifyOTP />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
          <Route path="/sell" element={<ProtectedRoute><CreateListing /></ProtectedRoute>} />
          <Route path="/listing/:id" element={<ListingDetails />} />
          <Route path="/favorites" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          <Route path="/chat/:id" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </AuthProvider>
  )
}

export default App