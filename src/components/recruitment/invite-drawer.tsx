import { useState, useMemo, useEffect } from 'react'
import {
  X, Search, Heart, Loader2, ShieldCheck, Star, MapPin, Check,
  UserPlus, Send, AlertTriangle,
} from 'lucide-react'
import { useMatchSpeakers, type MatchedSpeaker } from '../../hooks/use-match-speakers'
import { useToast } from '../../hooks/use-toast'
import { supabase } from '../../lib/supabase'
import { LANGUAGES } from '../../lib/languages'
import { SpeakerSamplePlayer } from '../speaker-sample-player'

const sans = { fontFamily: 'var(--font-body)', fontFeatureSettings: "'cv01','ss03'" }
const mono = { fontFamily: 'var(--font-mono)' }

interface InviteDrawerProps {
  projectId: string
  onClose: () => void
}

type TabKey = 'suggested' | 'favorites' | 'all'

export function InviteDrawer({ projectId, onClose }: InviteDrawerProps) {
  const { notify } = useToast()
  const [tab, setTab] = useState<TabKey>('suggested')
  const [search, setSearch] = useState('')
  const [certifiedOnly, setCertifiedOnly] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sending, setSending] = useState(false)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [closingAnim, setClosingAnim] = useState(false)

  // Escape fermer
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Charger les favoris du client
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await (supabase
        .from('client_favorite_speakers')
        .select('speaker_id')
        .eq('client_id', user.id) as unknown as Promise<{ data: { speaker_id: string }[] | null }>)
      if (data) setFavorites(new Set(data.map((f) => f.speaker_id)))
    })()
  }, [])

  const filters = useMemo(() => ({
    search: search || undefined,
    certifiedOnly,
  }), [search, certifiedOnly])

  const { speakers, loading, refetch, error } = useMatchSpeakers(projectId, filters)

  // Filtre selon le tab
  const displayed = useMemo(() => {
    if (tab === 'favorites') return speakers.filter((s) => favorites.has(s.speaker_id))
    if (tab === 'suggested') {
      // Favoris en haut, puis les non-invités triés par score
      const favs = speakers.filter((s) =>
        favorites.has(s.speaker_id) &&
        !['pending', 'accepted'].includes(s.invitation_status ?? ''),
      )
      const others = speakers.filter((s) =>
        !favorites.has(s.speaker_id) &&
        !['pending', 'accepted'].includes(s.invitation_status ?? ''),
      )
      return [...favs, ...others]
    }
    return speakers
  }, [speakers, favorites, tab])

  const selectable = displayed.filter(
    (s) => !['pending', 'accepted'].includes(s.invitation_status ?? ''),
  )

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => setSelected(new Set(selectable.map((s) => s.speaker_id)))
  const clearSelection = () => setSelected(new Set())

  const handleClose = () => {
    setClosingAnim(true)
    setTimeout(onClose, 180)
  }

  const sendInvitations = async () => {
    if (selected.size === 0) return
    setSending(true)
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setSending(false); return }

    const res = await fetch(`${supabaseUrl}/functions/v1/invite-speaker-bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      },
      body: JSON.stringify({
        project_id: projectId,
        speaker_ids: Array.from(selected),
      }),
    })
    const json = (await res.json()) as {
      data?: { total: number; sent: number; failed: number }
      error?: string
    }
    setSending(false)

    if (json.error) {
      notify({ variant: 'error', title: 'Échec', message: json.error })
      return
    }
    if (json.data) {
      const { sent, failed } = json.data
      if (failed === 0) {
        notify({ variant: 'success', message: `${sent} invitation${sent > 1 ? 's envoyées' : ' envoyée'}` })
      } else {
        notify({
          variant: 'warning',
          title: `${sent} envoyée${sent > 1 ? 's' : ''}`,
          message: `${failed} échec${failed > 1 ? 's' : ''} — certains locuteurs avaient déjà une invitation.`,
        })
      }
      clearSelection()
      await refetch()
      handleClose()
    }
  }

  const toggleFavorite = async (speakerId: string) => {
    const currentlyFav = favorites.has(speakerId)
    const next = new Set(favorites)
    if (currentlyFav) next.delete(speakerId)
    else next.add(speakerId)
    setFavorites(next)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (currentlyFav) {
      await (supabase
        .from('client_favorite_speakers')
        .delete()
        .eq('client_id', user.id)
        .eq('speaker_id', speakerId) as unknown as Promise<unknown>)
    } else {
      await (supabase
        .from('client_favorite_speakers')
        .insert({ client_id: user.id, speaker_id: speakerId } as never) as unknown as Promise<unknown>)
    }
  }

  const favoritesMatchingCount = speakers.filter(
    (s) => favorites.has(s.speaker_id) &&
      !['pending', 'accepted'].includes(s.invitation_status ?? ''),
  ).length

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 ${closingAnim ? 'animate-fade-out' : 'animate-fade-in'}`}
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={handleClose}
      />

      {/* Drawer */}
      <aside
        className={`fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[520px] flex flex-col ${
          closingAnim ? 'animate-slide-out-right' : 'animate-slide-in-right'
        }`}
        style={{
          background: 'var(--t-bg-panel)',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '-40px 0 80px -20px rgba(0,0,0,0.8)',
          animationDuration: '180ms',
        }}
      >
        {/* Header */}
        <header className="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.05)] shrink-0">
          <div>
            <h2
              className="text-[15px] text-[#f7f8f8] m-0"
              style={{ ...sans, fontWeight: 590 }}
            >
              Inviter des locuteurs
            </h2>
            <p className="text-[12px] text-[#8a8f98] mt-0.5" style={sans}>
              Locuteurs pré-filtrés par les critères du projet
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-[28px] h-[28px] flex items-center justify-center rounded-md text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
          >
            <X className="w-3.5 h-3.5" strokeWidth={1.75} />
          </button>
        </header>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-5 py-3 border-b border-[rgba(255,255,255,0.05)] shrink-0">
          <DrawerTab
            active={tab === 'suggested'}
            onClick={() => setTab('suggested')}
          >
            Suggérés
          </DrawerTab>
          <DrawerTab
            active={tab === 'favorites'}
            onClick={() => setTab('favorites')}
            icon={<Heart className="w-3 h-3" strokeWidth={1.75} />}
            count={favoritesMatchingCount}
          >
            Favoris
          </DrawerTab>
          <DrawerTab
            active={tab === 'all'}
            onClick={() => setTab('all')}
          >
            Tous
          </DrawerTab>
        </div>

        {/* Search + filter */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-[rgba(255,255,255,0.05)] shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-[13px] h-[13px] text-[#62666d] pointer-events-none" strokeWidth={1.75} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nom ou ville…"
              className="w-full h-[28px] pl-8 pr-3 text-[12px] text-[#f7f8f8] placeholder:text-[#62666d] rounded-md bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] focus:outline-none focus:border-[rgba(255,255,255,0.2)]"
              style={sans}
            />
          </div>
          <label
            className="inline-flex items-center gap-1.5 h-[28px] px-2.5 text-[12px] rounded-md cursor-pointer transition-colors"
            style={{
              ...sans,
              fontWeight: 510,
              color: certifiedOnly ? 'var(--t-success)' : 'var(--t-fg-3)',
              background: certifiedOnly ? 'var(--t-success-muted-bg)' : 'var(--t-surface)',
              border: `1px solid ${certifiedOnly ? 'var(--t-success-muted-border)' : 'rgba(255,255,255,0.08)'}`,
            }}
          >
            <input
              type="checkbox"
              checked={certifiedOnly}
              onChange={(e) => setCertifiedOnly(e.target.checked)}
              className="hidden"
            />
            <ShieldCheck className="w-3 h-3" strokeWidth={1.75} />
            Certifiés
          </label>
        </div>

        {/* Actions sélection */}
        {selectable.length > 0 && (
          <div className="flex items-center justify-between px-5 py-2 border-b border-[rgba(255,255,255,0.05)] shrink-0">
            <button
              onClick={selected.size === selectable.length ? clearSelection : selectAll}
              className="text-[12px] text-[#7170ff] hover:text-[#828fff] transition-colors"
              style={{ ...sans, fontWeight: 510 }}
            >
              {selected.size === selectable.length
                ? 'Tout désélectionner'
                : `Sélectionner les ${selectable.length} disponibles`}
            </button>
            {selected.size > 0 && (
              <span className="text-[11px] text-[#62666d] tabular-nums" style={mono}>
                {selected.size}/{selectable.length}
              </span>
            )}
          </div>
        )}

        {error && (
          <div className="mx-5 my-3 flex items-start gap-2 px-3 py-2.5 rounded-md text-[12px] text-[#fca5a5] border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.06)]" style={sans}>
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Liste */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-4 h-4 animate-spin text-[#8a8f98]" />
            </div>
          ) : displayed.length === 0 ? (
            <EmptyState tab={tab} />
          ) : (
            <div>
              {displayed.map((s) => (
                <SpeakerRow
                  key={s.speaker_id}
                  speaker={s}
                  checked={selected.has(s.speaker_id)}
                  isFavorite={favorites.has(s.speaker_id)}
                  onToggle={() => toggleSelect(s.speaker_id)}
                  onToggleFav={() => toggleFavorite(s.speaker_id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer sticky */}
        <footer className="flex items-center justify-between gap-3 px-5 py-3 border-t border-[rgba(255,255,255,0.05)] shrink-0"
          style={{ background: 'var(--t-bg-panel)' }}
        >
          <div className="flex items-center gap-2 text-[12px]" style={sans}>
            <UserPlus className="w-3 h-3 text-[#8a8f98]" strokeWidth={1.75} />
            <span className="text-[#8a8f98]">
              {selected.size === 0
                ? 'Aucun sélectionné'
                : `${selected.size} sélectionné${selected.size > 1 ? 's' : ''}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              className="h-[30px] px-3 text-[12px] text-[#d0d6e0] hover:bg-[rgba(255,255,255,0.04)] rounded-md transition-colors"
              style={{ ...sans, fontWeight: 510 }}
            >
              Annuler
            </button>
            <button
              onClick={sendInvitations}
              disabled={selected.size === 0 || sending}
              className="inline-flex items-center gap-1.5 h-[30px] px-3 text-[12px] rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                ...sans,
                fontWeight: 510,
                color: '#ffffff',
                background: '#5e6ad2',
              }}
            >
              {sending
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <Send className="w-3 h-3" strokeWidth={1.75} />}
              {sending ? 'Envoi…' : 'Envoyer les invitations'}
            </button>
          </div>
        </footer>
      </aside>
    </>
  )
}

/* ---------- DrawerTab ---------- */

function DrawerTab({
  active, onClick, children, icon, count,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  icon?: React.ReactNode
  count?: number
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 h-[28px] px-2.5 text-[12px] rounded-md transition-colors"
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

/* ---------- SpeakerRow ---------- */

function SpeakerRow({
  speaker, checked, isFavorite, onToggle, onToggleFav,
}: {
  speaker: MatchedSpeaker
  checked: boolean
  isFavorite: boolean
  onToggle: () => void
  onToggleFav: () => void
}) {
  const initials = (speaker.full_name ?? '?')
    .split(' ').slice(0, 2).map((n) => n[0] ?? '').join('').toUpperCase() || '?'

  const isPending = speaker.invitation_status === 'pending'
  const isAccepted = speaker.invitation_status === 'accepted'
  const isDisabled = isPending || isAccepted

  const reliability = Math.round(speaker.reliability_score * 100)

  return (
    <button
      onClick={isDisabled ? undefined : onToggle}
      disabled={isDisabled}
      className="w-full flex items-center gap-3 px-5 py-3 text-left border-b border-[rgba(255,255,255,0.04)] transition-colors disabled:cursor-not-allowed"
      style={{
        background: checked
          ? 'var(--t-accent-muted-bg)'
          : isDisabled
            ? 'rgba(255,255,255,0.01)'
            : 'transparent',
        opacity: isDisabled ? 0.5 : 1,
      }}
      onMouseEnter={(e) => {
        if (!isDisabled && !checked) e.currentTarget.style.background = 'rgba(255,255,255,0.025)'
      }}
      onMouseLeave={(e) => {
        if (!isDisabled && !checked) e.currentTarget.style.background = 'transparent'
      }}
    >
      {/* Checkbox */}
      <span
        className="w-[16px] h-[16px] rounded-sm flex items-center justify-center shrink-0"
        style={{
          background: checked ? '#5e6ad2' : 'transparent',
          border: `1.5px solid ${checked ? '#5e6ad2' : 'rgba(255,255,255,0.2)'}`,
        }}
      >
        {checked && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
      </span>

      {/* Avatar */}
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] shrink-0"
        style={{ background: 'var(--t-fg-5)', color: 'var(--t-fg)', ...sans, fontWeight: 590 }}
      >
        {speaker.avatar_url
          ? <img src={speaker.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
          : initials}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span
            className="text-[13px] text-[#f7f8f8] truncate"
            style={{ ...sans, fontWeight: 510 }}
          >
            {speaker.full_name ?? '—'}
          </span>
          {speaker.is_certified && (
            <ShieldCheck className="w-3 h-3 text-[#10b981] shrink-0" strokeWidth={2} />
          )}
          {isFavorite && !isDisabled && (
            <Heart
              className="w-3 h-3 shrink-0"
              strokeWidth={1.75}
              style={{ color: 'var(--t-danger)', fill: 'var(--t-danger)' }}
            />
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-[#8a8f98] mt-0.5" style={sans}>
          {speaker.city && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5" strokeWidth={1.75} />
              {speaker.city}
            </span>
          )}
          <span className="truncate">
            {speaker.languages.slice(0, 2).map((c) => LANGUAGES[c]?.label ?? c).join(', ')}
          </span>
        </div>
      </div>

      {/* Sample player inline */}
      {speaker.sample_storage_path && (
        <SpeakerSamplePlayer
          storagePath={speaker.sample_storage_path}
          durationSeconds={speaker.sample_duration_seconds}
          variant="inline"
        />
      )}

      {/* Match score */}
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        <span
          className="inline-flex items-center gap-1 text-[11px] tabular-nums"
          style={{ ...sans, fontWeight: 510, color: '#d0d6e0' }}
        >
          <Star className="w-2.5 h-2.5 text-[#fbbf24]" strokeWidth={2} />
          {reliability}%
        </span>
        {isPending && (
          <span className="text-[10px] text-[#fbbf24]" style={{ ...sans, fontWeight: 510 }}>
            Déjà invité
          </span>
        )}
        {isAccepted && (
          <span className="text-[10px] text-[#10b981]" style={{ ...sans, fontWeight: 510 }}>
            Déjà accepté
          </span>
        )}
      </div>

      {/* Bouton favori hover */}
      {!isDisabled && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFav() }}
          className="w-[24px] h-[24px] flex items-center justify-center rounded-md transition-colors shrink-0 hover:bg-[rgba(255,255,255,0.04)]"
          title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          <Heart
            className="w-3 h-3"
            strokeWidth={1.75}
            style={{
              color: isFavorite ? 'var(--t-danger)' : '#62666d',
              fill: isFavorite ? 'var(--t-danger)' : 'none',
            }}
          />
        </button>
      )}
    </button>
  )
}

function EmptyState({ tab }: { tab: TabKey }) {
  const text = tab === 'favorites'
    ? 'Aucun favori ne correspond à ce projet.'
    : 'Aucun locuteur ne correspond aux critères de ce projet.'

  return (
    <div className="flex flex-col items-center justify-center py-12 px-8 text-center">
      <p className="text-[13px] text-[#8a8f98] max-w-[360px]" style={{ ...sans, lineHeight: 1.55 }}>
        {text}
      </p>
    </div>
  )
}
