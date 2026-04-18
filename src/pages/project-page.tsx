import { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText, Users, Mic, Package, Loader2, ChevronRight, Trash2, AlertTriangle } from 'lucide-react'
import { useProject } from '../hooks/use-project'
import { useRealtimeRecordings } from '../hooks/use-realtime-recordings'
import { useToast } from '../hooks/use-toast'
import { translateRejectReasons } from '../lib/qc-translations'
import { supabase } from '../lib/supabase'
import { Badge } from '../components/ui/badge'
import { ProgressBar } from '../components/ui/progress-bar'
import { Skeleton } from '../components/ui/skeleton'
import { Button } from '../components/ui/button'
import { StatCard } from '../components/stat-card'
import { PhraseList } from '../components/phrase-list'
import { SessionList } from '../components/session-list'
import { RecordingList } from '../components/recording-list'
import { ExportPanel } from '../components/export-panel'
import type { ProjectStatus, ProjectUsageType } from '../types/database'

type Tab = 'phrases' | 'sessions' | 'recordings' | 'exports'

const tabs: { key: Tab; label: string; icon: typeof FileText }[] = [
  { key: 'phrases', label: 'Phrases', icon: FileText },
  { key: 'sessions', label: 'Sessions', icon: Users },
  { key: 'recordings', label: 'Enregistrements', icon: Mic },
  { key: 'exports', label: 'Exports', icon: Package },
]

const statusLabels: Record<ProjectStatus, string> = {
  draft: 'Brouillon',
  active: 'Actif',
  processing: 'En traitement',
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

export function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { project, phrases, sessions, recordings, exports, loading, error, refetch } = useProject(id)
  const [activeTab, setActiveTab] = useState<Tab>('phrases')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const handleDelete = useCallback(async () => {
    if (!project) return
    setDeleting(true)
    setDeleteError('')
    try {
      const { error: deleteErr } = await supabase
        .from('projects')
        .delete()
        .eq('id', project.id)
      if (deleteErr) throw deleteErr
      navigate('/dashboard')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la suppression'
      setDeleteError(message)
      console.error('Delete project error:', err)
    } finally {
      setDeleting(false)
    }
  }, [project, navigate])

  const { notify } = useToast()

  const handleRecordingUpdate = useCallback(
    (recording: Parameters<NonNullable<Parameters<typeof useRealtimeRecordings>[0]['onUpdate']>>[0]) => {
      refetch()
      if (recording.processing_status === 'failed') {
        notify({
          variant: 'error',
          title: 'Échec du traitement',
          message: 'Un enregistrement n\'a pas pu être analysé. Consultez l\'onglet Enregistrements.',
        })
      } else if (recording.processing_status === 'completed' && recording.is_valid === false) {
        const reasons = translateRejectReasons(recording.rejection_reasons).join(', ') || 'critères QC non atteints'
        notify({
          variant: 'warning',
          title: 'Enregistrement rejeté',
          message: `Raison : ${reasons}.`,
        })
      }
    },
    [refetch, notify],
  )

  useRealtimeRecordings({
    projectId: id,
    onInsert: useCallback(() => refetch(), [refetch]),
    onUpdate: handleRecordingUpdate,
  })

  if (loading) {
    return (
      <div className="p-5 sm:p-6 lg:p-8 max-w-[76rem]">
        <Skeleton className="h-5 w-32 mb-6" />
        <Skeleton className="h-10 w-64 mb-2" />
        <Skeleton className="h-4 w-96 mb-8" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[112px] rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="p-5 sm:p-6 lg:p-8 max-w-[76rem]">
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-1.5 text-sm text-sand-500 hover:text-sand-700 dark:text-sand-400 dark:hover:text-sand-200 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
          {error || 'Projet introuvable'}
        </div>
      </div>
    )
  }

  const totalPhrases = phrases.length
  const totalRecordings = recordings.length
  const validRecordings = recordings.filter((r) => r.is_valid === true).length
  const activeSessions = sessions.filter((s) => s.status === 'active' || s.status === 'pending').length
  // Progression = phrases uniques couvertes par au moins 1 enregistrement valide
  const coveredPhraseIds = new Set(
    recordings.filter((r) => r.is_valid === true).map((r) => r.phrase_id)
  )
  const coveredPhrases = coveredPhraseIds.size
  const progressPct = totalPhrases > 0 ? Math.round((coveredPhrases / totalPhrases) * 100) : 0

  const dateStr = new Date(project.created_at).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="p-5 sm:p-6 lg:p-8 max-w-[76rem]">
      {/* Breadcrumb */}
      <button
        onClick={() => navigate('/dashboard')}
        className="inline-flex items-center gap-1.5 text-sm text-sand-400 hover:text-sand-700 dark:hover:text-sand-200 transition-colors mb-5 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-200" />
        Dashboard
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-sand-600 dark:text-sand-300 font-medium">{project.name}</span>
      </button>

      {/* Project header — banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sand-900 to-sand-950 dark:from-sand-900 dark:to-sand-950 p-6 sm:p-8 mb-6 border border-sand-800">
        <div className="absolute inset-0 wax-pattern opacity-[0.04] pointer-events-none" />
        <div
          className="absolute top-0 right-0 w-56 h-56 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.15) 0%, transparent 70%)' }}
        />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge variant={usageVariants[project.usage_type]}>{project.usage_type.toUpperCase()}</Badge>
            <Badge variant={statusVariants[project.status]}>{statusLabels[project.status]}</Badge>
            <span className="text-[11px] font-semibold text-sand-400 uppercase tracking-widest ml-1">
              {project.language_label || project.target_language}
            </span>
          </div>
          <h1
            className="text-sand-100 mb-2"
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(1.5rem, 3vw, 2.25rem)',
              fontWeight: 800,
              lineHeight: 1.0,
              letterSpacing: '-0.03em',
            }}
          >
            {project.name}
          </h1>
          {project.description && (
            <p className="text-sand-400 text-sm mb-3 max-w-prose">{project.description}</p>
          )}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-xs text-sand-500">
              <span>Créé le {dateStr}</span>
              <span className="flex items-center gap-1 font-bold text-primary-400 tabular-nums">
                {coveredPhrases}/{totalPhrases} validées · {progressPct}%
              </span>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center gap-1.5 text-xs text-sand-500 hover:text-red-400 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-red-500/10"
              aria-label="Supprimer le projet"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Supprimer
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard
          label="Phrases"
          value={totalPhrases}
          icon={<FileText className="w-5 h-5" />}
          color="primary"
          delay={0}
        />
        <StatCard
          label="Enregistrements"
          value={totalRecordings}
          icon={<Mic className="w-5 h-5" />}
          color="primary"
          delay={100}
        />
        <StatCard
          label="Validés"
          value={validRecordings}
          icon={<Loader2 className="w-5 h-5" />}
          color="secondary"
          delay={200}
        />
        <StatCard
          label="Sessions actives"
          value={activeSessions}
          icon={<Users className="w-5 h-5" />}
          color="accent"
          delay={300}
        />
      </div>

      {/* Overall progress */}
      <div className="bg-white dark:bg-sand-900 rounded-2xl border border-sand-200/60 dark:border-sand-800 p-5 mb-6">
        <ProgressBar
          value={coveredPhrases}
          max={totalPhrases || 1}
          label={`Phrases validées — ${coveredPhrases} sur ${totalPhrases}`}
        />
      </div>

      {/* Tabs */}
      <div className="mb-4">
        <div className="flex gap-0.5 bg-sand-100 dark:bg-sand-900 p-1 rounded-xl w-fit border border-sand-200/60 dark:border-sand-800 overflow-x-auto">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={[
                'inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap',
                activeTab === key
                  ? 'bg-white dark:bg-sand-800 text-sand-900 dark:text-sand-100 shadow-sm border border-sand-200/60 dark:border-sand-700'
                  : 'text-sand-500 hover:text-sand-700 dark:hover:text-sand-300',
              ].join(' ')}
            >
              <Icon className="w-4 h-4" />
              {label}
              {key === 'recordings' && totalRecordings > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 font-bold tabular-nums">
                  {totalRecordings}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="bg-white dark:bg-sand-900 rounded-2xl shadow-sm border border-sand-200/60 dark:border-sand-800 p-5 lg:p-6 animate-fade-in-up">
        {activeTab === 'phrases' && (
          <PhraseList
            phrases={phrases}
            recordings={recordings}
            projectId={project.id}
            onPhrasesAdded={refetch}
          />
        )}
        {activeTab === 'sessions' && (
          <SessionList
            sessions={sessions}
            projectId={project.id}
            totalPhrases={totalPhrases}
            onSessionCreated={refetch}
            onSessionDeleted={refetch}
          />
        )}
        {activeTab === 'recordings' && (
          <RecordingList recordings={recordings} phrases={phrases} sessions={sessions} />
        )}
        {activeTab === 'exports' && (
          <ExportPanel
            projectId={project.id}
            exports={exports}
            onExportRequested={refetch}
            validRecordingsCount={validRecordings}
          />
        )}
      </div>

      {/* Modale de confirmation suppression */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in-up"
          onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteModal(false) }}
        >
          <div className="bg-white dark:bg-sand-900 rounded-2xl shadow-xl border border-sand-200/60 dark:border-sand-800 p-6 w-full max-w-md animate-scale-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2
                  className="text-base font-bold text-sand-900 dark:text-sand-100"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  Supprimer ce projet ?
                </h2>
                <p className="text-xs text-sand-500 dark:text-sand-400">Cette action est irréversible.</p>
              </div>
            </div>

            <p className="text-sm text-sand-600 dark:text-sand-400 mb-2">
              Le projet <span className="font-semibold text-sand-800 dark:text-sand-200">"{project.name}"</span> sera
              définitivement supprimé, ainsi que toutes ses phrases, sessions et enregistrements.
            </p>

            {deleteError && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-3 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                {deleteError}
              </p>
            )}

            <div className="flex gap-3 mt-6">
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                onClick={() => { setShowDeleteModal(false); setDeleteError('') }}
                disabled={deleting}
              >
                Annuler
              </Button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition-all duration-200 disabled:opacity-50 active:scale-[0.98]"
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                {deleting ? 'Suppression...' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
