import { Link } from 'react-router-dom'
import { Mic, FileText, CheckCircle2, ArrowUpRight } from 'lucide-react'
import { Badge } from './ui/badge'
import { ProgressBar } from './ui/progress-bar'
import type { ProjectStatus, ProjectUsageType } from '../types/database'

interface ProjectCardProps {
  id: string
  name: string
  description: string | null
  languageLabel: string | null
  targetLanguage: string
  usageType: ProjectUsageType
  status: ProjectStatus
  totalPhrases: number
  totalRecordings: number
  validRecordings: number
  createdAt: string
}

const statusLabels: Record<ProjectStatus, string> = {
  draft: 'Brouillon',
  active: 'Actif',
  processing: 'Traitement',
  completed: 'Terminé',
  archived: 'Archivé',
}

const statusVariants: Record<ProjectStatus, 'pending' | 'processing' | 'valid' | 'default'> = {
  draft: 'pending',
  active: 'processing',
  processing: 'processing',
  completed: 'valid',
  archived: 'default',
}

const usageVariants: Record<ProjectUsageType, 'asr' | 'tts' | 'both'> = {
  asr: 'asr',
  tts: 'tts',
  both: 'both',
}

// Couleur d'accent selon la langue pour donner de la personnalité
const languageAccents: Record<string, string> = {
  wol: 'from-primary-500/15 to-primary-600/5',
  fuc: 'from-secondary-500/15 to-secondary-600/5',
  srr: 'from-accent-500/15 to-accent-600/5',
  bam: 'from-amber-500/15 to-amber-600/5',
}

export function ProjectCard({
  id,
  name,
  description,
  languageLabel,
  targetLanguage,
  usageType,
  status,
  totalPhrases,
  totalRecordings,
  validRecordings,
  createdAt,
}: ProjectCardProps) {
  const dateStr = new Date(createdAt).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const accentGradient = languageAccents[targetLanguage] ?? 'from-primary-500/10 to-primary-600/5'
  const progressPct = totalPhrases > 0 ? Math.round((totalRecordings / totalPhrases) * 100) : 0

  return (
    <Link
      to={`/project/${id}`}
      className="group block relative overflow-hidden rounded-2xl bg-white dark:bg-sand-900 border border-sand-200/60 dark:border-sand-800 p-5 transition-all duration-250 ease-out hover:-translate-y-1 hover:shadow-lg hover:shadow-primary-500/10 hover:border-primary-200 dark:hover:border-sand-700"
    >
      {/* Background accent gradient */}
      <div className={`absolute top-0 left-0 right-0 h-24 bg-gradient-to-b ${accentGradient} pointer-events-none`} />

      {/* Header */}
      <div className="relative flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 pr-3">
          <h3
            className="text-base font-bold text-sand-900 dark:text-sand-100 leading-snug group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-200"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {name}
          </h3>
          {description && (
            <p className="text-xs text-sand-500 dark:text-sand-400 mt-0.5 line-clamp-1">{description}</p>
          )}
        </div>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-sand-100 dark:bg-sand-800 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30 transition-colors duration-200 shrink-0">
          <ArrowUpRight className="w-4 h-4 text-sand-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-200" />
        </div>
      </div>

      {/* Badges + langue */}
      <div className="relative flex flex-wrap items-center gap-1.5 mb-4">
        <Badge variant={usageVariants[usageType]}>{usageType.toUpperCase()}</Badge>
        <Badge variant={statusVariants[status]}>{statusLabels[status]}</Badge>
        <span className="text-[11px] font-semibold text-sand-400 dark:text-sand-500 uppercase tracking-wider ml-auto">
          {languageLabel || targetLanguage}
        </span>
      </div>

      {/* Progress */}
      <div className="relative mb-4">
        <ProgressBar
          value={totalRecordings}
          max={totalPhrases || 1}
          showPercentage={false}
          size="sm"
        />
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[11px] text-sand-400">Progression</span>
          <span className="text-[11px] font-bold text-primary-600 dark:text-primary-400 tabular-nums">{progressPct}%</span>
        </div>
      </div>

      {/* Stats footer */}
      <div className="relative flex items-center gap-3 pt-3 border-t border-sand-100 dark:border-sand-800">
        <span className="inline-flex items-center gap-1 text-[11px] text-sand-500 dark:text-sand-400">
          <FileText className="w-3 h-3" />
          <span className="font-semibold text-sand-700 dark:text-sand-300">{totalPhrases}</span>
          <span>ph.</span>
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] text-sand-500 dark:text-sand-400">
          <Mic className="w-3 h-3" />
          <span className="font-semibold text-sand-700 dark:text-sand-300">{totalRecordings}</span>
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] text-sand-500 dark:text-sand-400">
          <CheckCircle2 className="w-3 h-3 text-secondary-500" />
          <span className="font-semibold text-secondary-600 dark:text-secondary-400">{validRecordings}</span>
        </span>
        <span className="ml-auto text-[11px] text-sand-400">{dateStr}</span>
      </div>
    </Link>
  )
}
