import { Loader2, Users, Star, MapPin, Trophy, MicVocal } from 'lucide-react'
import { useProjectTeam, type TeamMember } from '../../hooks/use-project-team'

interface TeamTabProps {
  projectId: string
}

function RosterCard({ member, totalPhrases, rank }: {
  member: TeamMember
  totalPhrases: number
  rank: number
}) {
  const progress = totalPhrases > 0
    ? Math.round((member.total_recorded / totalPhrases) * 100)
    : 0
  const validatedPct = member.total_recorded > 0
    ? Math.round((member.total_validated / member.total_recorded) * 100)
    : 0
  const initial = (member.full_name?.trim()[0] ?? '?').toUpperCase()
  const isTopThree = rank <= 3 && member.total_recorded > 0

  return (
    <div className="relative bg-white dark:bg-sand-900 rounded-2xl border border-sand-200/70 dark:border-sand-800/70 overflow-hidden animate-fade-in-up">
      {/* Rank ribbon */}
      {isTopThree && (
        <div className="absolute top-0 right-0 flex items-center gap-1 px-2.5 py-1 bg-primary-500 text-white text-[10px] font-bold rounded-bl-xl">
          <Trophy className="w-3 h-3" />
          #{rank}
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="relative shrink-0">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-secondary-400 to-secondary-600 flex items-center justify-center text-white text-base font-bold">
              {member.avatar_url
                ? <img src={member.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                : initial}
            </div>
            {member.is_certified && (
              <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-accent-500 flex items-center justify-center ring-2 ring-white dark:ring-sand-900">
                <Star className="w-2.5 h-2.5 text-white fill-white" />
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3
              className="text-[15px] font-extrabold text-sand-900 dark:text-sand-100 leading-tight truncate"
              style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.01em' }}
            >
              {member.full_name ?? 'Locuteur'}
            </h3>
            <div className="flex items-center gap-2 text-[11px] text-sand-500 mt-0.5 flex-wrap">
              {member.city && (
                <span className="inline-flex items-center gap-0.5">
                  <MapPin className="w-2.5 h-2.5" />
                  {member.city}
                </span>
              )}
              <span className="inline-flex items-center gap-0.5 text-secondary-600 dark:text-secondary-400 font-semibold">
                <span className="w-1 h-1 rounded-full bg-secondary-500" />
                {Math.round(member.reliability_score * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-2">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-sand-500 font-medium">Progression</span>
            <span className="tabular-nums font-bold text-sand-900 dark:text-sand-100">
              {member.total_recorded}<span className="text-sand-400">/{totalPhrases}</span>
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-sand-100 dark:bg-sand-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Stats inline */}
        <div className="flex items-center justify-between text-[11px] text-sand-500 mt-2.5 pt-2.5 border-t border-sand-100 dark:border-sand-800">
          <div className="flex items-center gap-1">
            <MicVocal className="w-3 h-3" />
            <span className="tabular-nums font-semibold text-sand-700 dark:text-sand-300">
              {member.total_validated}
            </span>
            <span>validés</span>
          </div>
          {member.total_recorded > 0 && (
            <span className={[
              'font-bold tabular-nums',
              validatedPct >= 80 ? 'text-secondary-600' : validatedPct >= 50 ? 'text-amber-600' : 'text-sand-500',
            ].join(' ')}>
              {validatedPct}% qualité
            </span>
          )}
          <span className={[
            'text-[10px] font-bold uppercase tracking-wider',
            member.session_status === 'completed' ? 'text-secondary-600' : 'text-primary-600',
          ].join(' ')}>
            {member.session_status === 'completed' ? 'Terminé' : 'En cours'}
          </span>
        </div>
      </div>
    </div>
  )
}

export function TeamTab({ projectId }: TeamTabProps) {
  const { members, totalPhrases, loading } = useProjectTeam(projectId)

  const sorted = [...members].sort((a, b) => b.total_recorded - a.total_recorded)

  const totalRecorded = members.reduce((s, m) => s + m.total_recorded, 0)
  const totalValidated = members.reduce((s, m) => s + m.total_validated, 0)
  const globalProgress = totalPhrases > 0 && members.length > 0
    ? Math.round((totalRecorded / (totalPhrases * members.length)) * 100)
    : 0

  return (
    <div>
      {/* Numérotation éditoriale */}
      <div className="flex items-end justify-between mb-5 pb-4 border-b border-sand-200/60 dark:border-sand-800">
        <div>
          <p
            className="text-[56px] leading-none font-extrabold text-sand-300/70 dark:text-sand-800/70 tabular-nums select-none"
            style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.05em' }}
            aria-hidden
          >
            03
          </p>
          <h2
            className="text-xl font-extrabold text-sand-900 dark:text-sand-100 -mt-2"
            style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}
          >
            Équipe
          </h2>
          <p className="text-xs text-sand-500 mt-1">
            Locuteurs actifs sur ce projet et leur avancement
          </p>
        </div>

        {members.length > 0 && (
          <div className="text-right">
            <div className="inline-flex items-center gap-1.5 text-xs text-sand-500">
              <Users className="w-3.5 h-3.5" />
              <span className="tabular-nums">
                <span className="font-bold text-sand-900 dark:text-sand-100">{members.length}</span> actifs
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Global stats */}
      {members.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-sand-50 dark:bg-sand-800/50 rounded-xl p-3 border border-sand-100 dark:border-sand-800">
            <p className="text-[10px] font-bold text-sand-400 uppercase tracking-wider mb-1">Enregistré</p>
            <p
              className="text-2xl font-extrabold text-sand-900 dark:text-sand-100 tabular-nums"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {totalRecorded}
            </p>
          </div>
          <div className="bg-secondary-50 dark:bg-secondary-900/20 rounded-xl p-3 border border-secondary-100 dark:border-secondary-900/40">
            <p className="text-[10px] font-bold text-secondary-600 uppercase tracking-wider mb-1">Validé</p>
            <p
              className="text-2xl font-extrabold text-secondary-700 dark:text-secondary-400 tabular-nums"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {totalValidated}
            </p>
          </div>
          <div className="bg-primary-50 dark:bg-primary-900/20 rounded-xl p-3 border border-primary-100 dark:border-primary-900/40">
            <p className="text-[10px] font-bold text-primary-600 uppercase tracking-wider mb-1">Avancement</p>
            <p
              className="text-2xl font-extrabold text-primary-700 dark:text-primary-400 tabular-nums"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {globalProgress}<span className="text-sm">%</span>
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-10 h-10 text-sand-300 mx-auto mb-3" />
          <p className="text-sand-500 font-semibold text-sm">Personne n'a encore rejoint</p>
          <p className="text-sand-400 text-xs mt-1">
            Les locuteurs ayant accepté une invitation apparaîtront ici
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sorted.map((m, i) => (
            <RosterCard key={m.session_id} member={m} totalPhrases={totalPhrases} rank={i + 1} />
          ))}
        </div>
      )}
    </div>
  )
}
