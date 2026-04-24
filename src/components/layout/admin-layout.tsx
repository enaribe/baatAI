import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Inbox, Mail, Users, Banknote, LogOut, User, Sun, Moon, Send,
} from 'lucide-react'
import { useAuth } from '../../hooks/use-auth'
import { useDarkMode } from '../../hooks/use-dark-mode'
import { Logo } from '../ui/logo'
import { supabase } from '../../lib/supabase'

interface AdminLayoutProps {
  children: ReactNode
}

interface NavItem {
  to: string
  icon: typeof LayoutDashboard
  label: string
  badgeKey?: 'pendingRequests' | 'pendingWithdrawals'
}

const navItems: NavItem[] = [
  { to: '/admin', icon: LayoutDashboard, label: 'Vue d\'ensemble' },
  { to: '/admin/requests', icon: Inbox, label: 'Demandes', badgeKey: 'pendingRequests' },
  { to: '/admin/whitelist', icon: Mail, label: 'Whitelist' },
  { to: '/admin/users', icon: Users, label: 'Utilisateurs' },
  { to: '/admin/emails', icon: Send, label: 'Emails' },
  { to: '/admin/withdrawals', icon: Banknote, label: 'Retraits', badgeKey: 'pendingWithdrawals' },
]

interface PendingCounts {
  pendingRequests: number
  pendingWithdrawals: number
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { signOut, user } = useAuth()
  const { isDark, toggle } = useDarkMode()
  const navigate = useNavigate()
  const [counts, setCounts] = useState<PendingCounts>({ pendingRequests: 0, pendingWithdrawals: 0 })

  useEffect(() => {
    let cancelled = false

    const fetchCounts = async () => {
      const [requestsRes, withdrawalsRes] = await Promise.all([
        (supabase.from('access_requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending') as unknown as Promise<{ count: number | null }>),
        (supabase.from('withdrawals')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending') as unknown as Promise<{ count: number | null }>),
      ])
      if (cancelled) return
      setCounts({
        pendingRequests: requestsRes.count ?? 0,
        pendingWithdrawals: withdrawalsRes.count ?? 0,
      })
    }

    void fetchCounts()
    const interval = setInterval(() => { void fetchCounts() }, 60_000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

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
        {/* Logo + badge admin */}
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
              color: 'var(--t-accent-text)',
              background: 'var(--t-accent-muted-bg)',
              border: '1px solid var(--t-accent-muted-border)',
            }}
          >
            Admin
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          <p
            className="px-2.5 mb-2 text-[10px] uppercase tracking-[0.08em]"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--t-fg-4)' }}
          >
            Administration
          </p>
          {navItems.map(({ to, icon: Icon, label, badgeKey }) => {
            const badgeValue = badgeKey ? counts[badgeKey] : 0
            return (
              <NavLink
                key={to}
                to={to}
                end={to === '/admin'}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-colors duration-150',
                    isActive ? 'admin-nav-item-active' : 'admin-nav-item',
                  ].join(' ')
                }
                style={{ fontFeatureSettings: "'cv01','ss03'", fontWeight: 510 }}
              >
                <Icon className="w-4 h-4 shrink-0 opacity-80" strokeWidth={1.75} />
                <span className="flex-1">{label}</span>
                {badgeValue > 0 && (
                  <span
                    className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] tabular-nums"
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontFeatureSettings: "'cv01','ss03'",
                      fontWeight: 590,
                      color: '#ffffff',
                      background: 'var(--t-accent)',
                    }}
                  >
                    {badgeValue}
                  </span>
                )}
              </NavLink>
            )
          })}

          <div className="my-3" style={{ borderTop: '1px solid var(--t-border-subtle)' }} />

          <p
            className="px-2.5 mb-2 text-[10px] uppercase tracking-[0.08em]"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--t-fg-4)' }}
          >
            Espaces
          </p>
          <NavLink
            to="/dashboard"
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] admin-nav-item"
            style={{ fontFeatureSettings: "'cv01','ss03'", fontWeight: 510 }}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0 opacity-80" strokeWidth={1.75} />
            Espace client
          </NavLink>
        </nav>

        {/* Bottom : profil + theme + logout */}
        <div
          className="px-3 py-4 space-y-0.5"
          style={{ borderTop: '1px solid var(--t-border-subtle)' }}
        >
          <NavLink
            to="/account"
            className="flex items-center gap-3 px-2.5 py-2 mb-1 rounded-md transition-colors admin-nav-item"
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

          <button
            onClick={toggle}
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] admin-nav-item w-full"
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
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] admin-nav-item w-full"
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
          <div className="flex items-center gap-2">
            <Logo size={20} />
            <span
              className="inline-flex items-center px-1.5 h-[16px] rounded-full text-[9px]"
              style={{
                fontFamily: 'var(--font-body)',
                fontFeatureSettings: "'cv01','ss03'",
                fontWeight: 510,
                color: 'var(--t-accent-text)',
                background: 'var(--t-accent-muted-bg)',
                border: '1px solid var(--t-accent-muted-border)',
              }}
            >
              Admin
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggle}
              className="w-9 h-9 flex items-center justify-center rounded-md transition-colors"
              style={{ color: 'var(--t-fg-2)' }}
              aria-label="Basculer le thème"
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

      {/* Mobile bottom nav */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 backdrop-blur-lg"
        style={{
          background: 'var(--t-topbar-bg)',
          borderTop: '1px solid var(--t-border-subtle)',
        }}
      >
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.slice(0, 4).map(({ to, icon: Icon, label, badgeKey }) => {
            const badgeValue = badgeKey ? counts[badgeKey] : 0
            const shortLabel = label.split(' ')[0]
            return (
              <NavLink
                key={to}
                to={to}
                end={to === '/admin'}
                className={({ isActive }) =>
                  [
                    'relative flex flex-col items-center gap-1 px-3 py-1.5 rounded-md text-[10px] transition-colors',
                    isActive ? 'admin-mobile-nav-active' : 'admin-mobile-nav',
                  ].join(' ')
                }
                style={{ fontFeatureSettings: "'cv01','ss03'", fontWeight: 510 }}
              >
                <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
                {shortLabel}
                {badgeValue > 0 && (
                  <span
                    className="absolute top-0.5 right-1 inline-flex items-center justify-center min-w-[14px] h-[14px] px-1 rounded-full text-[9px] tabular-nums"
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontWeight: 590,
                      color: '#ffffff',
                      background: 'var(--t-accent)',
                    }}
                  >
                    {badgeValue}
                  </span>
                )}
              </NavLink>
            )
          })}
        </div>
      </nav>

      <style>{`
        .admin-nav-item {
          color: var(--t-fg-2);
        }
        .admin-nav-item:hover {
          background: var(--t-surface-hover);
          color: var(--t-fg);
        }
        .admin-nav-item-active {
          background: var(--t-surface-active);
          color: var(--t-fg);
        }
        .admin-mobile-nav { color: var(--t-fg-4); }
        .admin-mobile-nav:hover { color: var(--t-fg-2); }
        .admin-mobile-nav-active { color: var(--t-fg); }
      `}</style>
    </div>
  )
}
