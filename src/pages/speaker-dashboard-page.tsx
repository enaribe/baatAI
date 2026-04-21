import { useAuth } from '../hooks/use-auth'
import { useSpeakerProfile } from '../hooks/use-speaker-profile'
import { useSpeakerActiveProjects, type ActiveSpeakerProject } from '../hooks/use-speaker-active-projects'
import { useSpeakerInvitations } from '../hooks/use-speaker-invitations'
import { useCountUp } from '../hooks/use-count-up'
import { Mic, TrendingUp, Clock, Star, ChevronRight, Zap, Play, Compass } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getLanguageLabel } from '../lib/languages'

function ActiveProjectCard({ project }: { project: ActiveSpeakerProject }) {
  const rateDisplay = project.rate_per_hour_fcfa > 0
    ? new Intl.NumberFormat('fr-SN').format(project.rate_per_hour_fcfa) + ' FCFA/h'
    : 'Bénévole'

  const progress = project.total_phrases > 0
    ? Math.min(100, Math.round((project.recorded_phrases / project.total_phrases) * 100))
    : 0

  return (
    <Link
      to={`/speaker/record/${project.session_id}`}
      className="block bg-white dark:bg-sand-900 rounded-2xl border border-sand-200/70 dark:border-sand-800/70 p-5 hover:shadow-lg hover:shadow-sand-900/8 hover:-translate-y-0.5 transition-all duration-200 group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <p
            className="font-bold text-sand-900 dark:text-sand-100 text-sm leading-snug truncate"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {project.project_name}
          </p>
          <p className="text-xs text-sand-500 mt-0.5">
            {getLanguageLabel(project.target_language)}
          </p>
        </div>
        <span className="inline-flex items-center gap-1 shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary-100 text-secondary-700">
          <Play className="w-2.5 h-2.5 fill-secondary-700" />
          En cours
        </span>
      </div>

      {/* Progression */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-sand-600 dark:text-sand-400 tabular-nums">
            {project.recorded_phrases} / {project.total_phrases} phrases
          </span>
          <span className="text-[11px] font-bold text-secondary-700 dark:text-secondary-400 tabular-nums">
            {progress}%
          </span>
        </div>
        <div className="h-1.5 bg-sand-100 dark:bg-sand-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-secondary-400 to-secondary-600 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-sand-500">{rateDisplay}</span>
        <span className="inline-flex items-center gap-1 text-xs font-bold text-primary-600 dark:text-primary-400 group-hover:gap-1.5 transition-all">
          Reprendre
          <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </Link>
  )
}

export function SpeakerDashboardPage() {
  const { user } = useAuth()
  const { profile } = useSpeakerProfile(user?.id)
  const { projects: activeProjects, loading: projectsLoading } = useSpeakerActiveProjects(user?.id)
  const { invitations } = useSpeakerInvitations(user?.id)

  const balance = useCountUp(profile?.wallet_balance_fcfa ?? 0)
  const totalValidated = useCountUp(profile?.total_validated ?? 0)
  const reliabilityPct = useCountUp(Math.round((profile?.reliability_score ?? 1) * 100))

  const pendingInvitations = invitations.filter(i => i.status === 'pending')
  const firstName = (user?.user_metadata?.full_name as string | undefined)?.split(' ')[0] ?? 'Locuteur'

  return (
    <div className="max-w-[42rem] mx-auto px-4 py-8">
      {/* Greeting */}
      <div className="mb-6">
        <h1
          className="text-2xl font-extrabold text-sand-900 dark:text-sand-100"
          style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}
        >
          Bonjour, {firstName} 👋
        </h1>
        <p className="text-sand-500 text-sm mt-0.5">Prêt à enregistrer aujourd'hui ?</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-7">
        <div className="bg-white dark:bg-sand-900 rounded-2xl border border-sand-200/70 dark:border-sand-800/70 p-4 text-center">
          <div className="w-8 h-8 rounded-xl bg-secondary-100 flex items-center justify-center mx-auto mb-2">
            <TrendingUp className="w-4 h-4 text-secondary-600" />
          </div>
          <p className="text-lg font-extrabold text-sand-900 dark:text-sand-100 tabular-nums" style={{ fontFamily: 'var(--font-heading)' }}>
            {new Intl.NumberFormat('fr-SN').format(balance)}
          </p>
          <p className="text-[10px] font-semibold text-sand-400 uppercase tracking-wide mt-0.5">FCFA</p>
        </div>

        <div className="bg-white dark:bg-sand-900 rounded-2xl border border-sand-200/70 dark:border-sand-800/70 p-4 text-center">
          <div className="w-8 h-8 rounded-xl bg-primary-100 flex items-center justify-center mx-auto mb-2">
            <Mic className="w-4 h-4 text-primary-600" />
          </div>
          <p className="text-lg font-extrabold text-sand-900 dark:text-sand-100 tabular-nums" style={{ fontFamily: 'var(--font-heading)' }}>
            {totalValidated}
          </p>
          <p className="text-[10px] font-semibold text-sand-400 uppercase tracking-wide mt-0.5">Validés</p>
        </div>

        <div className="bg-white dark:bg-sand-900 rounded-2xl border border-sand-200/70 dark:border-sand-800/70 p-4 text-center">
          <div className="w-8 h-8 rounded-xl bg-accent-100 flex items-center justify-center mx-auto mb-2">
            <Star className="w-4 h-4 text-accent-600" />
          </div>
          <p className="text-lg font-extrabold text-sand-900 dark:text-sand-100 tabular-nums" style={{ fontFamily: 'var(--font-heading)' }}>
            {reliabilityPct}%
          </p>
          <p className="text-[10px] font-semibold text-sand-400 uppercase tracking-wide mt-0.5">Fiabilité</p>
        </div>
      </div>

      {/* Invitations en attente */}
      {pendingInvitations.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-600" />
              <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
                {pendingInvitations.length} invitation{pendingInvitations.length > 1 ? 's' : ''} en attente
              </p>
            </div>
            <Link to="/speaker/invitations" className="text-xs font-semibold text-amber-700 hover:text-amber-900 transition-colors">
              Voir tout →
            </Link>
          </div>
          {pendingInvitations.slice(0, 2).map(inv => (
            <div key={inv.id} className="flex items-center justify-between py-2 border-t border-amber-200/60">
              <div>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">{inv.project?.name}</p>
                <p className="text-xs text-amber-600">{inv.project?.language_label}</p>
              </div>
              {inv.project?.rate_per_hour_fcfa && inv.project.rate_per_hour_fcfa > 0 && (
                <span className="text-sm font-bold text-amber-800 tabular-nums">
                  {new Intl.NumberFormat('fr-SN').format(inv.project.rate_per_hour_fcfa)} FCFA/h
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Projets en cours du locuteur */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2
            className="text-base font-bold text-sand-800 dark:text-sand-200"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Mes projets en cours
          </h2>
          <Link
            to="/speaker/projects"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors"
          >
            <Compass className="w-3.5 h-3.5" />
            Découvrir
          </Link>
        </div>

        {projectsLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="bg-sand-100 dark:bg-sand-800 rounded-2xl h-28 animate-pulse" />
            ))}
          </div>
        ) : activeProjects.length === 0 ? (
          <div className="bg-white dark:bg-sand-900 rounded-2xl border border-sand-200/70 dark:border-sand-800/70 p-8 text-center">
            <Clock className="w-8 h-8 text-sand-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-sand-500">Aucun projet en cours</p>
            <p className="text-xs text-sand-400 mt-1 mb-4">
              Parcourez les projets disponibles pour commencer
            </p>
            <Link
              to="/speaker/projects"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold shadow-sm transition-colors"
            >
              <Compass className="w-3.5 h-3.5" />
              Voir les projets disponibles
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {activeProjects.map(p => (
              <ActiveProjectCard key={p.session_id} project={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
