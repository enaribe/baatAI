import { useMemo } from 'react'
import { CheckCircle2, Clock, Sparkles } from 'lucide-react'
import type { Subtopic } from '../types/database'
import { PROJECT_PHRASE_QUOTA } from '../lib/quotas'

const sans = { fontFamily: 'var(--font-body)', fontFeatureSettings: "'cv01','ss03'" }
const mono = { fontFamily: 'var(--font-mono)' }

const PROJECT_QUOTA = PROJECT_PHRASE_QUOTA

interface PhrasesQuotaBannerProps {
  subtopics: Subtopic[]
  validatedPhrasesCount: number
}

/**
 * Bandeau résumé en haut de la tab Phrases.
 * Affiche : phrases prêtes pour record, sous-thèmes en attente,
 * quota beta utilisé. Mini progress bar.
 *
 * Les subtopics sont fournis par le parent (project-page) qui hisse useSubtopics
 * pour éviter d'avoir un fetch + un channel Realtime dupliqué dans chaque enfant.
 */
export function PhrasesQuotaBanner({ subtopics, validatedPhrasesCount }: PhrasesQuotaBannerProps) {
  const stats = useMemo(() => {
    const todoCount = subtopics.filter(
      (s) => s.status === 'pending' || s.status === 'generating' || s.status === 'ready'
    ).length
    const totalPlanned = subtopics.reduce((s, st) => s + st.target_count, 0)
    return { todoCount, totalPlanned }
  }, [subtopics])

  // Cache si rien à afficher (projet vide sans subtopics ni phrases)
  if (subtopics.length === 0 && validatedPhrasesCount === 0) return null

  const quotaPct = Math.min(100, Math.round((stats.totalPlanned / PROJECT_QUOTA) * 100))

  return (
    <div
      className="flex items-stretch gap-3 p-3 rounded-md flex-wrap"
      style={{
        background: 'var(--t-surface)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <Stat
        icon={<CheckCircle2 className="w-4 h-4" strokeWidth={1.75} />}
        label="phrases validées"
        value={validatedPhrasesCount}
        color="#10b981"
        hint="prêtes pour les enregistrements"
      />
      <Divider />
      <Stat
        icon={<Clock className="w-4 h-4" strokeWidth={1.75} />}
        label="à valider"
        value={stats.todoCount}
        color="#7170ff"
        hint={stats.todoCount > 0 ? 'sous-thème(s) en attente' : 'tout est traité'}
      />
      <Divider />
      <div className="flex-1 min-w-[180px] flex flex-col gap-1.5 justify-center px-2">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] text-[#62666d] uppercase" style={{ ...sans, fontWeight: 510, letterSpacing: '0.04em' }}>
            <Sparkles className="w-3 h-3" strokeWidth={1.75} />
            Quota beta
          </span>
          <span className="text-[11px] text-[#d0d6e0] tabular-nums" style={mono}>
            {stats.totalPlanned.toLocaleString('fr-FR')} / {PROJECT_QUOTA.toLocaleString('fr-FR')}
          </span>
        </div>
        <div className="h-[3px] bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${quotaPct}%`,
              background: quotaPct > 90 ? '#fbbf24' : '#7170ff',
            }}
          />
        </div>
      </div>
    </div>
  )
}

interface StatProps {
  icon: React.ReactNode
  label: string
  value: number
  color: string
  hint?: string
}

function Stat({ icon, label, value, color, hint }: StatProps) {
  return (
    <div className="flex items-center gap-2.5 px-2">
      <span style={{ color }}>{icon}</span>
      <div className="flex flex-col gap-0.5">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[18px] tabular-nums" style={{ ...sans, fontWeight: 590, color: 'var(--t-fg)' }}>
            {value.toLocaleString('fr-FR')}
          </span>
          <span className="text-[11px] text-[#8a8f98]" style={sans}>
            {label}
          </span>
        </div>
        {hint && (
          <span className="text-[10px] text-[#62666d]" style={sans}>
            {hint}
          </span>
        )}
      </div>
    </div>
  )
}

function Divider() {
  return (
    <span
      className="hidden sm:block w-px shrink-0 my-1"
      style={{ background: 'rgba(255,255,255,0.06)' }}
    />
  )
}
