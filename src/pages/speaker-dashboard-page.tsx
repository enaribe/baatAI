import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Mic, Compass, ChevronRight, Play, Inbox, Clock,
  ArrowRight, Star, TrendingUp, LayoutGrid, List as ListIcon,
} from 'lucide-react'
import { useAuth } from '../hooks/use-auth'
import { useSpeakerProfile } from '../hooks/use-speaker-profile'
import { useSpeakerActiveProjects, type ActiveSpeakerProject } from '../hooks/use-speaker-active-projects'
import { useSpeakerInvitations } from '../hooks/use-speaker-invitations'
import { useCountUp } from '../hooks/use-count-up'
import { StaticWaveform } from '../components/ui/static-waveform'

const sans = { fontFamily: 'var(--font-body)', fontFeatureSettings: "'cv01','ss03'" }
const mono = { fontFamily: 'var(--font-mono)' }

type ViewMode = 'grid' | 'list'

export function SpeakerDashboardPage() {
  const { user } = useAuth()
  const { profile } = useSpeakerProfile(user?.id)
  const { projects: activeProjects, loading: projectsLoading } = useSpeakerActiveProjects(user?.id)
  const { invitations } = useSpeakerInvitations(user?.id)

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return 'grid'
    return (localStorage.getItem('baat-speaker-dash-view') as ViewMode) || 'grid'
  })
  const setView = (v: ViewMode) => {
    setViewMode(v)
    localStorage.setItem('baat-speaker-dash-view', v)
  }

  const balance = useCountUp(profile?.wallet_balance_fcfa ?? 0)
  const totalValidated = useCountUp(profile?.total_validated ?? 0)
  const reliabilityPct = useCountUp(Math.round((profile?.reliability_score ?? 1) * 100))

  const pendingInvitations = invitations.filter((i) => i.status === 'pending')
  const firstName = (user?.user_metadata?.full_name as string | undefined)?.split(' ')[0] ?? 'Locuteur'

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-10 flex items-center gap-3 px-5 lg:px-8 h-[52px] border-b border-[var(--t-surface-active)] bg-[var(--t-topbar-bg)] backdrop-blur-md">
        <Mic className="w-[13px] h-[13px] text-[var(--t-fg-3)]" strokeWidth={1.75} />
        <span className="text-[13px] text-[var(--t-fg)]" style={{ ...sans, fontWeight: 510 }}>
          Accueil
        </span>
      </header>

      <div className="px-5 lg:px-8 py-7">
        <h1
          className="text-[24px] text-[var(--t-fg)] m-0"
          style={{ ...sans, fontWeight: 510, letterSpacing: '-0.3px' }}
        >
          Bonjour, {firstName}
        </h1>
        <p className="text-[13px] text-[var(--t-fg-3)] mt-1" style={sans}>
          Prêt à enregistrer aujourd'hui ?
        </p>

        <div className="mt-5 flex items-center gap-6 flex-wrap">
          <StatInline
            label="solde"
            value={new Intl.NumberFormat('fr-SN').format(balance) + ' FCFA'}
            icon={<TrendingUp className="w-3 h-3" strokeWidth={2} />}
          />
          <StatSep />
          <StatInline
            label="validés"
            value={String(totalValidated)}
            icon={<Mic className="w-3 h-3" strokeWidth={2} />}
          />
          <StatSep />
          <StatInline
            label="fiabilité"
            value={`${reliabilityPct}%`}
            icon={<Star className="w-3 h-3" strokeWidth={2} />}
          />
        </div>
      </div>

      {pendingInvitations.length > 0 && (
        <section className="mx-5 lg:mx-8 mb-6">
          <div
            className="rounded-[10px] p-4"
            style={{
              background: 'rgba(245,158,11,0.04)',
              border: '1px solid rgba(245,158,11,0.15)',
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Inbox className="w-3.5 h-3.5 text-[#fbbf24]" strokeWidth={1.75} />
                <span className="text-[13px] text-[var(--t-fg)]" style={{ ...sans, fontWeight: 510 }}>
                  {pendingInvitations.length} invitation{pendingInvitations.length > 1 ? 's' : ''} en attente
                </span>
              </div>
              <Link
                to="/speaker/invitations"
                className="inline-flex items-center gap-1 text-[12px] text-[var(--t-fg-2)] hover:text-[var(--t-fg)] transition-colors"
                style={sans}
              >
                Voir tout
                <ChevronRight className="w-3 h-3" strokeWidth={2} />
              </Link>
            </div>
            <div className="flex flex-col gap-1 mt-3">
              {pendingInvitations.slice(0, 2).map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center gap-3 py-1.5 text-[12px]"
                  style={sans}
                >
                  <span className="text-[var(--t-fg-2)] truncate flex-1" style={{ fontWeight: 510 }}>
                    {inv.project?.name ?? '—'}
                  </span>
                  <span className="text-[11px] text-[var(--t-fg-4)]" style={sans}>
                    {inv.project?.language_label ?? ''}
                  </span>
                  {inv.project?.rate_per_hour_fcfa != null && inv.project.rate_per_hour_fcfa > 0 && (
                    <span className="text-[11px] text-[var(--t-fg)] tabular-nums" style={mono}>
                      {new Intl.NumberFormat('fr-SN').format(inv.project.rate_per_hour_fcfa)} FCFA/h
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Section header avec toggle vue */}
      <div className="flex items-center gap-2 px-5 lg:px-8 h-[36px] border-t border-[var(--t-surface-active)] bg-[var(--t-bg-subtle)]">
        <span className="text-[12px] text-[var(--t-fg)]" style={{ ...sans, fontWeight: 510 }}>
          Mes projets en cours
        </span>
        <span className="text-[11px] text-[var(--t-fg-4)]" style={mono}>
          {activeProjects.length}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <ViewToggle mode={viewMode} onChange={setView} />
          <Link
            to="/speaker/projects"
            className="inline-flex items-center gap-1 h-[22px] px-2 text-[12px] text-[var(--t-fg-3)] hover:text-[var(--t-fg)] rounded-sm hover:bg-[var(--t-surface-2)] transition-colors"
            style={sans}
          >
            <Compass className="w-3 h-3" strokeWidth={1.75} />
            Découvrir
          </Link>
        </div>
      </div>

      {projectsLoading ? (
        viewMode === 'grid' ? (
          <div className="px-5 lg:px-8 py-5 grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3 sm:gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-[160px] rounded-[10px] animate-pulse"
                style={{
                  background: 'var(--t-surface)',
                  border: '1px solid var(--t-surface-2-hover)',
                }}
              />
            ))}
          </div>
        ) : (
          <div className="px-5 lg:px-8 pt-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-[60px] mb-1 rounded-sm animate-pulse bg-[var(--t-surface)]" />
            ))}
          </div>
        )
      ) : activeProjects.length === 0 ? (
        <EmptyState />
      ) : viewMode === 'grid' ? (
        <div className="px-5 lg:px-8 py-5 grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3 sm:gap-4">
          {activeProjects.map((p) => (
            <ActiveCard key={p.session_id} project={p} />
          ))}
        </div>
      ) : (
        <div>
          {activeProjects.map((p) => (
            <ActiveRow key={p.session_id} project={p} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ---------- View toggle ---------- */

function ViewToggle({ mode, onChange }: { mode: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <div
      className="inline-flex items-center rounded-md"
      style={{
        background: 'var(--t-surface)',
        border: '1px solid var(--t-border)',
      }}
    >
      <button
        onClick={() => onChange('grid')}
        title="Vue grille"
        className="w-[24px] h-[22px] flex items-center justify-center rounded-md transition-colors"
        style={{
          color: mode === 'grid' ? 'var(--t-fg)' : 'var(--t-fg-3)',
          background: mode === 'grid' ? 'var(--t-surface-2-hover)' : 'transparent',
        }}
      >
        <LayoutGrid className="w-3 h-3" strokeWidth={1.75} />
      </button>
      <button
        onClick={() => onChange('list')}
        title="Vue liste"
        className="w-[24px] h-[22px] flex items-center justify-center rounded-md transition-colors"
        style={{
          color: mode === 'list' ? 'var(--t-fg)' : 'var(--t-fg-3)',
          background: mode === 'list' ? 'var(--t-surface-2-hover)' : 'transparent',
        }}
      >
        <ListIcon className="w-3 h-3" strokeWidth={1.75} />
      </button>
    </div>
  )
}

/* ---------- ActiveCard (vue grille) ---------- */

function ActiveCard({ project }: { project: ActiveSpeakerProject }) {
  const progress = project.total_phrases > 0
    ? Math.round((project.recorded_phrases / project.total_phrases) * 100)
    : 0

  const rateDisplay = project.rate_per_hour_fcfa > 0
    ? new Intl.NumberFormat('fr-SN').format(project.rate_per_hour_fcfa) + ' FCFA/h'
    : 'Bénévole'

  return (
    <Link
      to={`/speaker/record/${project.session_id}`}
      className="group flex flex-col rounded-[10px] overflow-hidden transition-all"
      style={{
        background: 'var(--t-surface)',
        border: '1px solid var(--t-border)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--t-surface-hover)'
        e.currentTarget.style.borderColor = 'var(--t-border-strong)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--t-surface)'
        e.currentTarget.style.borderColor = 'var(--t-border)'
      }}
    >
      {/* Preview */}
      <div
        className="relative aspect-[5/2] overflow-hidden"
        style={{
          background:
            'linear-gradient(180deg, rgba(113,112,255,0.05) 0%, rgba(255,255,255,0) 100%)',
          borderBottom: '1px solid var(--t-surface-2-hover)',
        }}
      >
        <StaticWaveform seed={project.session_id} />

        {/* Badge "En cours" avec play en haut-gauche */}
        <span
          className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-1.5 h-[20px] rounded-full text-[10px]"
          style={{
            ...sans,
            fontWeight: 510,
            color: 'var(--t-accent-text)',
            background: 'var(--t-accent-muted-bg)',
            border: '1px solid var(--t-accent-muted-border)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <Play className="w-2.5 h-2.5 ml-0.5" strokeWidth={0} style={{ fill: 'var(--t-accent-text)' }} />
          En cours
        </span>

        {/* Tarif en haut-droite */}
        <span
          className="absolute top-2.5 right-2.5 inline-flex items-center px-1.5 h-[18px] rounded-sm text-[10px]"
          style={{
            ...sans,
            fontWeight: 510,
            color: project.rate_per_hour_fcfa > 0 ? 'var(--t-fg)' : 'var(--t-fg-3)',
            background: 'var(--t-surface-active)',
            border: '1px solid var(--t-border)',
            backdropFilter: 'blur(8px)',
          }}
        >
          {rateDisplay}
        </span>

        {/* Progression bas-gauche */}
        <span
          className="absolute bottom-2 left-3 text-[10px] text-[var(--t-fg-4)] tabular-nums"
          style={mono}
        >
          {project.recorded_phrases}/{project.total_phrases}
        </span>
      </div>

      {/* Contenu */}
      <div className="flex flex-col gap-2.5 p-3.5">
        <div className="flex items-start gap-2 min-w-0">
          <p
            className="text-[13px] text-[var(--t-fg)] truncate flex-1 transition-colors"
            style={{ ...sans, fontWeight: 510, letterSpacing: '-0.1px' }}
            title={project.project_name}
          >
            {project.project_name}
          </p>
          <ArrowRight
            className="w-3.5 h-3.5 text-[var(--t-fg-4)] shrink-0 group-hover:text-[var(--t-fg)] group-hover:translate-x-0.5 transition-all"
            strokeWidth={1.75}
          />
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-[var(--t-fg-3)]" style={sans}>
          <span>{project.language_label ?? project.target_language}</span>
          <span className="text-[var(--t-fg-5)]">·</span>
          <span style={mono}>Reprendre</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 h-[3px] bg-[var(--t-surface-2-hover)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--t-fg)] rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[10px] text-[var(--t-fg-2)] tabular-nums shrink-0" style={mono}>
            {progress}%
          </span>
        </div>
      </div>
    </Link>
  )
}

/* ---------- ActiveRow (vue liste conservée) ---------- */

function ActiveRow({ project }: { project: ActiveSpeakerProject }) {
  const progress = project.total_phrases > 0
    ? Math.round((project.recorded_phrases / project.total_phrases) * 100)
    : 0

  const rateDisplay = project.rate_per_hour_fcfa > 0
    ? new Intl.NumberFormat('fr-SN').format(project.rate_per_hour_fcfa) + ' FCFA/h'
    : 'Bénévole'

  return (
    <Link
      to={`/speaker/record/${project.session_id}`}
      className="group flex items-center gap-3 px-5 lg:px-8 py-3 border-b border-[var(--t-surface-2)] hover:bg-[var(--t-surface)] transition-colors"
    >
      <span
        className="inline-flex items-center justify-center w-7 h-7 rounded-md shrink-0"
        style={{
          background: 'rgba(113,112,255,0.1)',
          border: '1px solid rgba(113,112,255,0.2)',
        }}
      >
        <Play className="w-3 h-3 text-[#7170ff] ml-0.5" strokeWidth={2} />
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="text-[13px] text-[var(--t-fg)] truncate"
            style={{ ...sans, fontWeight: 510 }}
          >
            {project.project_name}
          </span>
          <span className="text-[11px] text-[var(--t-fg-4)]" style={sans}>
            {project.language_label ?? project.target_language}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1.5">
          <div className="flex-1 max-w-[200px] h-[3px] bg-[var(--t-surface-2-hover)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--t-fg)] rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[11px] text-[var(--t-fg-4)] tabular-nums" style={mono}>
            {project.recorded_phrases}/{project.total_phrases} · {progress}%
          </span>
        </div>
      </div>

      <span className="text-[11px] text-[var(--t-fg-2)] tabular-nums hidden sm:inline" style={mono}>
        {rateDisplay}
      </span>

      <ArrowRight className="w-3.5 h-3.5 text-[var(--t-fg-4)] group-hover:text-[var(--t-fg)] group-hover:translate-x-0.5 transition-all" strokeWidth={1.75} />
    </Link>
  )
}

/* ---------- Helpers ---------- */

function StatInline({
  label, value, icon,
}: {
  label: string
  value: string
  icon?: React.ReactNode
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      {icon && <span className="text-[var(--t-fg-3)]">{icon}</span>}
      <span
        className="text-[15px] text-[var(--t-fg)] tabular-nums"
        style={{ ...sans, fontWeight: 590 }}
      >
        {value}
      </span>
      <span className="text-[12px] text-[var(--t-fg-4)]" style={sans}>
        {label}
      </span>
    </div>
  )
}

function StatSep() {
  return <span className="w-px h-3 bg-[var(--t-border)]" />
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div
        className="w-12 h-12 rounded-[10px] flex items-center justify-center mb-5"
        style={{
          background: 'linear-gradient(135deg, var(--t-border), var(--t-surface))',
          border: '1px solid var(--t-border)',
        }}
      >
        <Clock className="w-5 h-5 text-[var(--t-fg-3)]" strokeWidth={1.5} />
      </div>
      <h3
        className="text-[16px] text-[var(--t-fg)] m-0"
        style={{ ...sans, fontWeight: 590, letterSpacing: '-0.2px' }}
      >
        Aucun projet en cours
      </h3>
      <p className="text-[13px] text-[var(--t-fg-3)] mt-2 max-w-[380px]" style={{ ...sans, lineHeight: 1.55 }}>
        Parcourez les projets disponibles pour commencer à enregistrer votre voix.
      </p>
      <Link
        to="/speaker/projects"
        className="inline-flex items-center gap-1.5 h-[32px] px-3.5 text-[13px] bg-[#5e6ad2] hover:bg-[#6b77dd] text-white rounded-md mt-5 transition-colors"
        style={{ ...sans, fontWeight: 510 }}
      >
        <Compass className="w-[13px] h-[13px]" strokeWidth={1.75} />
        Explorer les projets
      </Link>
    </div>
  )
}
