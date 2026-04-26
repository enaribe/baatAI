import { type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, FolderPlus, LogOut, User, Users, Sun, Moon,
} from 'lucide-react'
import { useAuth } from '../../hooks/use-auth'
import { useDarkMode } from '../../hooks/use-dark-mode'
import { Logo } from '../ui/logo'
import { FeedbackButton } from '../feedback-button'

interface AppLayoutProps {
  children: ReactNode
}

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/project/new', icon: FolderPlus, label: 'Nouveau projet' },
  { to: '/speakers', icon: Users, label: 'Locuteurs' },
]

export function AppLayout({ children }: AppLayoutProps) {
  const { signOut, user } = useAuth()
  const { isDark, toggle } = useDarkMode()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const fullName = (user?.user_metadata?.full_name as string | undefined) || user?.email?.split('@')[0] || ''
  const initials = fullName
    .split(' ')
    .slice(0, 2)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() || '?'

  return (
    <div
      className="min-h-screen"
      style={{ background: 'var(--t-bg)', color: 'var(--t-fg)' }}
    >
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-[240px] lg:flex-col"
        style={{
          background: 'var(--t-bg-panel)',
          borderRight: '1px solid var(--t-border-subtle)',
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-2 px-5 py-5"
          style={{ borderBottom: '1px solid var(--t-border-subtle)' }}
        >
          <Logo size={22} />
          <span
            className="ml-auto inline-flex items-center px-2 h-[18px] rounded-full text-[10px]"
            style={{
              fontFamily: 'var(--font-body)',
              fontFeatureSettings: "'cv01','ss03'",
              fontWeight: 510,
              color: 'var(--t-fg-2)',
              border: '1px solid var(--t-border-strong)',
            }}
          >
            Beta
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          <p
            className="px-2.5 mb-2 text-[10px] uppercase tracking-[0.08em]"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--t-fg-4)' }}
          >
            Navigation
          </p>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                [
                  'flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-colors duration-150',
                  isActive ? 'nav-item-active' : 'nav-item',
                ].join(' ')
              }
              style={{ fontFeatureSettings: "'cv01','ss03'", fontWeight: 510 }}
            >
              <Icon className="w-4 h-4 shrink-0 opacity-80" strokeWidth={1.75} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div
          className="px-3 py-4 space-y-0.5"
          style={{ borderTop: '1px solid var(--t-border-subtle)' }}
        >
          <NavLink
            to="/account"
            className={({ isActive }) =>
              [
                'flex items-center gap-3 px-2.5 py-2 mb-1 rounded-md transition-colors',
                isActive ? 'nav-item-active' : 'nav-item',
              ].join(' ')
            }
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] shrink-0"
              style={{
                background: 'var(--t-surface-2)',
                color: 'var(--t-fg)',
                fontWeight: 590,
              }}
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p
                className="text-[12px] truncate"
                style={{ fontFeatureSettings: "'cv01','ss03'", fontWeight: 510, color: 'var(--t-fg)' }}
              >
                {fullName}
              </p>
              <p
                className="text-[11px] truncate"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--t-fg-4)' }}
              >
                {user?.email}
              </p>
            </div>
          </NavLink>

          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] nav-item w-full"
            style={{ fontFeatureSettings: "'cv01','ss03'", fontWeight: 510 }}
            title={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
          >
            {isDark
              ? <Sun className="w-4 h-4 shrink-0 opacity-80" strokeWidth={1.75} />
              : <Moon className="w-4 h-4 shrink-0 opacity-80" strokeWidth={1.75} />}
            {isDark ? 'Mode clair' : 'Mode sombre'}
          </button>

          <button
            onClick={handleSignOut}
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] nav-item w-full"
            style={{ fontFeatureSettings: "'cv01','ss03'", fontWeight: 510 }}
          >
            <LogOut className="w-4 h-4 shrink-0 opacity-80" strokeWidth={1.75} />
            Se déconnecter
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <header
        className="lg:hidden fixed top-0 inset-x-0 z-40 backdrop-blur-lg"
        style={{
          background: 'var(--t-topbar-bg)',
          borderBottom: '1px solid var(--t-border-subtle)',
        }}
      >
        <div className="flex items-center justify-between px-4 h-14">
          <Logo size={20} />
          <div className="flex items-center gap-1">
            <button
              onClick={toggle}
              className="w-9 h-9 flex items-center justify-center rounded-md transition-colors"
              style={{ color: 'var(--t-fg-2)' }}
              aria-label="Basculer le thème"
              title={isDark ? 'Mode clair' : 'Mode sombre'}
            >
              {isDark
                ? <Sun className="w-4 h-4" strokeWidth={1.75} />
                : <Moon className="w-4 h-4" strokeWidth={1.75} />}
            </button>
            <NavLink
              to="/account"
              className="w-9 h-9 flex items-center justify-center rounded-md transition-colors"
              style={{ color: 'var(--t-fg-2)' }}
              aria-label="Mon compte"
            >
              <User className="w-4 h-4" strokeWidth={1.75} />
            </NavLink>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="lg:pl-[240px] min-w-0 overflow-x-hidden">
        <div className="pt-14 lg:pt-0 pb-20 lg:pb-0 w-full">
          <div className="animate-fade-in-up">{children}</div>
        </div>
      </main>

      <FeedbackButton />

      {/* Mobile bottom nav */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 backdrop-blur-lg"
        style={{
          background: 'var(--t-topbar-bg)',
          borderTop: '1px solid var(--t-border-subtle)',
        }}
      >
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                [
                  'flex flex-col items-center gap-1 px-4 py-1.5 rounded-md text-[10px] transition-colors',
                  isActive ? 'mobile-nav-active' : 'mobile-nav',
                ].join(' ')
              }
              style={{ fontFeatureSettings: "'cv01','ss03'", fontWeight: 510 }}
            >
              <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
              {label}
            </NavLink>
          ))}
          <button
            onClick={handleSignOut}
            className="flex flex-col items-center gap-1 px-4 py-1.5 rounded-md text-[10px] transition-colors"
            style={{
              fontFeatureSettings: "'cv01','ss03'",
              fontWeight: 510,
              color: 'var(--t-fg-4)',
            }}
          >
            <LogOut className="w-[18px] h-[18px]" strokeWidth={1.75} />
            Quitter
          </button>
        </div>
      </nav>

      <style>{`
        .nav-item {
          color: var(--t-fg-2);
        }
        .nav-item:hover {
          background: var(--t-surface-hover);
          color: var(--t-fg);
        }
        .nav-item-active {
          background: var(--t-surface-active);
          color: var(--t-fg);
        }
        .mobile-nav { color: var(--t-fg-4); }
        .mobile-nav:hover { color: var(--t-fg-2); }
        .mobile-nav-active { color: var(--t-fg); }
      `}</style>
    </div>
  )
}
