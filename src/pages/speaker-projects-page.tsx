import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Search, Filter, Mic, ChevronDown, Circle, CheckCircle2, Mail,
  Globe, Play, ChevronRight, Compass,
} from 'lucide-react'
import { useAuth } from '../hooks/use-auth'
import { useSpeakerProfile } from '../hooks/use-speaker-profile'
import { useAvailableProjects } from '../hooks/use-available-projects'
import { supabase } from '../lib/supabase'
import { LANGUAGES } from '../lib/languages'
import type { AvailableProject } from '../types/database'

const sans = { fontFamily: 'var(--font-body)', fontFeatureSettings: "'cv01','ss03'" }
const mono = { fontFamily: 'var(--font-mono)' }

export function SpeakerProjectsPage() {
  const { user } = useAuth()
  const { profile } = useSpeakerProfile(user?.id)
  const { projects, loading } = useAvailableProjects(user?.id)
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [filterLang, setFilterLang] = useState('')
  const [acceptingId, setAcceptingId] = useState<string | null>(null)

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
    const publicProjects = filtered.filter(
      (p) => !p.invitation_status && p.is_public,
    )
    return { accepted, pending, publicProjects }
  }, [filtered])

  const handleAccept = async (project: AvailableProject) => {
    setAcceptingId(project.project_id)
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setAcceptingId(null)
      return
    }

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
        <p className="text-[13px] text-[#8a8f98]" style={sans}>
          Chargement du profil…
        </p>
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
      </header>

      {/* Filter bar */}
      <div className="flex items-center gap-2 px-5 lg:px-8 py-3 border-b border-[rgba(255,255,255,0.05)]">
        <div className="relative flex-1 max-w-[360px]">
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
          <LangPill active={!filterLang} onClick={() => setFilterLang('')}>
            Toutes
          </LangPill>
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
        <div className="p-5 lg:px-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[44px] mb-1 rounded-sm animate-pulse bg-[rgba(255,255,255,0.02)]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {grouped.accepted.length > 0 && (
            <Section
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
            </Section>
          )}
          {grouped.pending.length > 0 && (
            <Section
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
            </Section>
          )}
          {grouped.publicProjects.length > 0 && (
            <Section
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
            </Section>
          )}
        </>
      )}
    </div>
  )
}

/* ---------- Sub-components ---------- */

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

function Section({
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
    <div
      className="group flex items-center gap-3 h-[44px] px-5 lg:px-8 border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.025)] transition-colors"
    >
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
          <Play className="w-3 h-3 ml-0.5" strokeWidth={2} />
          {project.invitation_status === 'accepted' ? 'Continuer' : 'Commencer'}
          <ChevronRight className="w-3 h-3" strokeWidth={1.75} />
        </button>
      )}
    </div>
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
      <h3
        className="text-[16px] text-[#f7f8f8] m-0"
        style={{ ...sans, fontWeight: 590 }}
      >
        Aucun projet trouvé
      </h3>
      <p className="text-[13px] text-[#8a8f98] mt-2 max-w-[380px]" style={{ ...sans, lineHeight: 1.55 }}>
        Essayez de modifier vos filtres ou ajoutez des langues à votre profil.
      </p>
    </div>
  )
}
