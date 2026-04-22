import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Users, Search, Filter, ChevronDown, Star, Heart,
  LayoutGrid, List as ListIcon, ShieldCheck, Loader2, MapPin,
  ChevronRight,
} from 'lucide-react'
import { useSpeakers, type SpeakerListItem } from '../hooks/use-speakers'
import { LANGUAGES } from '../lib/languages'
import { StaticWaveform } from '../components/ui/static-waveform'
import { SpeakerSamplePlayer } from '../components/speaker-sample-player'

const sans = { fontFamily: 'var(--font-body)', fontFeatureSettings: "'cv01','ss03'" }
const mono = { fontFamily: 'var(--font-mono)' }

type ViewMode = 'grid' | 'list'
type FilterTab = 'all' | 'favorites' | 'certified' | 'recent'

export function SpeakersPage() {
  const [search, setSearch] = useState('')
  const [lang, setLang] = useState('')
  const [gender, setGender] = useState('')
  const [tab, setTab] = useState<FilterTab>('all')
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return 'grid'
    return (localStorage.getItem('baat-speakers-view') as ViewMode) || 'grid'
  })
  const setView = (v: ViewMode) => {
    setViewMode(v)
    localStorage.setItem('baat-speakers-view', v)
  }

  const filters = useMemo(() => ({
    search: search || undefined,
    lang: lang || undefined,
    gender: gender || undefined,
    certifiedOnly: tab === 'certified',
    favoritesOnly: tab === 'favorites',
  }), [search, lang, gender, tab])

  const { speakers, loading, error, toggleFavorite } = useSpeakers(filters)

  const displayed = useMemo(() => {
    if (tab === 'recent') {
      return [...speakers].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
    }
    return speakers
  }, [speakers, tab])

  const favoritesCount = speakers.filter((s) => s.is_favorite).length
  const certifiedCount = speakers.filter((s) => s.is_certified).length

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-10 flex items-center gap-3 px-5 lg:px-8 h-[52px] border-b border-[rgba(255,255,255,0.05)] bg-[rgba(8,9,10,0.9)] backdrop-blur-md">
        <Users className="w-[13px] h-[13px] text-[#8a8f98]" strokeWidth={1.75} />
        <span className="text-[13px] text-[#f7f8f8]" style={{ ...sans, fontWeight: 510 }}>
          Locuteurs
        </span>
        <span className="text-[11px] text-[#62666d] ml-1" style={mono}>
          {speakers.length}
        </span>

        {/* Tabs */}
        <div className="flex items-center gap-1 ml-4 overflow-x-auto">
          <Tab active={tab === 'all'} onClick={() => setTab('all')}>
            Tous
          </Tab>
          <Tab
            active={tab === 'favorites'}
            onClick={() => setTab('favorites')}
            count={tab === 'favorites' ? undefined : favoritesCount}
            icon={<Heart className="w-3 h-3" strokeWidth={1.75} />}
          >
            Favoris
          </Tab>
          <Tab
            active={tab === 'certified'}
            onClick={() => setTab('certified')}
            count={tab === 'certified' ? undefined : certifiedCount}
            icon={<ShieldCheck className="w-3 h-3" strokeWidth={1.75} />}
          >
            Certifiés
          </Tab>
          <Tab active={tab === 'recent'} onClick={() => setTab('recent')}>
            Récents
          </Tab>
        </div>

        <div className="ml-auto">
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
            placeholder="Rechercher par nom ou ville…"
            className="w-full h-[28px] pl-8 pr-3 text-[12px] text-[#f7f8f8] placeholder:text-[#62666d] rounded-md bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] focus:outline-none focus:border-[rgba(255,255,255,0.2)]"
            style={sans}
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto">
          <FilterPill active={!lang} onClick={() => setLang('')}>
            Toutes langues
          </FilterPill>
          {Object.entries(LANGUAGES).slice(0, 4).map(([code, l]) => (
            <FilterPill
              key={code}
              active={lang === code}
              onClick={() => setLang(lang === code ? '' : code)}
            >
              {l.label}
            </FilterPill>
          ))}
        </div>

        <div className="flex items-center gap-1 overflow-x-auto">
          <FilterPill active={!gender} onClick={() => setGender('')}>
            Tous
          </FilterPill>
          <FilterPill
            active={gender === 'male'}
            onClick={() => setGender(gender === 'male' ? '' : 'male')}
          >
            Homme
          </FilterPill>
          <FilterPill
            active={gender === 'female'}
            onClick={() => setGender(gender === 'female' ? '' : 'female')}
          >
            Femme
          </FilterPill>
        </div>

        <button className="ml-auto w-[28px] h-[28px] flex items-center justify-center rounded-md text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[rgba(255,255,255,0.04)] transition-colors">
          <Filter className="w-[13px] h-[13px]" strokeWidth={1.75} />
        </button>
      </div>

      {error && (
        <div
          className="mx-5 lg:mx-8 my-3 flex items-start gap-2 px-3 py-2.5 rounded-md text-[12px] text-[#fca5a5] border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.06)]"
          style={sans}
        >
          {error}
        </div>
      )}

      {/* Section header */}
      <div className="flex items-center gap-2 px-5 lg:px-8 h-[36px] border-t border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.01)]">
        <ChevronDown className="w-3 h-3 text-[#8a8f98]" strokeWidth={2} />
        <span className="text-[12px] text-[#f7f8f8]" style={{ ...sans, fontWeight: 510 }}>
          {tab === 'favorites'
            ? 'Favoris'
            : tab === 'certified'
              ? 'Certifiés'
              : tab === 'recent'
                ? 'Récents'
                : 'Tous les locuteurs'}
        </span>
        <span className="text-[11px] text-[#62666d]" style={mono}>
          {displayed.length}
        </span>
      </div>

      {/* Liste */}
      {loading ? (
        viewMode === 'grid' ? (
          <div className="px-5 lg:px-8 py-5 grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3 sm:gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-[200px] rounded-[10px] animate-pulse"
                style={{
                  background: 'var(--t-surface)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              />
            ))}
          </div>
        ) : (
          <div className="p-5 lg:px-8">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-[48px] mb-1 rounded-sm animate-pulse bg-[rgba(255,255,255,0.02)]" />
            ))}
          </div>
        )
      ) : displayed.length === 0 ? (
        <EmptyState tab={tab} />
      ) : viewMode === 'grid' ? (
        <div className="px-5 lg:px-8 py-5 grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3 sm:gap-4">
          {displayed.map((s) => (
            <SpeakerCard
              key={s.speaker_id}
              speaker={s}
              onToggleFavorite={() => toggleFavorite(s.speaker_id, s.is_favorite)}
            />
          ))}
        </div>
      ) : (
        <div>
          {displayed.map((s) => (
            <SpeakerRow
              key={s.speaker_id}
              speaker={s}
              onToggleFavorite={() => toggleFavorite(s.speaker_id, s.is_favorite)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ---------- Sub-components ---------- */

function Tab({
  active, onClick, children, count, icon,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  count?: number
  icon?: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2.5 h-[26px] text-[12px] rounded-md transition-colors whitespace-nowrap"
      style={{
        ...sans,
        fontWeight: 510,
        color: active ? 'var(--t-fg)' : 'var(--t-fg-3)',
        background: active ? 'rgba(255,255,255,0.05)' : 'transparent',
        border: `1px solid ${active ? 'rgba(255,255,255,0.08)' : 'transparent'}`,
      }}
    >
      {icon}
      {children}
      {count !== undefined && count > 0 && (
        <span className="text-[10px] text-[#62666d] tabular-nums" style={mono}>
          {count}
        </span>
      )}
    </button>
  )
}

function FilterPill({
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
        color: active ? 'var(--t-fg)' : 'var(--t-fg-3)',
        background: active ? 'rgba(255,255,255,0.05)' : 'transparent',
        border: `1px solid ${active ? 'rgba(255,255,255,0.08)' : 'transparent'}`,
      }}
    >
      {children}
    </button>
  )
}

function ViewToggle({ mode, onChange }: { mode: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <div
      className="inline-flex items-center rounded-md"
      style={{
        background: 'var(--t-surface)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <button
        onClick={() => onChange('grid')}
        title="Vue grille"
        className="w-[26px] h-[26px] flex items-center justify-center rounded-md transition-colors"
        style={{
          color: mode === 'grid' ? 'var(--t-fg)' : 'var(--t-fg-3)',
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
          color: mode === 'list' ? 'var(--t-fg)' : 'var(--t-fg-3)',
          background: mode === 'list' ? 'rgba(255,255,255,0.06)' : 'transparent',
        }}
      >
        <ListIcon className="w-[13px] h-[13px]" strokeWidth={1.75} />
      </button>
    </div>
  )
}

/* ---------- SpeakerCard (grille) ---------- */

function SpeakerCard({
  speaker, onToggleFavorite,
}: {
  speaker: SpeakerListItem
  onToggleFavorite: () => void
}) {
  const initials = (speaker.full_name ?? '?')
    .split(' ').slice(0, 2).map((n) => n[0] ?? '').join('').toUpperCase() || '?'

  const languagesDisplay = speaker.languages
    .map((code) => LANGUAGES[code]?.label ?? code)
    .slice(0, 3)
    .join(', ')

  const reliability = Math.round(speaker.reliability_score * 100)

  return (
    <Link
      data-theme="dark"
      to={`/speakers/${speaker.speaker_id}`}
      className="group relative flex flex-col rounded-[10px] overflow-hidden transition-all"
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
      {/* Preview */}
      <div
        className="relative aspect-[5/2] overflow-hidden"
        style={{
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <StaticWaveform seed={speaker.speaker_id} />

        {/* Avatar en haut-gauche */}
        <div
          className="absolute top-2.5 left-2.5 w-8 h-8 rounded-full flex items-center justify-center text-[11px]"
          style={{
            background: '#3e3e44',
            color: '#f7f8f8',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(8px)',
            ...sans,
            fontWeight: 590,
          }}
        >
          {speaker.avatar_url
            ? <img src={speaker.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
            : initials}
        </div>

        {/* Badges haut-droite (certifié + sample + favori) */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
          {speaker.is_certified && (
            <span
              className="inline-flex items-center gap-1 px-1.5 h-[20px] rounded-full text-[10px]"
              style={{
                ...sans,
                fontWeight: 510,
                color: '#10b981',
                background: 'rgba(8,9,10,0.7)',
                border: '1px solid rgba(16,185,129,0.35)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <ShieldCheck className="w-2.5 h-2.5" strokeWidth={2} />
              Certifié
            </span>
          )}
          {speaker.sample_storage_path && (
            <SpeakerSamplePlayer
              storagePath={speaker.sample_storage_path}
              durationSeconds={speaker.sample_duration_seconds}
              variant="inline"
            />
          )}
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite() }}
            className="w-[22px] h-[22px] flex items-center justify-center rounded-full transition-colors"
            style={{
              background: 'rgba(8,9,10,0.7)',
              border: `1px solid ${speaker.is_favorite ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.08)'}`,
              backdropFilter: 'blur(8px)',
            }}
            title={speaker.is_favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            aria-label="Favori"
          >
            <Heart
              className="w-3 h-3"
              strokeWidth={1.75}
              style={{
                color: speaker.is_favorite ? '#ef4444' : '#8a8f98',
                fill: speaker.is_favorite ? '#ef4444' : 'none',
              }}
            />
          </button>
        </div>
      </div>

      {/* Contenu */}
      <div className="flex flex-col gap-2 p-3.5">
        <div className="flex items-start gap-2 min-w-0">
          <p
            className="text-[13px] text-[#f7f8f8] truncate flex-1 group-hover:text-white transition-colors"
            style={{ ...sans, fontWeight: 510, letterSpacing: '-0.1px' }}
            title={speaker.full_name ?? ''}
          >
            {speaker.full_name ?? '—'}
          </p>
        </div>

        {/* Méta ville + genre */}
        {(speaker.city || speaker.gender) && (
          <div className="flex items-center gap-1.5 text-[11px] text-[#8a8f98]" style={sans}>
            {speaker.city && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5" strokeWidth={1.75} />
                {speaker.city}
              </span>
            )}
            {speaker.city && speaker.gender && <span className="text-[#3e3e44]">·</span>}
            {speaker.gender && (
              <span>
                {speaker.gender === 'male' ? 'Homme'
                  : speaker.gender === 'female' ? 'Femme'
                  : speaker.gender === 'other' ? 'Autre' : '—'}
              </span>
            )}
          </div>
        )}

        {/* Langues */}
        {languagesDisplay && (
          <p className="text-[11px] text-[#d0d6e0] truncate" style={sans}>
            {languagesDisplay}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-3 pt-1 border-t border-[rgba(255,255,255,0.05)]">
          <StatCompact value={String(speaker.total_validated)} label="validés" />
          <span className="w-px h-3 bg-[rgba(255,255,255,0.08)]" />
          <StatCompact
            value={`${reliability}%`}
            label="fiabilité"
            icon={<Star className="w-2.5 h-2.5 text-[#fbbf24]" strokeWidth={2} />}
          />
        </div>
      </div>
    </Link>
  )
}

function StatCompact({
  value, label, icon,
}: {
  value: string
  label: string
  icon?: React.ReactNode
}) {
  return (
    <div className="flex items-baseline gap-1">
      {icon && <span className="self-center">{icon}</span>}
      <span className="text-[12px] text-[#f7f8f8] tabular-nums" style={{ ...sans, fontWeight: 590 }}>
        {value}
      </span>
      <span className="text-[10px] text-[#62666d]" style={sans}>
        {label}
      </span>
    </div>
  )
}

/* ---------- SpeakerRow (liste) ---------- */

function SpeakerRow({
  speaker, onToggleFavorite,
}: {
  speaker: SpeakerListItem
  onToggleFavorite: () => void
}) {
  const initials = (speaker.full_name ?? '?')
    .split(' ').slice(0, 2).map((n) => n[0] ?? '').join('').toUpperCase() || '?'

  const reliability = Math.round(speaker.reliability_score * 100)

  return (
    <Link
      to={`/speakers/${speaker.speaker_id}`}
      className="group flex items-center gap-3 h-[48px] px-5 lg:px-8 border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.025)] transition-colors"
    >
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] shrink-0"
        style={{ background: 'var(--t-fg-5)', color: 'var(--t-fg)', ...sans, fontWeight: 590 }}
      >
        {speaker.avatar_url
          ? <img src={speaker.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
          : initials}
      </div>
      <span
        className="flex-1 min-w-0 truncate text-[13px] text-[#f7f8f8]"
        style={{ ...sans, fontWeight: 510 }}
      >
        {speaker.full_name ?? '—'}
      </span>
      <span className="text-[11px] text-[#8a8f98] hidden md:inline" style={sans}>
        {speaker.city ?? '—'}
      </span>
      <span className="text-[11px] text-[#d0d6e0] hidden md:inline truncate max-w-[200px]" style={sans}>
        {speaker.languages.slice(0, 3).map((c) => LANGUAGES[c]?.label ?? c).join(', ')}
      </span>
      <span className="text-[11px] text-[#62666d] tabular-nums hidden sm:inline" style={mono}>
        {speaker.total_validated} validés
      </span>
      <span className="inline-flex items-center gap-1 text-[11px] text-[#d0d6e0] tabular-nums" style={mono}>
        <Star className="w-3 h-3 text-[#fbbf24]" strokeWidth={2} />
        {reliability}%
      </span>
      {speaker.is_certified && (
        <ShieldCheck className="w-3.5 h-3.5 text-[#10b981] shrink-0" strokeWidth={2} />
      )}
      {speaker.sample_storage_path && (
        <SpeakerSamplePlayer
          storagePath={speaker.sample_storage_path}
          durationSeconds={speaker.sample_duration_seconds}
          variant="inline"
        />
      )}
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite() }}
        className="w-[26px] h-[26px] flex items-center justify-center rounded-md transition-colors"
        aria-label="Favori"
        title={speaker.is_favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      >
        <Heart
          className="w-3.5 h-3.5"
          strokeWidth={1.75}
          style={{
            color: speaker.is_favorite ? 'var(--t-danger)' : '#62666d',
            fill: speaker.is_favorite ? 'var(--t-danger)' : 'none',
          }}
        />
      </button>
      <ChevronRight className="w-3.5 h-3.5 text-[#62666d] group-hover:text-[#f7f8f8] group-hover:translate-x-0.5 transition-all" strokeWidth={1.75} />
    </Link>
  )
}

function EmptyState({ tab }: { tab: FilterTab }) {
  const text = tab === 'favorites'
    ? "Vous n'avez pas encore de favoris. Ajoutez des locuteurs en cliquant sur le cœur."
    : tab === 'certified'
      ? 'Aucun locuteur certifié ne correspond à ces filtres.'
      : 'Aucun locuteur ne correspond à ces filtres.'

  const Icon = tab === 'favorites' ? Heart : Users

  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
      <div
        className="w-12 h-12 rounded-[10px] flex items-center justify-center mb-5"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Icon className="w-5 h-5 text-[#8a8f98]" strokeWidth={1.5} />
      </div>
      <p className="text-[13px] text-[#8a8f98] max-w-[400px]" style={{ ...sans, lineHeight: 1.55 }}>
        {text}
      </p>
    </div>
  )
}

/* unused import guard */
void Loader2
