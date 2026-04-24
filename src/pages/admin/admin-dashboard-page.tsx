import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Inbox, Users, Mic, Database, Banknote, ChevronRight, Loader2,
  TrendingUp, ShieldCheck, Mail,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'

const sans = { fontFamily: 'var(--font-body)', fontFeatureSettings: "'cv01','ss03'" }
const mono = { fontFamily: 'var(--font-mono)' }

interface Stats {
  pendingRequests: number
  pendingClientRequests: number
  pendingSpeakerRequests: number
  whitelistTotal: number
  whitelistUsed: number
  whitelistUnused: number
  totalClients: number
  totalSpeakers: number
  totalProjects: number
  activeProjects: number
  totalRecordings: number
  recordingsToday: number
  pendingWithdrawals: number
}

const ZERO: Stats = {
  pendingRequests: 0,
  pendingClientRequests: 0,
  pendingSpeakerRequests: 0,
  whitelistTotal: 0,
  whitelistUsed: 0,
  whitelistUnused: 0,
  totalClients: 0,
  totalSpeakers: 0,
  totalProjects: 0,
  activeProjects: 0,
  totalRecordings: 0,
  recordingsToday: 0,
  pendingWithdrawals: 0,
}

async function loadStats(): Promise<Stats> {
  const todayIso = new Date()
  todayIso.setHours(0, 0, 0, 0)
  const todayStr = todayIso.toISOString()

  type CountRes = { count: number | null }
  const [
    pendingReq, pendingClientReq, pendingSpeakerReq,
    whitelistTotal, whitelistUsed,
    clients, speakers,
    projects, activeProjects,
    recordings, recordingsToday,
    withdrawals,
  ] = await Promise.all([
    supabase.from('access_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending') as unknown as Promise<CountRes>,
    supabase.from('access_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending').eq('intended_role', 'client') as unknown as Promise<CountRes>,
    supabase.from('access_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending').eq('intended_role', 'speaker') as unknown as Promise<CountRes>,
    supabase.from('allowed_emails').select('email', { count: 'exact', head: true }) as unknown as Promise<CountRes>,
    supabase.from('allowed_emails').select('email', { count: 'exact', head: true }).not('used_at', 'is', null) as unknown as Promise<CountRes>,
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'client').eq('status', 'active') as unknown as Promise<CountRes>,
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'speaker').eq('status', 'active') as unknown as Promise<CountRes>,
    supabase.from('projects').select('id', { count: 'exact', head: true }) as unknown as Promise<CountRes>,
    supabase.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'active') as unknown as Promise<CountRes>,
    supabase.from('recordings').select('id', { count: 'exact', head: true }) as unknown as Promise<CountRes>,
    supabase.from('recordings').select('id', { count: 'exact', head: true }).gte('uploaded_at', todayStr) as unknown as Promise<CountRes>,
    supabase.from('withdrawals').select('id', { count: 'exact', head: true }).eq('status', 'pending') as unknown as Promise<CountRes>,
  ])

  return {
    pendingRequests: pendingReq.count ?? 0,
    pendingClientRequests: pendingClientReq.count ?? 0,
    pendingSpeakerRequests: pendingSpeakerReq.count ?? 0,
    whitelistTotal: whitelistTotal.count ?? 0,
    whitelistUsed: whitelistUsed.count ?? 0,
    whitelistUnused: (whitelistTotal.count ?? 0) - (whitelistUsed.count ?? 0),
    totalClients: clients.count ?? 0,
    totalSpeakers: speakers.count ?? 0,
    totalProjects: projects.count ?? 0,
    activeProjects: activeProjects.count ?? 0,
    totalRecordings: recordings.count ?? 0,
    recordingsToday: recordingsToday.count ?? 0,
    pendingWithdrawals: withdrawals.count ?? 0,
  }
}

export function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats>(ZERO)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void loadStats().then(s => { if (!cancelled) { setStats(s); setLoading(false) } })
    return () => { cancelled = true }
  }, [])

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header
        className="sticky top-0 z-10 flex items-center gap-3 px-5 lg:px-8 h-[52px] backdrop-blur-md"
        style={{
          background: 'var(--t-topbar-bg)',
          borderBottom: '1px solid var(--t-border-subtle)',
        }}
      >
        <ShieldCheck className="w-[13px] h-[13px]" strokeWidth={1.75} style={{ color: 'var(--t-fg-3)' }} />
        <span className="text-[13px]" style={{ ...sans, fontWeight: 510, color: 'var(--t-fg)' }}>
          Vue d'ensemble admin
        </span>
        <span className="text-[11px] ml-1" style={{ ...mono, color: 'var(--t-fg-4)' }}>
          /admin
        </span>
      </header>

      <div className="px-5 lg:px-8 py-8 max-w-[1200px] mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--t-fg-3)' }} />
          </div>
        ) : (
          <>
            {/* Hero block : demandes pending */}
            {stats.pendingRequests > 0 && (
              <Link
                to="/admin/requests"
                className="block mb-6 p-5 rounded-[12px] transition-colors"
                style={{
                  background: 'var(--t-accent-muted-bg)',
                  border: '1px solid var(--t-accent-muted-border)',
                }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 flex items-center justify-center rounded-md shrink-0"
                    style={{
                      background: 'var(--t-accent-muted-bg)',
                      border: '1px solid var(--t-accent-muted-border)',
                      color: 'var(--t-accent-text)',
                    }}
                  >
                    <Inbox className="w-4 h-4" strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px]" style={{ ...sans, fontWeight: 590, color: 'var(--t-fg)' }}>
                      {stats.pendingRequests} demande{stats.pendingRequests > 1 ? 's' : ''} en attente
                    </p>
                    <p className="text-[12px] mt-1" style={{ ...sans, color: 'var(--t-fg-3)' }}>
                      {stats.pendingClientRequests} client{stats.pendingClientRequests > 1 ? 's' : ''} ·{' '}
                      {stats.pendingSpeakerRequests} locuteur{stats.pendingSpeakerRequests > 1 ? 's' : ''}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 mt-1" strokeWidth={1.75} style={{ color: 'var(--t-fg-3)' }} />
                </div>
              </Link>
            )}

            {/* Stats grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <StatCard
                icon={<Users className="w-3.5 h-3.5" strokeWidth={1.75} />}
                label="Clients actifs"
                value={stats.totalClients}
                hint={`${stats.totalClients + stats.totalSpeakers} comptes au total`}
              />
              <StatCard
                icon={<Mic className="w-3.5 h-3.5" strokeWidth={1.75} />}
                label="Locuteurs actifs"
                value={stats.totalSpeakers}
              />
              <StatCard
                icon={<Database className="w-3.5 h-3.5" strokeWidth={1.75} />}
                label="Projets"
                value={stats.totalProjects}
                hint={`${stats.activeProjects} actif${stats.activeProjects > 1 ? 's' : ''}`}
              />
              <StatCard
                icon={<TrendingUp className="w-3.5 h-3.5" strokeWidth={1.75} />}
                label="Recordings (total)"
                value={stats.totalRecordings}
                hint={`${stats.recordingsToday} aujourd'hui`}
              />
              <StatCard
                icon={<Banknote className="w-3.5 h-3.5" strokeWidth={1.75} />}
                label="Retraits en attente"
                value={stats.pendingWithdrawals}
                href="/admin/withdrawals"
                accent={stats.pendingWithdrawals > 0}
              />
              <StatCard
                icon={<Inbox className="w-3.5 h-3.5" strokeWidth={1.75} />}
                label="Whitelist"
                value={stats.whitelistTotal}
                hint={`${stats.whitelistUsed} utilisée${stats.whitelistUsed > 1 ? 's' : ''} · ${stats.whitelistUnused} libre${stats.whitelistUnused > 1 ? 's' : ''}`}
                href="/admin/whitelist"
              />
            </div>

            {/* Quick actions */}
            <div className="mt-8">
              <p
                className="text-[10px] uppercase tracking-[0.08em] mb-3"
                style={{ ...mono, color: 'var(--t-fg-4)' }}
              >
                Actions rapides
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ActionCard
                  to="/admin/requests"
                  icon={<Inbox className="w-3.5 h-3.5" strokeWidth={1.75} />}
                  title="Examiner les demandes"
                  subtitle={`${stats.pendingRequests} en attente`}
                />
                <ActionCard
                  to="/admin/whitelist"
                  icon={<Mail className="w-3.5 h-3.5" strokeWidth={1.75} />}
                  title="Inviter manuellement"
                  subtitle="Ajouter un email à la whitelist"
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: number
  hint?: string
  href?: string
  accent?: boolean
}

function StatCard({ icon, label, value, hint, href, accent }: StatCardProps) {
  const content = (
    <div
      className="p-4 rounded-[10px] transition-colors h-full"
      style={{
        background: accent ? 'var(--t-accent-muted-bg)' : 'var(--t-surface)',
        border: `1px solid ${accent ? 'var(--t-accent-muted-border)' : 'var(--t-border)'}`,
      }}
    >
      <div className="flex items-center gap-2">
        <span style={{ color: accent ? 'var(--t-accent-text)' : 'var(--t-fg-3)' }}>{icon}</span>
        <span
          className="text-[11px] uppercase tracking-[0.04em]"
          style={{ ...sans, fontWeight: 510, color: 'var(--t-fg-3)' }}
        >
          {label}
        </span>
      </div>
      <div
        className="text-[28px] mt-2 tabular-nums"
        style={{ ...sans, fontWeight: 510, letterSpacing: '-0.5px', color: 'var(--t-fg)', lineHeight: 1.1 }}
      >
        {value}
      </div>
      {hint && (
        <p className="text-[11px] mt-1" style={{ ...sans, color: 'var(--t-fg-4)' }}>
          {hint}
        </p>
      )}
    </div>
  )
  if (href) return <Link to={href}>{content}</Link>
  return content
}

interface ActionCardProps {
  to: string
  icon: React.ReactNode
  title: string
  subtitle: string
}

function ActionCard({ to, icon, title, subtitle }: ActionCardProps) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 p-4 rounded-[10px] transition-colors group"
      style={{
        background: 'var(--t-surface)',
        border: '1px solid var(--t-border)',
      }}
    >
      <div
        className="w-8 h-8 flex items-center justify-center rounded-md shrink-0"
        style={{
          background: 'var(--t-surface-2)',
          border: '1px solid var(--t-border)',
          color: 'var(--t-fg)',
        }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px]" style={{ ...sans, fontWeight: 590, color: 'var(--t-fg)' }}>
          {title}
        </p>
        <p className="text-[11px] mt-0.5" style={{ ...sans, color: 'var(--t-fg-3)' }}>
          {subtitle}
        </p>
      </div>
      <ChevronRight
        className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform"
        strokeWidth={1.75}
        style={{ color: 'var(--t-fg-3)' }}
      />
    </Link>
  )
}

