import { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import HomeIcon from './icons/HomeIcon'
import SearchIcon from './icons/SearchIcon'
import PlusIcon from './icons/PlusIcon'
import MessageIcon from './icons/MessageIcon'
import UserIcon from './icons/UserIcon'

const tabs = [
  { path: '/', label: 'Home', icon: HomeIcon },
  { path: '/search', label: 'Search', icon: SearchIcon },
  { path: '/sell', label: 'Sell', icon: PlusIcon },
  { path: '/messages', label: 'Messages', icon: MessageIcon },
  { path: '/profile', label: 'Profile', icon: UserIcon },
]

export default function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleSellClick = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault()
      navigate('/login')
    }
  }

  return (
    <div className="min-h-dvh text-foreground flex flex-col">
      {/* Desktop header */}
      <header className="hidden md:flex items-center justify-between px-6 py-3 bg-surface border-b border-card-border sticky top-0 z-30 transition-all duration-200 ease-out">
        <Link to="/" className="text-xl font-bold text-primary tracking-tight">PocketTrade</Link>
        <nav className="flex items-center gap-6">
          {tabs.map((t) => (
            <Link
              key={t.path}
              to={t.path}
              onClick={t.path === '/sell' ? handleSellClick : undefined}
              className={`text-sm font-medium hover:bg-nav-indicator rounded-lg px-3 py-1.5 transition-all duration-200 active:scale-95 ${
                (t.path === '/' ? pathname === '/' : pathname.startsWith(t.path))
                  ? 'text-primary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {t.label}
            </Link>
          ))}
          {user ? (
            <button
              onClick={() => { logout(); navigate('/login') }}
              className="text-sm text-text-secondary hover:text-error transition-colors"
            >
              Logout
            </button>
          ) : (
            <Link to="/login" className="text-sm font-medium text-primary">Sign in</Link>
          )}
        </nav>
      </header>

      {/* Main content */}
      <main className="flex-1 pb-20 md:pb-0 animate-fade-in">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-card-border z-30 safe-area-pb">
        <div className="flex items-center justify-around py-2">
          {tabs.map((t) => {
            const isActive = t.path === '/' ? pathname === '/' : pathname.startsWith(t.path)
            return (
              <Link
                key={t.path}
                to={t.path}
                onClick={t.path === '/sell' ? handleSellClick : undefined}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl active:scale-90 transition-transform duration-150 ${
                  isActive ? 'text-primary' : 'text-text-muted'
                }`}
              >
                <t.icon className="w-6 h-6" />
                <span className="text-[10px] font-medium">{t.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
