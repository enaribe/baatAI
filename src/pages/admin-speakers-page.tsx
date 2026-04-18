import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Loader2, Check, X, User, AlertCircle } from 'lucide-react'
import type { SpeakerProfile, Profile } from '../types/database'
import { getLanguageLabel } from '../lib/languages'

interface SpeakerWithProfile extends SpeakerProfile {
  profile: Pick<Profile, 'full_name'> | null
}

export function AdminSpeakersPage() {
  const [speakers, setSpeakers] = useState<SpeakerWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending')

  const load = async () => {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('speaker_profiles')
      .select('*, profile:profiles(full_name)')
      .eq('verification_status', filter)
      .order('created_at', { ascending: false })
    if (err) setError(err.message)
    setSpeakers((data as SpeakerWithProfile[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [filter]) // eslint-disable-line react-hooks/exhaustive-deps

  type DbResult = Promise<{ error: { message: string } | null }>

  const approve = async (id: string) => {
    setProcessing(id)
    const { error: err } = await (supabase
      .from('speaker_profiles')
      .update({ verification_status: 'approved' } as unknown as never)
      .eq('id', id) as unknown as DbResult)
    if (err) { setError(err.message); setProcessing(null); return }
    await load()
    setProcessing(null)
  }

  const reject = async (id: string) => {
    setProcessing(id)
    const { error: err } = await (supabase
      .from('speaker_profiles')
      .update({ verification_status: 'rejected' } as unknown as never)
      .eq('id', id) as unknown as DbResult)
    if (err) { setError(err.message); setProcessing(null); return }
    await load()
    setProcessing(null)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1
        className="text-2xl font-extrabold text-sand-900 dark:text-sand-100 mb-6"
        style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}
      >
        Gestion des locuteurs
      </h1>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Filtre */}
      <div className="flex gap-2 mb-6">
        {(['pending', 'approved', 'rejected'] as const).map(s => {
          const labels = { pending: 'En attente', approved: 'Approuvés', rejected: 'Rejetés' }
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={[
                'px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                filter === s
                  ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20'
                  : 'bg-white dark:bg-sand-900 border border-sand-200 dark:border-sand-700 text-sand-600 dark:text-sand-400 hover:border-sand-300',
              ].join(' ')}
            >
              {labels[s]}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
        </div>
      ) : speakers.length === 0 ? (
        <div className="text-center py-16">
          <User className="w-10 h-10 text-sand-300 mx-auto mb-3" />
          <p className="text-sand-500 font-semibold">Aucun locuteur dans cette catégorie</p>
        </div>
      ) : (
        <div className="space-y-3">
          {speakers.map(sp => (
            <div
              key={sp.id}
              className="bg-white dark:bg-sand-900 rounded-2xl border border-sand-200/70 dark:border-sand-800/70 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {sp.profile?.full_name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-sand-900 dark:text-sand-100">{sp.profile?.full_name ?? 'Inconnu'}</p>
                      <p className="text-xs text-sand-500">{sp.city ?? '—'} · {sp.country}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {sp.languages.map(lang => (
                      <span key={lang} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-100 text-primary-700">
                        {getLanguageLabel(lang)}
                      </span>
                    ))}
                    {sp.gender && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sand-100 text-sand-600">
                        {sp.gender === 'male' ? 'Homme' : sp.gender === 'female' ? 'Femme' : sp.gender}
                      </span>
                    )}
                  </div>

                  {sp.bio && (
                    <p className="text-xs text-sand-500 mt-2 line-clamp-2 leading-relaxed">{sp.bio}</p>
                  )}

                  <p className="text-[11px] text-sand-400 mt-2">
                    Inscrit le {new Date(sp.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>

                {filter === 'pending' && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => reject(sp.id)}
                      disabled={processing === sp.id}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 transition-all disabled:opacity-40"
                    >
                      {processing === sp.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                      Rejeter
                    </button>
                    <button
                      onClick={() => approve(sp.id)}
                      disabled={processing === sp.id}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary-500 text-white text-xs font-semibold hover:bg-secondary-600 transition-all disabled:opacity-40"
                    >
                      {processing === sp.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      Approuver
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
