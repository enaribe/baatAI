import { useState, useMemo } from 'react'
import { Search, Filter, Loader2, UserSearch, Users, Star, AlertTriangle } from 'lucide-react'
import { useMatchSpeakers } from '../../hooks/use-match-speakers'
import { useToast } from '../../hooks/use-toast'
import { supabase } from '../../lib/supabase'
import { SpeakerMatchCard } from './speaker-match-card'
import { BulkActionBar } from './bulk-action-bar'

interface DiscoverTabProps {
  projectId: string
}

export function DiscoverTab({ projectId }: DiscoverTabProps) {
  const { notify } = useToast()
  const [search, setSearch] = useState('')
  const [gender, setGender] = useState('')
  const [certifiedOnly, setCertifiedOnly] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [individualSending, setIndividualSending] = useState<string | null>(null)
  const [bulkSending, setBulkSending] = useState(false)

  const filters = useMemo(() => ({
    search: search || undefined,
    gender: gender || undefined,
    certifiedOnly,
  }), [search, gender, certifiedOnly])

  const { speakers, loading, refetch, error, rawSpeakersCount } = useMatchSpeakers(projectId, filters)

  const selectableSpeakers = speakers.filter(
    s => !s.invitation_status || (s.invitation_status !== 'pending' && s.invitation_status !== 'accepted'),
  )

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    setSelected(new Set(selectableSpeakers.map(s => s.speaker_id)))
  }

  const clearSelection = () => setSelected(new Set())

  const inviteOne = async (speakerId: string) => {
    setIndividualSending(speakerId)
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setIndividualSending(null)
      return
    }

    console.group('[inviteOne] POST /invite-speaker')
    console.info('projectId:', projectId)
    console.info('speakerId:', speakerId)
    console.info('session user id:', session.user.id)
    console.info('session user metadata.role:', session.user.user_metadata?.role)
    console.info('token (10 premiers car.):', session.access_token.slice(0, 10) + '…')

    const res = await fetch(`${supabaseUrl}/functions/v1/invite-speaker`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      },
      body: JSON.stringify({ project_id: projectId, speaker_id: speakerId }),
    })
    const rawText = await res.text()
    console.info('response status:', res.status)
    console.info('response body (raw):', rawText)
    console.groupEnd()

    let json: { data?: unknown; error?: string } = {}
    try { json = JSON.parse(rawText) } catch { /* body non JSON */ }

    setIndividualSending(null)

    if (json.error || !res.ok) {
      notify({
        variant: 'error',
        title: `Échec (HTTP ${res.status})`,
        message: json.error || rawText || 'Erreur inconnue',
      })
    } else {
      notify({ variant: 'success', message: 'Invitation envoyée' })
      await refetch()
    }
  }

  const inviteBulk = async (message: string) => {
    if (selected.size === 0) return
    setBulkSending(true)

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setBulkSending(false)
      return
    }

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
        message: message || undefined,
      }),
    })
    const json = await res.json() as {
      data?: { total: number; sent: number; failed: number }
      error?: string
    }
    setBulkSending(false)

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
    }
  }

  return (
    <div className="relative">
      {/* Numérotation éditoriale */}
      <div className="flex items-end justify-between mb-5 pb-4 border-b border-sand-200/60 dark:border-sand-800">
        <div>
          <p
            className="text-[56px] leading-none font-extrabold text-sand-300/70 dark:text-sand-800/70 tabular-nums select-none"
            style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.05em' }}
            aria-hidden
          >
            01
          </p>
          <h2
            className="text-xl font-extrabold text-sand-900 dark:text-sand-100 -mt-2"
            style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}
          >
            Découvrir
          </h2>
          <p className="text-xs text-sand-500 mt-1">
            Locuteurs approuvés triés par correspondance avec ce projet
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-sand-500">
          <Users className="w-3.5 h-3.5" />
          <span className="tabular-nums">
            <span className="font-bold text-sand-900 dark:text-sand-100">{speakers.length}</span> trouvés
          </span>
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Nom ou ville…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-sand-200 dark:border-sand-700 bg-white dark:bg-sand-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
          />
        </div>
        <button
          onClick={() => setShowFilters(v => !v)}
          className={[
            'flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border text-sm font-semibold transition-all',
            showFilters
              ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-300 text-primary-700 dark:text-primary-400'
              : 'bg-white dark:bg-sand-900 border-sand-200 dark:border-sand-700 text-sand-600 dark:text-sand-400 hover:border-sand-300',
          ].join(' ')}
        >
          <Filter className="w-3.5 h-3.5" />
          Filtres
        </button>
      </div>

      {showFilters && (
        <div className="grid grid-cols-2 gap-3 mb-4 animate-fade-in">
          <select
            value={gender}
            onChange={e => setGender(e.target.value)}
            className="px-3 py-2 rounded-xl border border-sand-200 dark:border-sand-700 bg-white dark:bg-sand-900 text-sm"
          >
            <option value="">Tous genres</option>
            <option value="male">Homme</option>
            <option value="female">Femme</option>
          </select>
          <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-sand-200 dark:border-sand-700 bg-white dark:bg-sand-900 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={certifiedOnly}
              onChange={e => setCertifiedOnly(e.target.checked)}
              className="accent-primary-500"
            />
            <Star className="w-3.5 h-3.5 text-accent-500 fill-accent-500" />
            <span>Certifiés seulement</span>
          </label>
        </div>
      )}

      {/* Actions sélection */}
      {selectableSpeakers.length > 0 && (
        <div className="flex items-center justify-between text-xs text-sand-500 mb-3">
          <button
            onClick={selected.size === selectableSpeakers.length ? clearSelection : selectAll}
            className="font-semibold text-primary-600 hover:text-primary-700 transition-colors"
          >
            {selected.size === selectableSpeakers.length
              ? 'Désélectionner tout'
              : `Sélectionner les ${selectableSpeakers.length} disponibles`}
          </button>
          {selected.size > 0 && (
            <span className="tabular-nums">
              {selected.size} / {selectableSpeakers.length}
            </span>
          )}
        </div>
      )}

      {/* Erreur RPC (diagnostic) */}
      {error && (
        <div className="mb-4 flex items-start gap-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-bold mb-1">Erreur RPC match_speakers_for_project</p>
            <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed">{error}</pre>
          </div>
        </div>
      )}

      {/* Diagnostic : comptage brut vs résultat */}
      {!loading && !error && (
        <div className="mb-4 flex items-center justify-between gap-2 bg-sand-50 dark:bg-sand-800/40 border border-sand-200/60 dark:border-sand-700/60 px-3 py-2 rounded-lg text-[11px] text-sand-500">
          <span>
            Diagnostic :
            <span className="font-bold text-sand-700 dark:text-sand-300 ml-1 tabular-nums">
              {rawSpeakersCount ?? '?'}
            </span> locuteur(s) disponible(s) en base ·
            <span className="font-bold text-sand-700 dark:text-sand-300 ml-1 tabular-nums">
              {speakers.length}
            </span> après matching projet
          </span>
        </div>
      )}

      {/* Liste */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
        </div>
      ) : speakers.length === 0 ? (
        <div className="text-center py-12">
          <UserSearch className="w-10 h-10 text-sand-300 mx-auto mb-3" />
          <p className="text-sand-500 font-semibold text-sm">Aucun locuteur ne correspond</p>
          <p className="text-sand-400 text-xs mt-1">
            {rawSpeakersCount === 0
              ? 'Aucun locuteur n\'est encore inscrit sur la plateforme.'
              : rawSpeakersCount && rawSpeakersCount > 0
                ? `${rawSpeakersCount} locuteur(s) existent mais ne matchent pas ce projet (langues, genre, âge…). Vérifiez les critères du projet.`
                : 'Essayez de modifier les filtres.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5 pb-24">
          {speakers.map((sp, i) => (
            <SpeakerMatchCard
              key={sp.speaker_id}
              speaker={sp}
              selected={selected.has(sp.speaker_id)}
              onToggleSelect={() => toggleSelect(sp.speaker_id)}
              onInvite={() => inviteOne(sp.speaker_id)}
              inviting={individualSending === sp.speaker_id}
              index={i}
            />
          ))}
        </div>
      )}

      <BulkActionBar
        selectedCount={selected.size}
        onClear={clearSelection}
        onSend={inviteBulk}
        sending={bulkSending}
      />
    </div>
  )
}
