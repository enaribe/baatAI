import { type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, FolderPlus, LogOut, User } from 'lucide-react'
import { useAuth } from '../../hooks/use-auth'
import { Logo } from '../ui/logo'

interface AppLayoutProps {
  children: ReactNode
}

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/project/new', icon: FolderPlus, label: 'Nouveau projet' },
]

export function AppLayout({ children }: AppLayoutProps) {
  const { signOut, user } = useAuth()
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
    <div className="min-h-screen bg-[#08090a] text-[#f7f8f8]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-[240px] lg:flex-col bg-[#0f1011] border-r border-[rgba(255,255,255,0.05)]">
        {/* Logo */}
        <div className="flex items-center gap-2 px-5 py-5 border-b border-[rgba(255,255,255,0.05)]">
          <Logo size={22} />
          <span
            className="ml-auto inline-flex items-center px-2 h-[18px] rounded-full text-[10px] text-[#d0d6e0] border border-[rgba(255,255,255,0.2)]"
            style={{ fontFamily: 'var(--font-body)', fontFeatureSettings: "'cv01','ss03'", fontWeight: 510 }}
          >
            Beta
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          <p
            className="px-2.5 mb-2 text-[10px] text-[#62666d] uppercase tracking-[0.08em]"
            style={{ fontFamily: 'var(--font-mono)' }}
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
                  isActive
                    ? 'bg-[rgba(255,255,255,0.04)] text-[#f7f8f8]'
                    : 'text-[#d0d6e0] hover:bg-[rgba(255,255,255,0.03)] hover:text-[#f7f8f8]',
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
        <div className="px-3 py-4 border-t border-[rgba(255,255,255,0.05)] space-y-0.5">
          <NavLink
            to="/account"
            className={({ isActive }) =>
              [
                'flex items-center gap-3 px-2.5 py-2 mb-1 rounded-md transition-colors',
                isActive
                  ? 'bg-[rgba(255,255,255,0.04)]'
                  : 'hover:bg-[rgba(255,255,255,0.03)]',
              ].join(' ')
            }
          >
            <div className="w-7 h-7 rounded-full bg-[#3e3e44] flex items-center justify-center text-[#f7f8f8] text-[10px] shrink-0"
              style={{ fontWeight: 590 }}
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p
                className="text-[12px] text-[#f7f8f8] truncate"
                style={{ fontFeatureSettings: "'cv01','ss03'", fontWeight: 510 }}
              >
                {fullName}
              </p>
              <p className="text-[11px] text-[#62666d] truncate" style={{ fontFamily: 'var(--font-mono)' }}>
                {user?.email}
              </p>
            </div>
          </NavLink>

          <button
            onClick={handleSignOut}
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] text-[#8a8f98] hover:bg-[rgba(255,255,255,0.03)] hover:text-[#f7f8f8] transition-colors w-full"
            style={{ fontFeatureSettings: "'cv01','ss03'", fontWeight: 510 }}
          >
            <LogOut className="w-4 h-4 shrink-0 opacity-80" strokeWidth={1.75} />
            Se déconnecter
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 bg-[rgba(8,9,10,0.9)] backdrop-blur-lg border-b border-[rgba(255,255,255,0.05)]">
        <div className="flex items-center justify-between px-4 h-14">
          <Logo size={20} />
          <NavLink
            to="/account"
            className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-[rgba(255,255,255,0.04)] transition-colors text-[#d0d6e0]"
            aria-label="Mon compte"
          >
            <User className="w-4 h-4" strokeWidth={1.75} />
          </NavLink>
        </div>
      </header>

      {/* Content */}
      <main className="lg:pl-[240px] min-w-0 overflow-x-hidden">
        <div className="pt-14 lg:pt-0 pb-20 lg:pb-0 w-full">
          <div className="animate-fade-in-up">{children}</div>
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[rgba(8,9,10,0.9)] backdrop-blur-lg border-t border-[rgba(255,255,255,0.05)]">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                [
                  'flex flex-col items-center gap-1 px-4 py-1.5 rounded-md text-[10px] transition-colors',
                  isActive ? 'text-[#f7f8f8]' : 'text-[#62666d] hover:text-[#d0d6e0]',
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
            className="flex flex-col items-center gap-1 px-4 py-1.5 rounded-md text-[10px] text-[#62666d] hover:text-[#f87171] transition-colors"
            style={{ fontFeatureSettings: "'cv01','ss03'", fontWeight: 510 }}
          >
            <LogOut className="w-[18px] h-[18px]" strokeWidth={1.75} />
            Quitter
          </button>
        </div>
      </nav>
    </div>
  )
}
