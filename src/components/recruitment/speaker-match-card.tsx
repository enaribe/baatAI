import { MapPin, Star, Check, Mic, Clock } from 'lucide-react'
import { MatchDisk } from './match-disk'
import { getLanguageLabel } from '../../lib/languages'
import type { MatchedSpeaker } from '../../hooks/use-match-speakers'

interface SpeakerMatchCardProps {
  speaker: MatchedSpeaker
  selected: boolean
  onToggleSelect: () => void
  onInvite: () => void
  inviting: boolean
  index: number
}

const genderLabel: Record<string, string> = {
  male: 'Homme',
  female: 'Femme',
  other: 'Autre',
  prefer_not_to_say: '—',
}

export function SpeakerMatchCard({
  speaker,
  selected,
  onToggleSelect,
  onInvite,
  inviting,
  index,
}: SpeakerMatchCardProps) {
  const initial = (speaker.full_name?.trim()[0] ?? '?').toUpperCase()
  const alreadyInvited = speaker.invitation_status === 'pending' || speaker.invitation_status === 'accepted'
  const canSelect = !alreadyInvited
  const validatedDisplay = new Intl.NumberFormat('fr-SN').format(speaker.total_validated)
  const reliabilityPct = Math.round(speaker.reliability_score * 100)

  return (
    <div
      className={[
        'group relative rounded-2xl border transition-all duration-200 animate-fade-in-up',
        selected
          ? 'border-primary-400 bg-primary-50/50 dark:bg-primary-900/15 shadow-[0_0_0_3px_rgb(249_115_22_/_0.08)]'
          : 'border-sand-200/70 dark:border-sand-800/70 bg-white dark:bg-sand-900 hover:border-sand-300 dark:hover:border-sand-700',
      ].join(' ')}
      style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}
    >
      {/* Selection strip (left edge) */}
      {canSelect && (
        <button
          onClick={onToggleSelect}
          aria-label={selected ? 'Désélectionner' : 'Sélectionner'}
          className={[
            'absolute left-0 top-0 bottom-0 w-6 flex items-center justify-center rounded-l-2xl transition-all',
            selected
              ? 'bg-primary-500 text-white'
              : 'bg-transparent text-transparent group-hover:bg-sand-100 group-hover:text-sand-400 dark:group-hover:bg-sand-800',
          ].join(' ')}
        >
          <Check className="w-3 h-3" strokeWidth={3} />
        </button>
      )}

      <div className={`flex items-center gap-4 py-4 pr-4 ${canSelect ? 'pl-9' : 'pl-4'}`}>
        {/* Avatar + match disk */}
        <div className="relative shrink-0">
          <MatchDisk score={speaker.match_score} size={56}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary-400 to-secondary-600 flex items-center justify-center text-white text-sm font-bold">
              {speaker.avatar_url
                ? <img src={speaker.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                : initial}
            </div>
          </MatchDisk>
          {speaker.is_certified && (
            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-accent-500 flex items-center justify-center ring-2 ring-white dark:ring-sand-900">
              <Star className="w-2.5 h-2.5 text-white fill-white" />
            </span>
          )}
        </div>

        {/* Infos */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2.5 flex-wrap">
            <h3
              className="text-[15px] font-extrabold text-sand-900 dark:text-sand-100 leading-tight truncate"
              style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.015em' }}
            >
              {speaker.full_name ?? 'Locuteur'}
            </h3>
            <span className="text-[11px] font-bold tabular-nums text-sand-400">
              {speaker.match_score}<span className="text-[9px] text-sand-300">/100</span>
            </span>
          </div>

          <div className="flex items-center gap-2.5 mt-1 flex-wrap text-[11px] text-sand-500">
            {speaker.city && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5" />
                {speaker.city}
              </span>
            )}
            {speaker.gender && <span>{genderLabel[speaker.gender] ?? speaker.gender}</span>}
            <span className="inline-flex items-center gap-1 font-semibold text-secondary-600 dark:text-secondary-400">
              <span className="w-1 h-1 rounded-full bg-secondary-500" />
              {reliabilityPct}% fiable
            </span>
            <span className="text-sand-400 tabular-nums">{validatedDisplay} validés</span>
          </div>

          <div className="flex flex-wrap gap-1 mt-2">
            {speaker.languages.slice(0, 4).map(lang => (
              <span
                key={lang}
                className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sand-100 dark:bg-sand-800 text-sand-700 dark:text-sand-300 tracking-wide"
              >
                {getLanguageLabel(lang)}
              </span>
            ))}
            {speaker.languages.length > 4 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sand-100 dark:bg-sand-800 text-sand-500">
                +{speaker.languages.length - 4}
              </span>
            )}
          </div>
        </div>

        {/* Action */}
        <div className="shrink-0">
          {alreadyInvited ? (
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-sand-500 px-3 py-1.5 rounded-full bg-sand-100 dark:bg-sand-800">
              {speaker.invitation_status === 'accepted' ? (
                <>
                  <Mic className="w-3 h-3 text-secondary-600" />
                  <span className="text-secondary-700">Inscrit</span>
                </>
              ) : (
                <>
                  <Clock className="w-3 h-3" />
                  En attente
                </>
              )}
            </div>
          ) : (
            <button
              onClick={onInvite}
              disabled={inviting}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary-500 text-white text-xs font-bold shadow-sm hover:bg-primary-600 active:scale-[0.97] transition-all disabled:opacity-50"
            >
              {inviting ? (
                <span className="inline-block w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : 'Inviter'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
