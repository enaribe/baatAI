import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Search, Filter, Mic, ChevronDown, Circle, CheckCircle2, Mail,
  Globe, Play, ChevronRight, Compass, LayoutGrid, List as ListIcon,
  Loader2,
} from 'lucide-react'
import { useAuth } from '../hooks/use-auth'
import { useSpeakerProfile } from '../hooks/use-speaker-profile'
import { useAvailableProjects } from '../hooks/use-available-projects'
import { supabase } from '../lib/supabase'
import { LANGUAGES } from '../lib/languages'
import { StaticWaveform } from '../components/ui/static-waveform'
import type { AvailableProject } from '../types/database'

const sans = { fontFamily: 'var(--font-body)', fontFeatureSettings: "'cv01','ss03'" }
const mono = { fontFamily: 'var(--font-mono)' }

type ViewMode = 'grid' | 'list'

export function SpeakerProjectsPage() {
  const { user } = useAuth()
  const { profile } = useSpeakerProfile(user?.id)
  const { projects, loading } = useAvailableProjects(user?.id)
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [filterLang, setFilterLang] = useState('')
  const [acceptingId, setAcceptingId] = useState<string | null>(null)

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return 'grid'
    return (localStorage.getItem('baat-speaker-projects-view') as ViewMode) || 'grid'
  })
  const setView = (v: ViewMode) => {
    setViewMode(v)
    localStorage.setItem('baat-speaker-projects-view', v)
  }

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      const matchSearch = p.project_name.toLowerCase().includes(search.toLowerCase())
      const matchLang = !filterLang || p.target_language === filterLang
      return matchSearch && matchLang
    })
  }, [projects, search, filterLang])

  const grouped = useMemo(() => {
    const accepted = filtered.filter((p) => p.invitation_status === 'accepted')
    const pending = filtered.filter((p) => p.invitation_status === 'pending')
    const publicProjects = filtered.filter((p) => !p.invitation_status && p.is_public)
    return { accepted, pending, publicProjects }
  }, [filtered])

  const handleAccept = async (project: AvailableProject) => {
    setAcceptingId(project.project_id)
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setAcceptingId(null); return }

    const res = await fetch(`${supabaseUrl}/functions/v1/accept-project`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      },
      body: JSON.stringify({ project_id: project.project_id }),
    })
    const json = (await res.json()) as { data?: { session_id: string }; error?: string }
    setAcceptingId(null)
    if (json.data?.session_id) {
      navigate(`/speaker/record/${json.data.session_id}`)
    }
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[13px] text-[#8a8f98]" style={sans}>Chargement du profil…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-10 flex items-center gap-3 px-5 lg:px-8 h-[52px] border-b border-[rgba(255,255,255,0.05)] bg-[rgba(8,9,10,0.9)] backdrop-blur-md">
        <Compass className="w-[13px] h-[13px] text-[#8a8f98]" strokeWidth={1.75} />
        <span className="text-[13px] text-[#f7f8f8]" style={{ ...sans, fontWeight: 510 }}>
          Projets disponibles
        </span>
        <span className="text-[11px] text-[#62666d] ml-1" style={mono}>
          {projects.length}
        </span>

        <div className="ml-auto flex items-center gap-1.5">
          <ViewToggle mode={viewMode} onChange={setView} />
        </div>
      </header>

      {/* Filter bar */}
      <div className="flex items-center gap-2 px-5 lg:px-8 py-3 border-b border-[rgba(255,255,255,0.05)] flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-[360px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-[13px] h-[13px] text-[#62666d] pointer-events-none" strokeWidth={1.75} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un projet…"
            className="w-full h-[28px] pl-8 pr-3 text-[12px] text-[#f7f8f8] placeholder:text-[#62666d] rounded-md bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] focus:outline-none focus:border-[rgba(255,255,255,0.2)]"
            style={sans}
          />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          <LangPill active={!filterLang} onClick={() => setFilterLang('')}>Toutes</LangPill>
          {Object.entries(LANGUAGES).slice(0, 4).map(([code, lang]) => (
            <LangPill
              key={code}
              active={filterLang === code}
              onClick={() => setFilterLang(code)}
            >
              {lang.label}
            </LangPill>
          ))}
        </div>
        <button className="ml-auto w-[28px] h-[28px] flex items-center justify-center rounded-md text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[rgba(255,255,255,0.04)] transition-colors">
          <Filter className="w-[13px] h-[13px]" strokeWidth={1.75} />
        </button>
      </div>

      {loading ? (
        viewMode === 'grid' ? (
          <div className="px-5 lg:px-8 py-5 grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3 sm:gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-[180px] rounded-[10px] animate-pulse"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              />
            ))}
          </div>
        ) : (
          <div className="p-5 lg:px-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[44px] mb-1 rounded-sm animate-pulse bg-[rgba(255,255,255,0.02)]" />
            ))}
          </div>
        )
      ) : filtered.length === 0 ? (
        <EmptyState />
      ) : viewMode === 'grid' ? (
        <>
          {grouped.accepted.length > 0 && (
            <GridSection
              title="Invitations acceptées"
              count={grouped.accepted.length}
              icon={<CheckCircle2 className="w-3.5 h-3.5 text-[#10b981]" strokeWidth={2} />}
              projects={grouped.accepted}
              onAccept={handleAccept}
              acceptingId={acceptingId}
            />
          )}
          {grouped.pending.length > 0 && (
            <GridSection
              title="Invitations en attente"
              count={grouped.pending.length}
              icon={<Mail className="w-3.5 h-3.5 text-[#fbbf24]" strokeWidth={2} />}
              projects={grouped.pending}
              onAccept={() => {}}
              acceptingId={null}
            />
          )}
          {grouped.publicProjects.length > 0 && (
            <GridSection
              title="Publics"
              count={grouped.publicProjects.length}
              icon={<Globe className="w-3.5 h-3.5 text-[#7170ff]" strokeWidth={2} />}
              projects={grouped.publicProjects}
              onAccept={handleAccept}
              acceptingId={acceptingId}
            />
          )}
        </>
      ) : (
        <>
          {grouped.accepted.length > 0 && (
            <ListSection
              title="Invitations acceptées"
              count={grouped.accepted.length}
              icon={<CheckCircle2 className="w-3.5 h-3.5 text-[#10b981]" strokeWidth={2} />}
            >
              {grouped.accepted.map((p) => (
                <ProjectRow
                  key={p.project_id}
                  project={p}
                  onAction={() => handleAccept(p)}
                  busy={acceptingId === p.project_id}
                />
              ))}
            </ListSection>
          )}
          {grouped.pending.length > 0 && (
            <ListSection
              title="Invitations en attente"
              count={grouped.pending.length}
              icon={<Mail className="w-3.5 h-3.5 text-[#fbbf24]" strokeWidth={2} />}
            >
              {grouped.pending.map((p) => (
                <ProjectRow
                  key={p.project_id}
                  project={p}
                  onAction={() => {}}
                  busy={false}
                />
              ))}
            </ListSection>
          )}
          {grouped.publicProjects.length > 0 && (
            <ListSection
              title="Publics"
              count={grouped.publicProjects.length}
              icon={<Globe className="w-3.5 h-3.5 text-[#7170ff]" strokeWidth={2} />}
            >
              {grouped.publicProjects.map((p) => (
                <ProjectRow
                  key={p.project_id}
                  project={p}
                  onAction={() => handleAccept(p)}
                  busy={acceptingId === p.project_id}
                />
              ))}
            </ListSection>
          )}
        </>
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
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <button
        onClick={() => onChange('grid')}
        title="Vue grille"
        className="w-[26px] h-[26px] flex items-center justify-center rounded-md transition-colors"
        style={{
          color: mode === 'grid' ? '#f7f8f8' : '#8a8f98',
          background: mode === 'grid' ? 'rgba(255,255,255,0.06)' : 'transparent',
        }}
      >
        <LayoutGrid className="w-[13px] h-[13px]" strokeWidth={1.75} />
      </button>
      <button
        onClick={() => onChange('list')}
        title="Vue liste"
        className="w-[26px] h-[26px] flex items-center justify-center rounded-md transition-colors"
        style={{
          color: mode === 'list' ? '#f7f8f8' : '#8a8f98',
          background: mode === 'list' ? 'rgba(255,255,255,0.06)' : 'transparent',
        }}
      >
        <ListIcon className="w-[13px] h-[13px]" strokeWidth={1.75} />
      </button>
    </div>
  )
}

/* ---------- Grid section ---------- */

function GridSection({
  title, count, icon, projects, onAccept, acceptingId,
}: {
  title: string
  count: number
  icon: React.ReactNode
  projects: AvailableProject[]
  onAccept: (p: AvailableProject) => void
  acceptingId: string | null
}) {
  return (
    <div>
      <div className="flex items-center gap-2 px-5 lg:px-8 h-[36px] border-t border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.01)]">
        <ChevronDown className="w-3 h-3 text-[#8a8f98]" strokeWidth={2} />
        {icon}
        <span className="text-[12px] text-[#f7f8f8]" style={{ ...sans, fontWeight: 510 }}>
          {title}
        </span>
        <span className="text-[11px] text-[#62666d]" style={mono}>
          {count}
        </span>
      </div>
      <div className="px-5 lg:px-8 py-5 grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3 sm:gap-4">
        {projects.map((p) => (
          <ProjectCard
            key={p.project_id}
            project={p}
            onAccept={() => onAccept(p)}
            busy={acceptingId === p.project_id}
          />
        ))}
      </div>
    </div>
  )
}

/* ---------- ProjectCard (grille) ---------- */

function ProjectCard({
  project, onAccept, busy,
}: {
  project: AvailableProject
  onAccept: () => void
  busy: boolean
}) {
  const rateDisplay = project.rate_per_hour_fcfa > 0
    ? new Intl.NumberFormat('fr-SN').format(project.rate_per_hour_fcfa) + ' FCFA/h'
    : 'Bénévole'

  const code = `BAA-${project.project_id.slice(0, 4).toUpperCase()}`
  const isPending = project.invitation_status === 'pending'
  const isAccepted = project.invitation_status === 'accepted'

  return (
    <div
      className="group flex flex-col rounded-[10px] overflow-hidden transition-all"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.035)'
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
      }}
    >
      {/* Preview zone */}
      <div
        className="relative aspect-[5/2] overflow-hidden"
        style={{
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <StaticWaveform seed={project.project_id} />

        {/* Badge statut en haut-gauche */}
        {isAccepted && (
          <span
            className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-1.5 h-[20px] rounded-full text-[10px]"
            style={{
              ...sans,
              fontWeight: 510,
              color: '#10b981',
              background: 'rgba(8,9,10,0.7)',
              border: '1px solid rgba(16,185,129,0.35)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <CheckCircle2 className="w-2.5 h-2.5" strokeWidth={2.5} />
            Acceptée
          </span>
        )}
        {isPending && (
          <span
            className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-1.5 h-[20px] rounded-full text-[10px]"
            style={{
              ...sans,
              fontWeight: 510,
              color: '#fbbf24',
              background: 'rgba(8,9,10,0.7)',
              border: '1px solid rgba(245,158,11,0.35)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <Mail className="w-2.5 h-2.5" strokeWidth={2} />
            Invitation
          </span>
        )}
        {!isAccepted && !isPending && (
          <span
            className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-1.5 h-[20px] rounded-full text-[10px]"
            style={{
              ...sans,
              fontWeight: 510,
              color: '#7170ff',
              background: 'rgba(8,9,10,0.7)',
              border: '1px solid rgba(113,112,255,0.35)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <Globe className="w-2.5 h-2.5" strokeWidth={2} />
            Public
          </span>
        )}

        {/* Tarif en haut-droite */}
        <span
          className="absolute top-2.5 right-2.5 inline-flex items-center px-1.5 h-[18px] rounded-sm text-[10px]"
          style={{
            ...sans,
            fontWeight: 510,
            color: project.rate_per_hour_fcfa > 0 ? '#f7f8f8' : '#8a8f98',
            background: 'rgba(8,9,10,0.6)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(8px)',
          }}
        >
          {rateDisplay}
        </span>

        {/* Code en bas-gauche */}
        <span
          className="absolute bottom-2 left-3 text-[10px] text-[#62666d]"
          style={mono}
        >
          {code}
        </span>
      </div>

      {/* Contenu */}
      <div className="flex flex-col gap-2.5 p-3.5">
        <p
          className="text-[13px] text-[#f7f8f8] truncate group-hover:text-white transition-colors"
          style={{ ...sans, fontWeight: 510, letterSpacing: '-0.1px' }}
          title={project.project_name}
        >
          {project.project_name}
        </p>

        <div className="flex items-center gap-1.5 text-[11px] text-[#8a8f98]" style={sans}>
          <span>{project.language_label ?? project.target_language}</span>
          <span className="text-[#3e3e44]">·</span>
          <span style={mono}>{project.phrase_count} phrases</span>
        </div>

        {/* Action CTA */}
        <div className="pt-1">
          {isPending ? (
            <Link
              to="/speaker/invitations"
              className="w-full inline-flex items-center justify-center gap-1 h-[30px] text-[12px] rounded-md transition-colors"
              style={{
                ...sans,
                fontWeight: 510,
                color: '#fbbf24',
                background: 'rgba(245,158,11,0.08)',
                border: '1px solid rgba(245,158,11,0.2)',
              }}
            >
              <Mail className="w-3 h-3" strokeWidth={1.75} />
              Voir l'invitation
            </Link>
          ) : (
            <button
              onClick={onAccept}
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-1 h-[30px] text-[12px] rounded-md transition-colors disabled:opacity-50"
              style={{
                ...sans,
                fontWeight: 510,
                color: '#f7f8f8',
                background: 'rgba(113,112,255,0.12)',
                border: '1px solid rgba(113,112,255,0.3)',
              }}
            >
              {busy ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <>
                  <Play className="w-3 h-3 ml-0.5" strokeWidth={2} />
                  {isAccepted ? 'Continuer' : 'Commencer'}
                  <ChevronRight className="w-3 h-3" strokeWidth={1.75} />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ---------- List section ---------- */

function ListSection({
  title, count, icon, children,
}: {
  title: string
  count: number
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-2 px-5 lg:px-8 h-[36px] border-t border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.01)]">
        <ChevronDown className="w-3 h-3 text-[#8a8f98]" strokeWidth={2} />
        {icon}
        <span className="text-[12px] text-[#f7f8f8]" style={{ ...sans, fontWeight: 510 }}>
          {title}
        </span>
        <span className="text-[11px] text-[#62666d]" style={mono}>
          {count}
        </span>
      </div>
      {children}
    </div>
  )
}

/* ---------- ProjectRow (liste) ---------- */

function ProjectRow({
  project, onAction, busy,
}: {
  project: AvailableProject
  onAction: () => void
  busy: boolean
}) {
  const rateDisplay = project.rate_per_hour_fcfa > 0
    ? new Intl.NumberFormat('fr-SN').format(project.rate_per_hour_fcfa) + ' FCFA/h'
    : 'Bénévole'

  const code = `BAA-${project.project_id.slice(0, 4).toUpperCase()}`
  const isPending = project.invitation_status === 'pending'

  return (
    <div className="group flex items-center gap-3 h-[44px] px-5 lg:px-8 border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.025)] transition-colors">
      <span className="text-[11px] text-[#62666d] w-[70px] shrink-0" style={mono}>
        {code}
      </span>
      <Circle className="w-3.5 h-3.5 text-[#7170ff] shrink-0" strokeWidth={2} />
      <span
        className="flex-1 min-w-0 truncate text-[13px] text-[#f7f8f8]"
        style={{ ...sans, fontWeight: 510 }}
      >
        {project.project_name}
      </span>
      <span className="text-[11px] text-[#8a8f98] hidden md:inline" style={sans}>
        {project.language_label ?? project.target_language}
      </span>
      <span className="text-[11px] text-[#62666d] tabular-nums hidden sm:inline" style={mono}>
        {project.phrase_count} phrases
      </span>
      <span className="text-[11px] text-[#d0d6e0] tabular-nums" style={mono}>
        {rateDisplay}
      </span>
      {isPending ? (
        <Link
          to="/speaker/invitations"
          className="ml-2 inline-flex items-center gap-1 h-[26px] px-2.5 text-[12px] rounded-md transition-colors"
          style={{
            ...sans,
            fontWeight: 510,
            color: '#fbbf24',
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.2)',
          }}
        >
          <Mail className="w-3 h-3" strokeWidth={1.75} />
          Invitation
        </Link>
      ) : (
        <button
          onClick={onAction}
          disabled={busy}
          className="ml-2 inline-flex items-center gap-1 h-[26px] px-2.5 text-[12px] rounded-md transition-colors disabled:opacity-50"
          style={{
            ...sans,
            fontWeight: 510,
            color: '#f7f8f8',
            background: 'rgba(113,112,255,0.1)',
            border: '1px solid rgba(113,112,255,0.25)',
          }}
        >
          {busy ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <>
              <Play className="w-3 h-3 ml-0.5" strokeWidth={2} />
              {project.invitation_status === 'accepted' ? 'Continuer' : 'Commencer'}
              <ChevronRight className="w-3 h-3" strokeWidth={1.75} />
            </>
          )}
        </button>
      )}
    </div>
  )
}

/* ---------- LangPill ---------- */

function LangPill({
  active, onClick, children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className="px-2.5 h-[26px] text-[12px] rounded-md transition-colors whitespace-nowrap"
      style={{
        ...sans,
        fontWeight: 510,
        color: active ? '#f7f8f8' : '#8a8f98',
        background: active ? 'rgba(255,255,255,0.05)' : 'transparent',
        border: `1px solid ${active ? 'rgba(255,255,255,0.08)' : 'transparent'}`,
      }}
    >
      {children}
    </button>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
      <div
        className="w-12 h-12 rounded-[10px] flex items-center justify-center mb-5"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Mic className="w-5 h-5 text-[#8a8f98]" strokeWidth={1.5} />
      </div>
      <h3 className="text-[16px] text-[#f7f8f8] m-0" style={{ ...sans, fontWeight: 590 }}>
        Aucun projet trouvé
      </h3>
      <p className="text-[13px] text-[#8a8f98] mt-2 max-w-[380px]" style={{ ...sans, lineHeight: 1.55 }}>
        Essayez de modifier vos filtres ou ajoutez des langues à votre profil.
      </p>
    </div>
  )
}
