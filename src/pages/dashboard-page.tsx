import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import {
  FolderPlus, Filter, MoreHorizontal, Search, Plus, Circle, CircleCheck,
  CircleDashed, Clock, Archive, ChevronDown, Mic, FileText,
  LayoutGrid, List as ListIcon,
} from 'lucide-react'
import { StaticWaveform } from '../components/ui/static-waveform'
import { useProjects } from '../hooks/use-projects'
import type { ProjectWithStats } from '../hooks/use-projects'
import { useAuth } from '../hooks/use-auth'
import type { ProjectStatus, ProjectUsageType } from '../types/database'

type FilterTab = 'all' | 'active' | 'archived'
type ViewMode = 'grid' | 'list'

const sans = { fontFamily: 'var(--font-body)', fontFeatureSettings: "'cv01','ss03'" }
const mono = { fontFamily: 'var(--font-mono)' }

export function DashboardPage() {
  const { user } = useAuth()
  const { projects, loading, error } = useProjects()
  const [filter, setFilter] = useState<FilterTab>('all')
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return 'grid'
    return (localStorage.getItem('baat-view-mode') as ViewMode) || 'grid'
  })

  const setView = (v: ViewMode) => {
    setViewMode(v)
    localStorage.setItem('baat-view-mode', v)
  }

  const displayName = (user?.user_metadata?.full_name as string | undefined)?.split(' ')[0]
    || user?.email?.split('@')[0]
    || ''

  const totalPhrases = projects.reduce((sum, p) => sum + p.total_phrases, 0)
  const totalRecordings = projects.reduce((sum, p) => sum + p.total_recordings, 0)
  const totalValid = projects.reduce((sum, p) => sum + p.valid_recordings, 0)
  const completion = totalPhrases > 0
    ? Math.round((totalValid / totalPhrases) * 100)
    : 0

  const filtered = useMemo(() => {
    const byFilter = projects.filter((p) => {
      if (filter === 'all') return true
      if (filter === 'archived') return p.status === 'archived' || p.status === 'completed'
      return p.status === 'active' || p.status === 'draft' || p.status === 'processing'
    })
    if (!search) return byFilter
    return byFilter.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
  }, [projects, filter, search])

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-10 flex items-center gap-2 px-5 lg:px-8 h-[52px] border-b border-[rgba(255,255,255,0.05)] bg-[rgba(8,9,10,0.9)] backdrop-blur-md">
        <div className="flex items-center gap-1.5">
          <FolderPlus className="w-[13px] h-[13px] text-[#8a8f98]" strokeWidth={1.75} />
          <span className="text-[13px] text-[#f7f8f8]" style={{ ...sans, fontWeight: 510 }}>
            Projets
          </span>
          <span className="text-[11px] text-[#62666d] ml-1" style={mono}>
            {projects.length}
          </span>
        </div>

        <div className="flex items-center gap-1 ml-4">
          {(['all', 'active', 'archived'] as const).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className="px-2.5 h-[26px] text-[12px] rounded-md transition-colors"
              style={{
                ...sans,
                fontWeight: 510,
                color: filter === k ? 'var(--t-fg)' : 'var(--t-fg-3)',
                background: filter === k ? 'rgba(255,255,255,0.05)' : 'transparent',
                border: `1px solid ${filter === k ? 'rgba(255,255,255,0.08)' : 'transparent'}`,
              }}
            >
              {k === 'all' ? 'Tous' : k === 'active' ? 'Actifs' : 'Archivés'}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-[13px] h-[13px] text-[#62666d] pointer-events-none" strokeWidth={1.75} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher…"
              className="h-[28px] pl-8 pr-3 text-[12px] text-[#f7f8f8] placeholder:text-[#62666d] rounded-md bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] focus:outline-none focus:border-[rgba(255,255,255,0.2)] w-[180px]"
              style={sans}
            />
          </div>
          {/* View toggle grille / liste */}
          <div
            className="inline-flex items-center rounded-md"
            style={{
              background: 'var(--t-surface)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <button
              onClick={() => setView('grid')}
              title="Vue grille"
              className="w-[26px] h-[26px] flex items-center justify-center rounded-md transition-colors"
              style={{
                color: viewMode === 'grid' ? 'var(--t-fg)' : 'var(--t-fg-3)',
                background: viewMode === 'grid' ? 'rgba(255,255,255,0.06)' : 'transparent',
              }}
            >
              <LayoutGrid className="w-[13px] h-[13px]" strokeWidth={1.75} />
            </button>
            <button
              onClick={() => setView('list')}
              title="Vue liste"
              className="w-[26px] h-[26px] flex items-center justify-center rounded-md transition-colors"
              style={{
                color: viewMode === 'list' ? 'var(--t-fg)' : 'var(--t-fg-3)',
                background: viewMode === 'list' ? 'rgba(255,255,255,0.06)' : 'transparent',
              }}
            >
              <ListIcon className="w-[13px] h-[13px]" strokeWidth={1.75} />
            </button>
          </div>
          <IconButton title="Filtres"><Filter className="w-[13px] h-[13px]" strokeWidth={1.75} /></IconButton>
          <IconButton title="Options"><MoreHorizontal className="w-[13px] h-[13px]" strokeWidth={1.75} /></IconButton>
          <Link
            to="/project/new"
            className="inline-flex items-center gap-1.5 h-[28px] px-3 text-[12px] bg-[#5e6ad2] hover:bg-[#6b77dd] text-white rounded-md transition-colors ml-1"
            style={{ ...sans, fontWeight: 510 }}
          >
            <Plus className="w-[13px] h-[13px]" strokeWidth={2} />
            Nouveau
          </Link>
        </div>
      </header>

      {/* Greeting + stats row (compact, façon Linear) */}
      <div className="px-5 lg:px-8 pt-7 pb-5">
        <h1
          className="text-[24px] text-[#f7f8f8] m-0"
          style={{ ...sans, fontWeight: 510, letterSpacing: '-0.3px' }}
        >
          Bonjour, {displayName || 'visiteur'}
        </h1>
        <p className="text-[13px] text-[#8a8f98] mt-1" style={sans}>
          {projects.length > 0
            ? `${projects.length} projet${projects.length > 1 ? 's' : ''} · ${totalRecordings.toLocaleString('fr-FR')} enregistrements collectés`
            : 'Prêt à créer votre premier dataset vocal'}
        </p>

        {/* Stats inline */}
        <div className="mt-5 flex items-center gap-6 flex-wrap">
          <Stat label="projets" value={String(projects.length)} />
          <StatSep />
          <Stat label="phrases" value={totalPhrases.toLocaleString('fr-FR')} />
          <StatSep />
          <Stat label="enregistrements" value={totalRecordings.toLocaleString('fr-FR')} />
          <StatSep />
          <Stat label="validés" value={totalValid.toLocaleString('fr-FR')} />
          <StatSep />
          <Stat label="complétion" value={`${completion}%`} />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-5 lg:mx-8 mb-4 px-3 py-2 rounded-md text-[12px] text-[#fca5a5] border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.06)]" style={sans}>
          {error}
        </div>
      )}

      {/* Section header */}
      <div className="flex items-center gap-2 px-5 lg:px-8 h-[36px] border-t border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.01)]">
        <ChevronDown className="w-3 h-3 text-[#8a8f98]" strokeWidth={2} />
        <span className="text-[12px] text-[#f7f8f8]" style={{ ...sans, fontWeight: 510 }}>
          {filter === 'archived' ? 'Archivés' : filter === 'active' ? 'Actifs' : 'Tous'}
        </span>
        <span className="text-[11px] text-[#62666d]" style={mono}>
          {filtered.length}
        </span>
        <Link
          to="/project/new"
          className="ml-auto w-[22px] h-[22px] flex items-center justify-center rounded-sm text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
          title="Nouveau projet"
        >
          <Plus className="w-[13px] h-[13px]" strokeWidth={2} />
        </Link>
      </div>

      {/* Liste projets */}
      {loading ? (
        viewMode === 'grid' ? (
          <div className="px-5 lg:px-8 py-5 grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3 sm:gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-[160px] rounded-[10px] animate-pulse"
                style={{
                  background: 'var(--t-surface)',
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
        <EmptyState hasProjects={projects.length > 0} />
      ) : viewMode === 'grid' ? (
        <div className="px-5 lg:px-8 py-5 grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3 sm:gap-4">
          {filtered.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      ) : (
        <div>
          {filtered.map((p) => (
            <ProjectRow key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ---------- Sub-components ---------- */

function IconButton({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <button
      title={title}
      className="w-[28px] h-[28px] flex items-center justify-center rounded-md text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
    >
      {children}
    </button>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span
        className="text-[15px] text-[#f7f8f8] tabular-nums"
        style={{ ...sans, fontWeight: 590 }}
      >
        {value}
      </span>
      <span className="text-[12px] text-[#62666d]" style={sans}>
        {label}
      </span>
    </div>
  )
}

function StatSep() {
  return <span className="w-px h-3 bg-[rgba(255,255,255,0.08)]" />
}

/* ---------- ProjectCard (vue grille, style Vercel minimal) ---------- */

function ProjectCard({ project }: { project: ProjectWithStats }) {
  const progress = project.total_phrases > 0
    ? Math.round((project.valid_recordings / project.total_phrases) * 100)
    : 0

  const code = `BAA-${project.id.slice(0, 4).toUpperCase()}`
  const dateFmt = new Date(project.created_at).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  })

  const statusCfg: Record<ProjectStatus, { Icon: typeof Circle; color: string; label: string }> = {
    draft: { Icon: CircleDashed, color: '#62666d', label: 'Brouillon' },
    active: { Icon: Circle, color: '#7170ff', label: 'Actif' },
    processing: { Icon: Clock, color: '#fbbf24', label: 'En traitement' },
    completed: { Icon: CircleCheck, color: '#10b981', label: 'Terminé' },
    archived: { Icon: Archive, color: '#62666d', label: 'Archivé' },
  }
  const s = statusCfg[project.status]

  return (
    <Link
      data-theme="dark"
      to={`/project/${project.id}`}
      className="group flex flex-col rounded-[10px] overflow-hidden transition-all"
      style={{
        background: '#0f1011',
        border: '1px solid rgba(255,255,255,0.08)',
        color: '#f7f8f8',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#141516'
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = '#0f1011'
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
      }}
    >
      {/* Preview zone : waveform statique + badge usage */}
      <div
        className="relative aspect-[5/2] overflow-hidden"
        style={{
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Waveform décorative statique — barres en gradient blanc→gris */}
        <StaticWaveform seed={project.id} />

        {/* Badge usage en haut-droite */}
        <span
          className="absolute top-2.5 right-2.5 inline-flex items-center px-1.5 h-[18px] rounded-sm text-[10px]"
          style={{
            ...sans,
            fontWeight: 510,
            color: '#d0d6e0',
            background: 'rgba(8,9,10,0.6)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(8px)',
          }}
        >
          {project.usage_type.toUpperCase()}
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
        {/* Titre + status */}
        <div className="flex items-start gap-2 min-w-0">
          <s.Icon className="w-3.5 h-3.5 shrink-0 mt-0.5" strokeWidth={2} style={{ color: s.color }} />
          <p
            className="text-[13px] text-[#f7f8f8] truncate flex-1 group-hover:text-white transition-colors"
            style={{ ...sans, fontWeight: 510, letterSpacing: '-0.1px' }}
            title={project.name}
          >
            {project.name}
          </p>
        </div>

        {/* Méta row */}
        <div className="flex items-center gap-1.5 text-[11px] text-[#8a8f98]" style={sans}>
          <span>{project.language_label ?? project.target_language}</span>
          <span className="text-[#3e3e44]">·</span>
          <span style={mono}>{dateFmt}</span>
        </div>

        {/* Progression */}
        {project.total_phrases > 0 ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-[3px] bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#f7f8f8] rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[10px] text-[#62666d] tabular-nums shrink-0" style={mono}>
              {project.valid_recordings}/{project.total_phrases}
            </span>
            <span className="text-[10px] text-[#d0d6e0] tabular-nums shrink-0" style={mono}>
              {progress}%
            </span>
          </div>
        ) : (
          <div className="text-[10px] text-[#62666d]" style={sans}>
            Aucune phrase
          </div>
        )}
      </div>
    </Link>
  )
}


function ProjectRow({ project }: { project: ProjectWithStats }) {
  const progress = project.total_phrases > 0
    ? Math.round((project.valid_recordings / project.total_phrases) * 100)
    : 0

  const code = `BAA-${project.id.slice(0, 4).toUpperCase()}`

  const dateFmt = new Date(project.created_at).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  })

  return (
    <Link
      to={`/project/${project.id}`}
      className="group flex items-center gap-3 h-[44px] px-5 lg:px-8 border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.025)] transition-colors"
    >
      {/* Code mono */}
      <span className="text-[11px] text-[#62666d] w-[70px] shrink-0" style={mono}>
        {code}
      </span>

      {/* Status icon */}
      <StatusIcon status={project.status} />

      {/* Nom */}
      <span
        className="flex-1 min-w-0 truncate text-[13px] text-[#f7f8f8] group-hover:text-white"
        style={{ ...sans, fontWeight: 510 }}
      >
        {project.name}
      </span>

      {/* Usage pill (asr/tts/both) */}
      <UsagePill usage={project.usage_type} />

      {/* Langue */}
      <span className="text-[11px] text-[#8a8f98] hidden md:inline" style={sans}>
        {project.language_label ?? project.target_language}
      </span>

      {/* Progression */}
      <span className="text-[11px] text-[#62666d] tabular-nums hidden sm:inline" style={mono}>
        {project.valid_recordings}/{project.total_phrases}
      </span>

      {/* Progress bar fine */}
      <div className="w-[60px] h-[3px] bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden hidden lg:block">
        <div
          className="h-full bg-[#f7f8f8] rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Date */}
      <span className="text-[11px] text-[#62666d] w-[48px] text-right" style={mono}>
        {dateFmt}
      </span>
    </Link>
  )
}

function StatusIcon({ status }: { status: ProjectStatus }) {
  const map: Record<ProjectStatus, { Icon: typeof Circle; color: string }> = {
    draft: { Icon: CircleDashed, color: '#62666d' },
    active: { Icon: Circle, color: 'var(--t-accent-text)' },
    processing: { Icon: Clock, color: 'var(--t-warning)' },
    completed: { Icon: CircleCheck, color: 'var(--t-success)' },
    archived: { Icon: Archive, color: '#62666d' },
  }
  const { Icon, color } = map[status]
  return <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={2} style={{ color }} />
}

function UsagePill({ usage }: { usage: ProjectUsageType }) {
  return (
    <span
      className="hidden sm:inline-flex items-center px-2 h-[20px] rounded-sm text-[10px] text-[#d0d6e0]"
      style={{
        ...sans,
        fontWeight: 510,
        background: 'var(--t-surface-active)',
        border: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {usage.toUpperCase()}
    </span>
  )
}

function EmptyState({ hasProjects }: { hasProjects: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
      <div
        className="w-14 h-14 rounded-[12px] flex items-center justify-center mb-5"
        style={{
          background:
            'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {hasProjects ? (
          <FileText className="w-6 h-6 text-[#8a8f98]" strokeWidth={1.5} />
        ) : (
          <Mic className="w-6 h-6 text-[#8a8f98]" strokeWidth={1.5} />
        )}
      </div>
      <h3
        className="text-[18px] text-[#f7f8f8] m-0"
        style={{ ...sans, fontWeight: 590, letterSpacing: '-0.2px' }}
      >
        {hasProjects ? 'Aucun résultat' : 'Votre premier dataset commence ici'}
      </h3>
      <p className="text-[13px] text-[#8a8f98] mt-2 max-w-[380px]" style={{ ...sans, lineHeight: 1.55 }}>
        {hasProjects
          ? 'Aucun projet ne correspond à votre recherche.'
          : 'Uploadez vos phrases, invitez des locuteurs et collectez des enregistrements de qualité pour vos modèles ASR/TTS.'}
      </p>
      {!hasProjects && (
        <Link
          to="/project/new"
          className="inline-flex items-center gap-1.5 h-[32px] px-3.5 text-[13px] bg-[#5e6ad2] hover:bg-[#6b77dd] text-white rounded-md mt-6 transition-colors"
          style={{ ...sans, fontWeight: 510 }}
        >
          <Plus className="w-[13px] h-[13px]" strokeWidth={2} />
          Créer mon premier projet
        </Link>
      )}
    </div>
  )
}
