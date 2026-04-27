import { type ReactNode } from 'react'
import { NavLink, useNavigate, Navigate } from 'react-router-dom'
import { LayoutDashboard, Mic, Wallet, CheckSquare, Mail, User, LogOut, Loader2, Bell, Sun, Moon } from 'lucide-react'
import { useAuth } from '../../hooks/use-auth'
import { useDarkMode } from '../../hooks/use-dark-mode'
import { useSpeakerProfile } from '../../hooks/use-speaker-profile'
import { useSpeakerGuard } from '../../hooks/use-speaker-guard'
import { useNotifications } from '../../hooks/use-notifications'
import { Logo } from '../ui/logo'
import { FeedbackButton } from '../feedback-button'

interface SpeakerLayoutProps {
  children: ReactNode
}

const navItems = [
  { to: '/speaker/dashboard', icon: LayoutDashboard, label: 'Accueil' },
  { to: '/speaker/projects', icon: Mic, label: 'Projets' },
  { to: '/speaker/invitations', icon: Mail, label: 'Invitations' },
  { to: '/speaker/validate', icon: CheckSquare, label: 'Valider' },
  { to: '/speaker/wallet', icon: Wallet, label: 'Mes gains' },
  { to: '/speaker/notifications', icon: Bell, label: 'Notifications', showUnread: true },
] as const

export function SpeakerLayout({ children }: SpeakerLayoutProps) {
  const { signOut, user } = useAuth()
  const { isDark, toggle } = useDarkMode()
  const { profile } = useSpeakerProfile(user?.id)
  const guard = useSpeakerGuard()
  const { unreadCount } = useNotifications(user?.id)
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  if (guard.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--t-bg)]">
        <Loader2 className="w-6 h-6 animate-spin text-[#7170ff]" />
      </div>
    )
  }

  if (guard.status === 'no-profile') return <Navigate to="/speaker/onboarding" replace />

  const fullName = (user?.user_metadata?.full_name as string | undefined) || user?.email?.split('@')[0] || ''
  const initials = fullName
    .split(' ')
    .slice(0, 2)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() || '?'

  const balanceDisplay = profile
    ? new Intl.NumberFormat('fr-SN').format(profile.wallet_balance_fcfa) + ' FCFA'
    : null

  return (
    <div className="min-h-screen bg-[var(--t-bg)] text-[var(--t-fg)]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-[240px] lg:flex-col bg-[var(--t-bg-panel)] border-r border-[var(--t-surface-active)]">
        {/* Logo */}
        <div className="flex items-center gap-2 px-5 py-5 border-b border-[var(--t-surface-active)]">
          <Logo size={22} />
          <span
            className="ml-auto inline-flex items-center px-2 h-[18px] rounded-full text-[9px] text-[var(--t-fg-2)] uppercase tracking-wider border border-[var(--t-border-strong)]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            Locuteur
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          <p
            className="px-2.5 mb-2 text-[10px] text-[var(--t-fg-4)] uppercase tracking-[0.08em]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            Navigation
          </p>
          {navItems.map((item) => {
            const Icon = item.icon
            const showBadge = 'showUnread' in item && item.showUnread && unreadCount > 0
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-colors duration-150',
                    isActive
                      ? 'bg-[var(--t-surface-2)] text-[var(--t-fg)]'
                      : 'text-[var(--t-fg-2)] hover:bg-[var(--t-surface-hover)] hover:text-[var(--t-fg)]',
                  ].join(' ')
                }
                style={{ fontFeatureSettings: "'cv01','ss03'", fontWeight: 510 }}
              >
                <Icon className="w-4 h-4 shrink-0 opacity-80" strokeWidth={1.75} />
                <span>{item.label}</span>
                {showBadge && (
                  <span
                    className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-[#7170ff] text-white text-[9px] flex items-center justify-center tabular-nums"
                    style={{ fontWeight: 590 }}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </NavLink>
            )
          })}

          <div className="pt-3 mt-3 border-t border-[var(--t-surface-active)]">
            <NavLink
              to="/speaker/profile"
              className={({ isActive }) =>
                [
                  'flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-colors',
                  isActive
                    ? 'bg-[var(--t-surface-2)] text-[var(--t-fg)]'
                    : 'text-[var(--t-fg-2)] hover:bg-[var(--t-surface-hover)] hover:text-[var(--t-fg)]',
                ].join(' ')
              }
              style={{ fontFeatureSettings: "'cv01','ss03'", fontWeight: 510 }}
            >
              <User className="w-4 h-4 shrink-0 opacity-80" strokeWidth={1.75} />
              Mon profil
            </NavLink>
          </div>
        </nav>

        {/* Bottom */}
        <div className="px-3 py-4 border-t border-[var(--t-surface-active)] space-y-1">
          <div className="px-2.5 py-2 mb-1">
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="w-7 h-7 rounded-full bg-[var(--t-fg-5)] flex items-center justify-center text-[var(--t-fg)] text-[10px] shrink-0"
                style={{ fontWeight: 590 }}
              >
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  : initials}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="text-[12px] text-[var(--t-fg)] truncate"
                  style={{ fontFeatureSettings: "'cv01','ss03'", fontWeight: 510 }}
                >
                  {fullName}
                </p>
              </div>
            </div>
            {balanceDisplay && (
              <div className="px-2.5 py-2 rounded-md bg-[var(--t-surface-hover)] border border-[var(--t-surface-active)]">
                <p
                  className="text-[9px] text-[var(--t-fg-4)] uppercase tracking-[0.08em] mb-0.5"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  Solde
                </p>
                <p className="text-[13px] text-[var(--t-fg)] tabular-nums"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {balanceDisplay}
                </p>
              </div>
            )}
          </div>

          <button
            onClick={toggle}
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] text-[var(--t-fg-3)] hover:bg-[var(--t-surface-hover)] hover:text-[var(--t-fg)] transition-colors w-full"
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
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] text-[var(--t-fg-3)] hover:bg-[var(--t-surface-hover)] hover:text-[var(--t-fg)] transition-colors w-full"
            style={{ fontFeatureSettings: "'cv01','ss03'", fontWeight: 510 }}
          >
            <LogOut className="w-4 h-4 shrink-0 opacity-80" strokeWidth={1.75} />
            Se déconnecter
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 bg-[var(--t-topbar-bg)] backdrop-blur-lg border-b border-[var(--t-surface-active)]">
        <div className="flex items-center justify-between px-4 h-14">
          <Logo size={20} />
          <div className="flex items-center gap-1">
            {balanceDisplay && (
              <span
                className="text-[11px] text-[var(--t-fg-2)] bg-[var(--t-surface-2)] border border-[var(--t-border)] px-2 py-1 rounded-md tabular-nums"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {balanceDisplay}
              </span>
            )}
            <button
              onClick={toggle}
              className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-[var(--t-surface-2)] transition-colors text-[var(--t-fg-2)]"
              aria-label="Basculer le thème"
              title={isDark ? 'Mode clair' : 'Mode sombre'}
            >
              {isDark
                ? <Sun className="w-4 h-4" strokeWidth={1.75} />
                : <Moon className="w-4 h-4" strokeWidth={1.75} />}
            </button>
            <NavLink
              to="/speaker/notifications"
              aria-label="Notifications"
              className="relative w-9 h-9 flex items-center justify-center rounded-md hover:bg-[var(--t-surface-2)] transition-colors text-[var(--t-fg-2)]"
            >
              <Bell className="w-4 h-4" strokeWidth={1.75} />
              {unreadCount > 0 && (
                <span
                  className="absolute top-1 right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-[#7170ff] text-white text-[9px] flex items-center justify-center tabular-nums"
                  style={{ fontWeight: 590 }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
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
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[var(--t-topbar-bg)] backdrop-blur-lg border-t border-[var(--t-surface-active)]">
        <div className="flex items-center justify-around h-16 px-1">
          {navItems
            .filter((i) => i.to !== '/speaker/notifications')
            .map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  [
                    'flex flex-col items-center gap-1 px-2 py-1.5 rounded-md text-[10px] transition-colors',
                    isActive ? 'text-[var(--t-fg)]' : 'text-[var(--t-fg-4)] hover:text-[var(--t-fg-2)]',
                  ].join(' ')
                }
                style={{ fontFeatureSettings: "'cv01','ss03'", fontWeight: 510 }}
              >
                <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
                {label}
              </NavLink>
            ))}
        </div>
      </nav>
    </div>
  )
}
