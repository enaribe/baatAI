import { useAuth } from '../hooks/use-auth'
import { useSpeakerProfile } from '../hooks/use-speaker-profile'
import { useAvailableProjects } from '../hooks/use-available-projects'
import { Mic, ChevronRight, Loader2, Search, Mail, CheckCircle2, Globe } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { getLanguageLabel, LANGUAGES } from '../lib/languages'
import { supabase } from '../lib/supabase'
import type { AvailableProject } from '../types/database'

export function SpeakerProjectsPage() {
  const { user } = useAuth()
  const { profile } = useSpeakerProfile(user?.id)
  const isApproved = profile?.verification_status === 'approved'
  const { projects, loading } = useAvailableProjects(user?.id, isApproved)
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filterLang, setFilterLang] = useState('')

  const filtered = projects.filter(p => {
    const matchSearch = p.project_name.toLowerCase().includes(search.toLowerCase())
    const matchLang = !filterLang || p.target_language === filterLang
    return matchSearch && matchLang
  })

  const handleAccept = async (project: AvailableProject) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const res = await fetch(`${supabaseUrl}/functions/v1/accept-project`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        project_id: project.project_id,
        invitation_id: project.invitation_status ? undefined : undefined,
      }),
    })
    const json = await res.json() as { data?: { session_id: string }; error?: string }
    if (json.data?.session_id) {
      navigate(`/speaker/record/${json.data.session_id}`)
    }
  }

  if (!profile) {
    return (
      <div className="max-w-[42rem] mx-auto px-4 py-8 text-center">
        <p className="text-sand-500">Chargement du profil…</p>
      </div>
    )
  }

  return (
    <div className="max-w-[42rem] mx-auto px-4 py-8">
      <h1
        className="text-2xl font-extrabold text-sand-900 dark:text-sand-100 mb-6"
        style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}
      >
        Projets disponibles
      </h1>

      {/* Filtres */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un projet…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-sand-200 bg-white dark:bg-sand-900 text-sand-900 dark:text-sand-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
          />
        </div>
        <select
          value={filterLang}
          onChange={e => setFilterLang(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-sand-200 bg-white dark:bg-sand-900 text-sand-700 dark:text-sand-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
        >
          <option value="">Toutes les langues</option>
          {Object.entries(LANGUAGES).map(([code, lang]) => (
            <option key={code} value={code}>{lang.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Mic className="w-10 h-10 text-sand-300 mx-auto mb-3" />
          <p className="text-sand-500 font-semibold">Aucun projet trouvé</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(project => {
            const rateDisplay = project.rate_per_hour_fcfa > 0
              ? new Intl.NumberFormat('fr-SN').format(project.rate_per_hour_fcfa) + '\u00a0FCFA/h'
              : 'Bénévole'

            return (
              <div
                key={project.project_id}
                className="bg-white dark:bg-sand-900 rounded-2xl border border-sand-200/70 dark:border-sand-800/70 p-5"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sand-900 dark:text-sand-100 text-sm" style={{ fontFamily: 'var(--font-heading)' }}>
                      {project.project_name}
                    </p>
                    <p className="text-xs text-sand-500 mt-0.5">{getLanguageLabel(project.target_language)} · {project.phrase_count} phrases</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-base font-extrabold text-primary-600 tabular-nums" style={{ fontFamily: 'var(--font-heading)' }}>
                      {rateDisplay}
                    </span>
                    {project.invitation_status === 'accepted' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary-100 text-secondary-700">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        Acceptée
                      </span>
                    ) : project.invitation_status === 'pending' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                        <Mail className="w-2.5 h-2.5" />
                        Invitation
                      </span>
                    ) : project.is_public ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent-100 text-accent-700">
                        <Globe className="w-2.5 h-2.5" />
                        Public
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex gap-2">
                  {project.invitation_status === 'accepted' ? (
                    <button
                      onClick={() => handleAccept(project)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white text-sm font-bold shadow-md shadow-primary-500/20 hover:scale-[1.02] transition-all"
                    >
                      <Mic className="w-4 h-4" />
                      Continuer
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : project.invitation_status === 'pending' ? (
                    <Link
                      to="/speaker/invitations"
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-100 text-amber-800 text-sm font-bold hover:bg-amber-200 transition-all"
                    >
                      <Mail className="w-4 h-4" />
                      Voir l'invitation
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  ) : (
                    <button
                      onClick={() => handleAccept(project)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white text-sm font-bold shadow-md shadow-primary-500/20 hover:scale-[1.02] transition-all"
                    >
                      <Mic className="w-4 h-4" />
                      Commencer
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
