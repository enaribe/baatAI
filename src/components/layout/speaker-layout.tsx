import { type ReactNode } from 'react'
import { NavLink, useNavigate, Navigate } from 'react-router-dom'
import {
  LayoutDashboard, Mic, Wallet, CheckSquare, Mail, User,
  LogOut, Sun, Moon, Clock, Loader2,
} from 'lucide-react'
import { useAuth } from '../../hooks/use-auth'
import { useDarkMode } from '../../hooks/use-dark-mode'
import { useSpeakerProfile } from '../../hooks/use-speaker-profile'
import { useSpeakerGuard } from '../../hooks/use-speaker-guard'

interface SpeakerLayoutProps {
  children: ReactNode
}

const navItems = [
  { to: '/speaker/dashboard', icon: LayoutDashboard, label: 'Accueil' },
  { to: '/speaker/projects', icon: Mic, label: 'Projets' },
  { to: '/speaker/invitations', icon: Mail, label: 'Invitations' },
  { to: '/speaker/validate', icon: CheckSquare, label: 'Valider' },
  { to: '/speaker/wallet', icon: Wallet, label: 'Mes gains' },
]

export function SpeakerLayout({ children }: SpeakerLayoutProps) {
  const { signOut, user } = useAuth()
  const { isDark, toggle } = useDarkMode()
  const { profile } = useSpeakerProfile(user?.id)
  const guard = useSpeakerGuard()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  if (guard.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sand-50 dark:bg-sand-950">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  if (guard.status === 'no-profile') return <Navigate to="/speaker/onboarding" replace />
  if (guard.status === 'pending' || guard.status === 'rejected') {
    return <Navigate to="/speaker/pending" replace />
  }

  const initials = (user?.user_metadata?.full_name as string | undefined)
    ?.split(' ')
    .slice(0, 2)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() ?? '?'

  const verificationBadge = () => {
    if (!profile) return null
    if (profile.verification_status === 'approved') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary-100 text-secondary-700 text-[10px] font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary-500" />
          Approuvé
        </span>
      )
    }
    if (profile.verification_status === 'pending') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">
          <Clock className="w-2.5 h-2.5" />
          En attente
        </span>
      )
    }
    return null
  }

  const balanceDisplay = profile
    ? new Intl.NumberFormat('fr-SN').format(profile.wallet_balance_fcfa) + ' FCFA'
    : null

  return (
    <div className="min-h-screen bg-sand-50 dark:bg-sand-950">
      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-[240px] lg:flex-col bg-white dark:bg-sand-950 border-r border-sand-200/70 dark:border-sand-800/70">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-6 border-b border-sand-100 dark:border-sand-800/50">
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-md shadow-primary-500/30">
            <Mic className="w-4.5 h-4.5 text-white" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-secondary-500 border-2 border-white dark:border-sand-950" />
          </div>
          <div>
            <span
              className="block text-lg font-extrabold text-sand-900 dark:text-sand-100 leading-none"
              style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}
            >
              Baat-IA
            </span>
            <span className="text-[10px] font-medium text-sand-400 uppercase tracking-widest">Espace locuteur</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 space-y-1">
          <p className="px-3 mb-3 text-[10px] font-bold text-sand-400 uppercase tracking-widest">Navigation</p>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                [
                  'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                    : 'text-sand-600 hover:bg-sand-100 hover:text-sand-900 dark:text-sand-400 dark:hover:bg-sand-800/70 dark:hover:text-sand-200',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary-500" />
                  )}
                  <Icon className="w-4.5 h-4.5 shrink-0" />
                  {label}
                </>
              )}
            </NavLink>
          ))}

          {/* Lien profil */}
          <div className="pt-3 border-t border-sand-100 dark:border-sand-800/50 mt-3">
            <NavLink
              to="/speaker/profile"
              className={({ isActive }) =>
                [
                  'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                    : 'text-sand-600 hover:bg-sand-100 hover:text-sand-900 dark:text-sand-400 dark:hover:bg-sand-800/70 dark:hover:text-sand-200',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary-500" />
                  )}
                  <User className="w-4.5 h-4.5 shrink-0" />
                  Mon profil
                </>
              )}
            </NavLink>
          </div>
        </nav>

        {/* Bottom */}
        <div className="px-3 py-4 border-t border-sand-100 dark:border-sand-800/50 space-y-1">
          {/* User + badge + solde */}
          <div className="px-3 py-2.5 mb-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  : initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-sand-800 dark:text-sand-200 truncate">
                  {(user?.user_metadata?.full_name as string | undefined) || user?.email?.split('@')[0]}
                </p>
                {verificationBadge()}
              </div>
            </div>
            {balanceDisplay && (
              <div className="bg-secondary-50 dark:bg-secondary-900/20 rounded-lg px-3 py-1.5">
                <p className="text-[10px] text-secondary-600 dark:text-secondary-400 font-semibold">Solde disponible</p>
                <p className="text-sm font-bold text-secondary-700 dark:text-secondary-300 tabular-nums">{balanceDisplay}</p>
              </div>
            )}
          </div>

          <button
            onClick={toggle}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-sand-600 hover:bg-sand-100 hover:text-sand-900 dark:text-sand-400 dark:hover:bg-sand-800/70 dark:hover:text-sand-200 transition-all duration-200 w-full"
          >
            {isDark ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            {isDark ? 'Mode clair' : 'Mode sombre'}
          </button>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-sand-600 hover:bg-red-50 hover:text-red-600 dark:text-sand-400 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-all duration-200 w-full"
          >
            <LogOut className="w-4.5 h-4.5" />
            Se déconnecter
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 bg-white/90 dark:bg-sand-950/90 backdrop-blur-lg border-b border-sand-200/70 dark:border-sand-800/70">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-sm shadow-primary-500/30">
              <Mic className="w-4 h-4 text-white" />
            </div>
            <span
              className="text-lg font-extrabold text-sand-900 dark:text-sand-100"
              style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}
            >
              Baat-IA
            </span>
          </div>
          <div className="flex items-center gap-2">
            {balanceDisplay && (
              <span className="text-xs font-bold text-secondary-700 bg-secondary-50 px-2.5 py-1 rounded-full tabular-nums">
                {balanceDisplay}
              </span>
            )}
            <button
              onClick={toggle}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-sand-100 dark:hover:bg-sand-800 transition-colors text-sand-600 dark:text-sand-400"
            >
              {isDark ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="lg:pl-[240px] min-w-0 overflow-x-hidden">
        <div className="pt-14 lg:pt-0 pb-20 lg:pb-0 w-full">
          <div className="animate-fade-in-up">
            {children}
          </div>
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/90 dark:bg-sand-950/90 backdrop-blur-lg border-t border-sand-200/70 dark:border-sand-800/70">
        <div className="flex items-center justify-around h-16 px-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                [
                  'flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl text-[10px] font-semibold transition-all duration-200',
                  isActive
                    ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                    : 'text-sand-500 dark:text-sand-500 hover:text-sand-700 dark:hover:text-sand-300',
                ].join(' ')
              }
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
