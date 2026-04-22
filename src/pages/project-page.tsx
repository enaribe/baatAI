import { useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, FileText, Users, Mic, Package, Loader2, UserPlus, Settings,
  Circle, CircleCheck, CircleDashed, Clock, Archive, Trash2, AlertTriangle,
  MoreHorizontal, Star,
} from 'lucide-react'
import { useProject } from '../hooks/use-project'
import { useRealtimeRecordings } from '../hooks/use-realtime-recordings'
import { useToast } from '../hooks/use-toast'
import { translateRejectReasons } from '../lib/qc-translations'
import { supabase } from '../lib/supabase'
import { Skeleton } from '../components/ui/skeleton'
import { PhraseList } from '../components/phrase-list'
import { SessionList } from '../components/session-list'
import { RecordingList } from '../components/recording-list'
import { ExportPanel } from '../components/export-panel'
import { RecruitmentPanel } from '../components/recruitment/recruitment-panel'
import { ProjectSettingsPanel } from '../components/project-settings-panel'
import type { ProjectStatus } from '../types/database'

const sans = { fontFamily: 'var(--font-body)', fontFeatureSettings: "'cv01','ss03'" }
const mono = { fontFamily: 'var(--font-mono)' }

type Tab = 'phrases' | 'sessions' | 'recordings' | 'exports' | 'recruitment' | 'settings'

const statusIconMap: Record<ProjectStatus, { Icon: typeof Circle; color: string; label: string }> = {
  draft: { Icon: CircleDashed, color: '#62666d', label: 'Brouillon' },
  active: { Icon: Circle, color: '#7170ff', label: 'Actif' },
  processing: { Icon: Clock, color: '#fbbf24', label: 'En traitement' },
  completed: { Icon: CircleCheck, color: '#10b981', label: 'Terminé' },
  archived: { Icon: Archive, color: '#62666d', label: 'Archivé' },
}

export function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { project, phrases, sessions, recordings, exports, loading, error, refetch } = useProject(id)
  const [activeTab, setActiveTab] = useState<Tab>('phrases')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const { notify } = useToast()

  const handleRecordingUpdate = useCallback(
    (recording: Parameters<NonNullable<Parameters<typeof useRealtimeRecordings>[0]['onUpdate']>>[0]) => {
      refetch()
      if (recording.processing_status === 'failed') {
        notify({
          variant: 'error',
          title: 'Échec du traitement',
          message: "Un enregistrement n'a pas pu être analysé.",
        })
      } else if (recording.processing_status === 'completed' && recording.is_valid === false) {
        const reasons = translateRejectReasons(recording.rejection_reasons).join(', ') || 'critères QC non atteints'
        notify({ variant: 'warning', title: 'Enregistrement rejeté', message: `Raison : ${reasons}.` })
      }
    },
    [refetch, notify],
  )

  useRealtimeRecordings({
    projectId: id,
    onInsert: useCallback(() => refetch(), [refetch]),
    onUpdate: handleRecordingUpdate,
  })

  const handleDelete = useCallback(async () => {
    if (!project) return
    setDeleting(true)
    setDeleteError('')
    try {
      const { error: deleteErr } = await supabase.from('projects').delete().eq('id', project.id)
      if (deleteErr) throw deleteErr
      navigate('/dashboard')
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Erreur lors de la suppression')
    } finally {
      setDeleting(false)
    }
  }, [project, navigate])

  if (loading) {
    return (
      <div className="px-5 lg:px-8 py-10">
        <Skeleton className="h-5 w-32 mb-4" />
        <Skeleton className="h-10 w-96 mb-6" />
        <Skeleton className="h-20 mb-8" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="px-5 lg:px-8 py-10">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-[12px] text-[#8a8f98] hover:text-[#f7f8f8] transition-colors mb-6"
          style={sans}
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
          Dashboard
        </Link>
        <div
          className="flex items-start gap-2 px-3 py-2.5 rounded-md text-[12px] text-[#fca5a5] border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)]"
          style={sans}
        >
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{error || 'Projet introuvable'}</span>
        </div>
      </div>
    )
  }

  const totalPhrases = phrases.length
  const totalRecordings = recordings.length
  const validRecordings = recordings.filter((r) => r.is_valid === true).length
  const activeSessions = sessions.filter((s) => s.status === 'active' || s.status === 'pending').length
  const coveredPhraseIds = new Set(
    recordings.filter((r) => r.is_valid === true).map((r) => r.phrase_id),
  )
  const coveredPhrases = coveredPhraseIds.size
  const progressPct = totalPhrases > 0 ? Math.round((coveredPhrases / totalPhrases) * 100) : 0

  const statusCfg = statusIconMap[project.status]
  const { Icon: StatusIcon } = statusCfg
  const code = `BAA-${project.id.slice(0, 4).toUpperCase()}`
  const dateStr = new Date(project.created_at).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  })

  const tabs: { key: Tab; label: string; count?: number; icon: typeof FileText }[] = [
    { key: 'phrases', label: 'Phrases', count: totalPhrases, icon: FileText },
    { key: 'sessions', label: 'Sessions', count: sessions.length, icon: Users },
    { key: 'recordings', label: 'Enregistrements', count: totalRecordings, icon: Mic },
    { key: 'exports', label: 'Exports', count: exports.length, icon: Package },
    { key: 'recruitment', label: 'Recrutement', icon: UserPlus },
    { key: 'settings', label: 'Paramètres', icon: Settings },
  ]

  return (
    <div className="min-h-screen">
      {/* Top bar — breadcrumb + actions */}
      <header className="sticky top-0 z-10 flex items-center gap-3 px-5 lg:px-8 h-[52px] border-b border-[rgba(255,255,255,0.05)] bg-[rgba(8,9,10,0.9)] backdrop-blur-md">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-[12px] text-[#8a8f98] hover:text-[#f7f8f8] transition-colors"
          style={sans}
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
          Projets
        </Link>
        <span className="text-[#3e3e44]">/</span>
        <span className="text-[11px] text-[#62666d]" style={mono}>
          {code}
        </span>
        <StatusIcon className="w-3.5 h-3.5 shrink-0" strokeWidth={2} style={{ color: statusCfg.color }} />
        <span
          className="text-[13px] text-[#f7f8f8] truncate"
          style={{ ...sans, fontWeight: 510 }}
        >
          {project.name}
        </span>
        <button className="w-[26px] h-[26px] flex items-center justify-center rounded-md text-[#62666d] hover:text-[#fbbf24] hover:bg-[rgba(255,255,255,0.04)] transition-colors">
          <Star className="w-[13px] h-[13px]" strokeWidth={1.75} />
        </button>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center gap-1 h-[28px] px-2.5 text-[12px] rounded-md transition-colors"
            style={{
              ...sans,
              fontWeight: 510,
              color: '#fca5a5',
              background: 'transparent',
              border: '1px solid transparent',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.08)'
              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.18)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.borderColor = 'transparent'
            }}
          >
            <Trash2 className="w-3 h-3" strokeWidth={1.75} />
            Supprimer
          </button>
          <button className="w-[28px] h-[28px] flex items-center justify-center rounded-md text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[rgba(255,255,255,0.04)] transition-colors">
            <MoreHorizontal className="w-[13px] h-[13px]" strokeWidth={1.75} />
          </button>
        </div>
      </header>

      {/* Hero compact */}
      <div className="px-5 lg:px-8 pt-7 pb-5">
        <div className="flex items-start gap-3 mb-2">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 h-[22px] rounded-full text-[11px]"
            style={{
              ...sans,
              fontWeight: 510,
              color: '#d0d6e0',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusCfg.color }} />
            {statusCfg.label}
          </span>
          <span
            className="inline-flex items-center px-2 h-[22px] rounded-sm text-[10px] text-[#d0d6e0]"
            style={{
              ...sans,
              fontWeight: 510,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            {project.usage_type.toUpperCase()}
          </span>
          <span className="text-[11px] text-[#62666d]" style={sans}>
            {project.language_label ?? project.target_language}
          </span>
        </div>
        <h1
          className="text-[28px] text-[#f7f8f8] m-0"
          style={{ ...sans, fontWeight: 510, lineHeight: 1.1, letterSpacing: '-0.3px' }}
        >
          {project.name}
        </h1>
        {project.description && (
          <p className="text-[14px] text-[#8a8f98] mt-2 max-w-[70ch]" style={sans}>
            {project.description}
          </p>
        )}
        <div className="mt-3 flex items-center gap-2 text-[11px] text-[#62666d]" style={mono}>
          <span>Créé {dateStr}</span>
          <span>·</span>
          <span>{code}</span>
        </div>

        {/* Stats inline + progress */}
        <div className="mt-5 flex items-center gap-6 flex-wrap">
          <Stat label="phrases" value={String(totalPhrases)} />
          <StatSep />
          <Stat label="enregistrements" value={String(totalRecordings)} />
          <StatSep />
          <Stat label="validés" value={String(validRecordings)} color="#10b981" />
          <StatSep />
          <Stat label="sessions actives" value={String(activeSessions)} />
          <StatSep />
          <div className="flex items-center gap-2.5">
            <div className="w-[140px] h-[3px] bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#f7f8f8] rounded-full transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-[12px] text-[#d0d6e0] tabular-nums" style={mono}>
              {progressPct}%
            </span>
          </div>
        </div>
      </div>

      {/* Tabs bar */}
      <div className="flex items-center gap-0.5 px-5 lg:px-8 border-b border-[rgba(255,255,255,0.05)] overflow-x-auto">
        {tabs.map(({ key, label, count, icon: Icon }) => {
          const on = activeTab === key
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="relative inline-flex items-center gap-1.5 h-[40px] px-3 text-[12px] whitespace-nowrap transition-colors"
              style={{
                ...sans,
                fontWeight: 510,
                color: on ? '#f7f8f8' : '#8a8f98',
              }}
            >
              <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
              {label}
              {count != null && (
                <span className="text-[11px] text-[#62666d]" style={mono}>
                  {count}
                </span>
              )}
              {on && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-[2px]"
                  style={{ background: '#f7f8f8' }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div className="p-5 lg:p-8 animate-fade-in-up">
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
        {activeTab === 'recruitment' && <RecruitmentPanel projectId={project.id} />}
        {activeTab === 'settings' && <ProjectSettingsPanel project={project} onUpdated={refetch} />}
      </div>

      {/* Modal delete */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in-up"
          style={{ background: 'rgba(0,0,0,0.85)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteModal(false) }}
        >
          <div
            className="rounded-[12px] p-6 w-full max-w-[420px]"
            style={{
              background: '#191a1b',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 40px 80px -20px rgba(0,0,0,0.8)',
            }}
          >
            <div className="flex items-start gap-3 mb-4">
              <div
                className="w-9 h-9 rounded-md flex items-center justify-center shrink-0"
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.22)',
                }}
              >
                <AlertTriangle className="w-4 h-4 text-[#fca5a5]" strokeWidth={1.75} />
              </div>
              <div className="flex-1">
                <h2
                  className="text-[15px] text-[#f7f8f8] m-0"
                  style={{ ...sans, fontWeight: 590 }}
                >
                  Supprimer ce projet ?
                </h2>
                <p className="text-[12px] text-[#8a8f98] mt-1" style={sans}>
                  Action irréversible.
                </p>
              </div>
            </div>
            <p className="text-[13px] text-[#d0d6e0] mb-3" style={sans}>
              Le projet <span className="text-[#f7f8f8]" style={{ fontWeight: 510 }}>« {project.name} »</span>{' '}
              sera définitivement supprimé, ainsi que toutes ses phrases, sessions et enregistrements.
            </p>
            {deleteError && (
              <p
                className="text-[12px] text-[#fca5a5] px-3 py-2 rounded-md mt-3"
                style={{
                  ...sans,
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.22)',
                }}
              >
                {deleteError}
              </p>
            )}
            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={() => { setShowDeleteModal(false); setDeleteError('') }}
                disabled={deleting}
                className="flex-1 h-[34px] text-[13px] rounded-md text-[#d0d6e0] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
                style={{ ...sans, fontWeight: 510 }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 inline-flex items-center justify-center gap-1.5 h-[34px] text-[13px] rounded-md transition-colors disabled:opacity-40"
                style={{
                  ...sans,
                  fontWeight: 510,
                  color: '#f7f8f8',
                  background: '#ef4444',
                }}
              >
                {deleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                )}
                {deleting ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- Helpers ---------- */

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span
        className="text-[15px] tabular-nums"
        style={{
          ...sans,
          fontWeight: 590,
          color: color ?? '#f7f8f8',
        }}
      >
        {value}
      </span>
      <span className="text-[12px] text-[#62666d]" style={sans}>
        {label}
      </span>
    </div>
  )
}

function StatSep() {
  return <span className="w-px h-3 bg-[rgba(255,255,255,0.08)]" />
}
