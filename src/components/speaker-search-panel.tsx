import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { getLanguageLabel, LANGUAGES } from '../lib/languages'
import { Search, UserCheck, UserPlus, Loader2, Filter, Star, MapPin } from 'lucide-react'
import type { SpeakerProfile, Profile, Gender } from '../types/database'

interface SpeakerWithProfile extends SpeakerProfile {
  profile: Pick<Profile, 'full_name'> | null
}

interface SpeakerSearchPanelProps {
  projectId: string
  projectLanguage: string
}

type InvitedMap = Record<string, 'sending' | 'sent' | 'error'>

const genderLabels: Record<Gender, string> = {
  male: 'Homme',
  female: 'Femme',
  other: 'Autre',
  prefer_not_to_say: 'Non précisé',
}

export function SpeakerSearchPanel({ projectId, projectLanguage }: SpeakerSearchPanelProps) {
  const [speakers, setSpeakers] = useState<SpeakerWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterLang, setFilterLang] = useState(projectLanguage)
  const [filterGender, setFilterGender] = useState('')
  const [filterCertified, setFilterCertified] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [invited, setInvited] = useState<InvitedMap>({})
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    type Row = SpeakerWithProfile
    const query = supabase
      .from('speaker_profiles')
      .select('*, profile:profiles(full_name)')
      .eq('verification_status', 'approved')
      .eq('is_available', true)
      .order('reliability_score', { ascending: false })

    const { data } = await (query as unknown as Promise<{ data: Row[] | null }>)
    setSpeakers(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = speakers.filter(sp => {
    const name = sp.profile?.full_name?.toLowerCase() ?? ''
    const matchSearch = !search || name.includes(search.toLowerCase()) || sp.city?.toLowerCase().includes(search.toLowerCase())
    const matchLang = !filterLang || sp.languages.includes(filterLang)
    const matchGender = !filterGender || sp.gender === filterGender
    const matchCert = !filterCertified || sp.is_certified
    return matchSearch && matchLang && matchGender && matchCert
  })

  const invite = async (speakerId: string) => {
    setInvited(m => ({ ...m, [speakerId]: 'sending' }))
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setInvited(m => ({ ...m, [speakerId]: 'error' })); return }

      const res = await fetch(`${supabaseUrl}/functions/v1/invite-speaker`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ project_id: projectId, speaker_id: speakerId, message: message || undefined }),
      })
      const json = await res.json() as { data?: unknown; error?: string }
      if (json.error) {
        setInvited(m => ({ ...m, [speakerId]: 'error' }))
      } else {
        setInvited(m => ({ ...m, [speakerId]: 'sent' }))
      }
    } catch {
      setInvited(m => ({ ...m, [speakerId]: 'error' }))
    }
  }

  return (
    <div className="space-y-5">
      {/* Barre de recherche */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Nom, ville…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-sand-200 dark:border-sand-700 bg-white dark:bg-sand-800 text-sand-900 dark:text-sand-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>
        <button
          onClick={() => setShowFilters(v => !v)}
          className={[
            'flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border text-sm font-semibold transition-all',
            showFilters
              ? 'bg-primary-50 border-primary-300 text-primary-700 dark:bg-primary-900/30 dark:border-primary-700 dark:text-primary-300'
              : 'border-sand-200 dark:border-sand-700 text-sand-600 dark:text-sand-400 hover:border-sand-300',
          ].join(' ')}
        >
          <Filter className="w-4 h-4" />
          Filtres
        </button>
      </div>

      {/* Filtres avancés */}
      {showFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-sand-50 dark:bg-sand-800/50 rounded-xl border border-sand-200 dark:border-sand-700">
          <div>
            <label className="block text-xs font-semibold text-sand-600 dark:text-sand-400 mb-1.5">Langue</label>
            <select
              value={filterLang}
              onChange={e => setFilterLang(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-sand-200 dark:border-sand-700 bg-white dark:bg-sand-800 text-sand-700 dark:text-sand-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            >
              <option value="">Toutes</option>
              {Object.entries(LANGUAGES).map(([code, lang]) => (
                <option key={code} value={code}>{lang.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-sand-600 dark:text-sand-400 mb-1.5">Genre</label>
            <select
              value={filterGender}
              onChange={e => setFilterGender(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-sand-200 dark:border-sand-700 bg-white dark:bg-sand-800 text-sand-700 dark:text-sand-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            >
              <option value="">Tous</option>
              <option value="male">Homme</option>
              <option value="female">Femme</option>
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filterCertified}
                onChange={e => setFilterCertified(e.target.checked)}
                className="w-4 h-4 accent-primary-500 rounded"
              />
              <span className="text-sm font-semibold text-sand-700 dark:text-sand-300 flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-accent-500" />
                Certifiés seulement
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Message optionnel */}
      <div>
        <label className="block text-xs font-semibold text-sand-600 dark:text-sand-400 mb-1.5">
          Message personnalisé <span className="font-normal text-sand-400">(optionnel, envoyé avec chaque invitation)</span>
        </label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={2}
          maxLength={300}
          placeholder="Ex : Bonjour, nous recherchons des locuteurs natifs Wolof pour un projet ASR…"
          className="w-full px-3 py-2.5 rounded-xl border border-sand-200 dark:border-sand-700 bg-white dark:bg-sand-800 text-sand-900 dark:text-sand-100 text-sm placeholder-sand-400 focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
        />
      </div>

      {/* Résultats */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <UserCheck className="w-10 h-10 text-sand-300 mx-auto mb-3" />
          <p className="text-sand-500 font-semibold text-sm">Aucun locuteur trouvé</p>
          <p className="text-sand-400 text-xs mt-1">Essayez de modifier les filtres</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-sand-500">{filtered.length} locuteur{filtered.length > 1 ? 's' : ''} disponible{filtered.length > 1 ? 's' : ''}</p>
          <div className="space-y-3">
            {filtered.map(sp => {
              const status = invited[sp.id]
              const reliabilityPct = Math.round(sp.reliability_score * 100)

              return (
                <div
                  key={sp.id}
                  className="flex items-start justify-between gap-4 bg-sand-50 dark:bg-sand-800/50 rounded-xl border border-sand-200/70 dark:border-sand-700/70 p-4"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-secondary-400 to-secondary-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {sp.profile?.full_name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-bold text-sand-900 dark:text-sand-100">
                          {sp.profile?.full_name ?? 'Locuteur'}
                        </p>
                        {sp.is_certified && (
                          <Star className="w-3.5 h-3.5 text-accent-500 fill-accent-500 shrink-0" aria-label="Certifié" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {sp.city && (
                          <span className="text-[11px] text-sand-400 flex items-center gap-0.5">
                            <MapPin className="w-2.5 h-2.5" />
                            {sp.city}
                          </span>
                        )}
                        {sp.gender && (
                          <span className="text-[11px] text-sand-400">{genderLabels[sp.gender]}</span>
                        )}
                        <span className="text-[11px] font-semibold text-secondary-600 dark:text-secondary-400">
                          {reliabilityPct}% fiabilité
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {sp.languages.map(lang => (
                          <span key={lang} className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300">
                            {getLanguageLabel(lang)}
                          </span>
                        ))}
                      </div>
                      <p className="text-[11px] text-sand-400 mt-1">
                        {sp.total_validated} enreg. validés
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => invite(sp.id)}
                    disabled={status === 'sending' || status === 'sent'}
                    className={[
                      'shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all',
                      status === 'sent'
                        ? 'bg-secondary-100 dark:bg-secondary-900/30 text-secondary-700 dark:text-secondary-300 border border-secondary-200 dark:border-secondary-700 cursor-default'
                        : status === 'error'
                          ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-700 hover:bg-red-100'
                          : 'bg-primary-500 hover:bg-primary-600 text-white shadow-md shadow-primary-500/20 hover:scale-[1.03] active:scale-[0.97] disabled:opacity-50',
                    ].join(' ')}
                  >
                    {status === 'sending' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : status === 'sent' ? (
                      <>
                        <UserCheck className="w-3.5 h-3.5" />
                        Invité
                      </>
                    ) : status === 'error' ? (
                      'Réessayer'
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        Inviter
                      </>
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
