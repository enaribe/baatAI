import { useState, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles, Loader2, Check, AlertCircle, RefreshCw, Plus, X,
  ArrowRight, Eye, FileText,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useSubtopics } from '../hooks/use-subtopics'
import { useToast } from '../hooks/use-toast'
import type { Subtopic, SubtopicStatus } from '../types/database'

const sans = { fontFamily: 'var(--font-body)', fontFeatureSettings: "'cv01','ss03'" }
const mono = { fontFamily: 'var(--font-mono)' }

interface SubtopicsPanelProps {
  projectId: string
  onValidated?: () => void
}

const STATUS_META: Record<SubtopicStatus, { label: string; color: string; dotColor: string }> = {
  pending: { label: 'En attente', color: '#8a8f98', dotColor: '#62666d' },
  generating: { label: 'Génération en cours', color: '#7170ff', dotColor: '#7170ff' },
  ready: { label: 'Prêt à valider', color: '#10b981', dotColor: '#10b981' },
  validated: { label: 'Validé', color: '#62666d', dotColor: '#10b981' },
  failed: { label: 'Échec', color: '#fca5a5', dotColor: '#ef4444' },
}

export function SubtopicsPanel({ projectId, onValidated }: SubtopicsPanelProps) {
  const { subtopics, loading, refetch } = useSubtopics(projectId)
  const { notify } = useToast()
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set())
  const [showAddModal, setShowAddModal] = useState(false)
  const [validatingAll, setValidatingAll] = useState(false)

  const totalTarget = useMemo(
    () => subtopics.reduce((s, st) => s + st.target_count, 0),
    [subtopics],
  )
  const totalGenerated = useMemo(
    () => subtopics.reduce((s, st) => s + st.generated_count, 0),
    [subtopics],
  )
  const readyCount = subtopics.filter((s) => s.status === 'ready').length

  // Une seule génération à la fois : verrouille tous les "Générer" si déjà en cours.
  // Évite de saturer les quotas Gemini quand on lance 4 cartes à la suite.
  const anyGenerating = busyIds.size > 0 || subtopics.some((s) => s.status === 'generating')

  const setBusy = (id: string, busy: boolean) => {
    setBusyIds((prev) => {
      const next = new Set(prev)
      if (busy) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const handleGenerate = useCallback(async (subtopic: Subtopic, mode: 'replace' | 'append' = 'replace') => {
    setBusy(subtopic.id, true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Session expirée, reconnectez-vous.')

      const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-subtopic-phrases`
      const res = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subtopic_id: subtopic.id, mode }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erreur de génération')
      notify({
        variant: 'success',
        title: mode === 'replace' ? 'Phrases générées' : 'Phrases ajoutées',
        message: `${json.data.generated} phrases pour "${subtopic.title}".`,
      })
      await refetch()
    } catch (err) {
      notify({
        variant: 'error',
        title: 'Génération impossible',
        message: err instanceof Error ? err.message : 'Erreur inconnue',
      })
    } finally {
      setBusy(subtopic.id, false)
    }
  }, [notify, refetch])

  const handleValidate = useCallback(async (subtopic: Subtopic) => {
    setBusy(subtopic.id, true)
    try {
      const { data, error: rpcErr } = await (supabase as unknown as {
        rpc: (fn: string, args: Record<string, unknown>) => Promise<{
          data: number | null
          error: { message: string } | null
        }>
      }).rpc('validate_subtopic', { p_subtopic_id: subtopic.id })

      if (rpcErr) throw new Error(rpcErr.message)

      notify({
        variant: 'success',
        title: 'Sous-thème validé',
        message: `${data ?? 0} phrases ajoutées au projet.`,
      })
      await refetch()
      onValidated?.()
    } catch (err) {
      notify({
        variant: 'error',
        title: 'Validation impossible',
        message: err instanceof Error ? err.message : 'Erreur inconnue',
      })
    } finally {
      setBusy(subtopic.id, false)
    }
  }, [notify, refetch, onValidated])

  const handleValidateAll = useCallback(async () => {
    const ready = subtopics.filter((s) => s.status === 'ready')
    if (ready.length === 0) return
    setValidatingAll(true)
    let success = 0
    let totalPhrases = 0
    for (const s of ready) {
      try {
        const { data, error: rpcErr } = await (supabase as unknown as {
          rpc: (fn: string, args: Record<string, unknown>) => Promise<{
            data: number | null
            error: { message: string } | null
          }>
        }).rpc('validate_subtopic', { p_subtopic_id: s.id })
        if (rpcErr) throw new Error(rpcErr.message)
        success++
        totalPhrases += data ?? 0
      } catch (err) {
        console.error(`validate_subtopic ${s.id} failed:`, err)
      }
    }
    setValidatingAll(false)
    notify({
      variant: success === ready.length ? 'success' : 'warning',
      title: `${success}/${ready.length} sous-thèmes validés`,
      message: `${totalPhrases} phrases ajoutées au projet.`,
    })
    await refetch()
    onValidated?.()
  }, [subtopics, notify, refetch, onValidated])

  if (loading) {
    return (
      <div className="rounded-md p-4" style={{ background: 'var(--t-surface)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2 text-[#8a8f98] text-[12px]" style={sans}>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Chargement des sous-thèmes…
        </div>
      </div>
    )
  }

  if (subtopics.length === 0) return null

  return (
    <section className="flex flex-col gap-4">
      {/* Header avec stats globales */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" style={{ color: '#7170ff' }} strokeWidth={1.75} />
          <h2 className="text-[15px] text-[#f7f8f8] m-0" style={{ ...sans, fontWeight: 590 }}>
            Plan de génération
          </h2>
        </div>
        <span className="text-[11px] text-[#62666d] tabular-nums" style={mono}>
          {totalGenerated.toLocaleString('fr-FR')} / {totalTarget.toLocaleString('fr-FR')} phrases générées
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1 h-[28px] px-2.5 text-[12px] rounded-md text-[#d0d6e0] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
            style={{ ...sans, fontWeight: 510 }}
          >
            <Plus className="w-3 h-3" strokeWidth={1.75} />
            Ajouter
          </button>
          {readyCount > 0 && (
            <button
              type="button"
              onClick={handleValidateAll}
              disabled={validatingAll}
              className="inline-flex items-center gap-1 h-[28px] px-2.5 text-[12px] rounded-md transition-colors disabled:opacity-40"
              style={{
                ...sans,
                fontWeight: 510,
                color: '#ffffff',
                background: '#5e6ad2',
              }}
            >
              {validatingAll ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" strokeWidth={2} />}
              Valider tout ({readyCount})
            </button>
          )}
        </div>
      </div>

      {anyGenerating && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-md text-[12px] text-[#8a8f98]"
          style={{
            ...sans,
            background: 'rgba(113,112,255,0.04)',
            border: '1px solid rgba(113,112,255,0.15)',
          }}
        >
          <Loader2 className="w-3 h-3 animate-spin" style={{ color: '#7170ff' }} />
          Une génération est en cours. Patientez avant d'en lancer une autre pour ne pas saturer le quota IA.
        </div>
      )}

      {/* Grille de cartes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {subtopics.map((s) => (
          <SubtopicCard
            key={s.id}
            subtopic={s}
            projectId={projectId}
            busy={busyIds.has(s.id)}
            disabled={anyGenerating && !busyIds.has(s.id) && s.status !== 'generating'}
            onGenerate={handleGenerate}
            onValidate={handleValidate}
          />
        ))}
      </div>

      {showAddModal && (
        <AddSubtopicModal
          projectId={projectId}
          onClose={() => setShowAddModal(false)}
          onCreated={async () => { setShowAddModal(false); await refetch() }}
        />
      )}
    </section>
  )
}

/* ---------- Carte ---------- */

interface SubtopicCardProps {
  subtopic: Subtopic
  projectId: string
  busy: boolean
  disabled?: boolean
  onGenerate: (s: Subtopic, mode?: 'replace' | 'append') => void
  onValidate: (s: Subtopic) => void
}

function SubtopicCard({ subtopic: s, projectId, busy, disabled, onGenerate, onValidate }: SubtopicCardProps) {
  const meta = STATUS_META[s.status]
  const isGenerating = s.status === 'generating' || busy
  const lockGenerate = disabled || isGenerating
  const progressPct = s.target_count > 0
    ? Math.min(100, Math.round((s.generated_count / s.target_count) * 100))
    : 0

  return (
    <article
      className="flex flex-col gap-3 p-4 rounded-md"
      style={{
        background: 'var(--t-surface)',
        border: `1px solid ${s.status === 'ready' ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.08)'}`,
      }}
    >
      {/* Titre + statut */}
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <h3
            className="text-[14px] text-[#f7f8f8] m-0 truncate"
            style={{ ...sans, fontWeight: 590, letterSpacing: '-0.1px' }}
          >
            {s.title}
          </h3>
          {s.description && (
            <p className="text-[12px] text-[#8a8f98] mt-1 line-clamp-2" style={sans}>
              {s.description}
            </p>
          )}
        </div>
        <span
          className="inline-flex items-center gap-1.5 px-2 h-[20px] rounded-full text-[10px] shrink-0"
          style={{
            ...sans,
            fontWeight: 510,
            color: meta.color,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.dotColor }} />
          {meta.label}
        </span>
      </div>

      {/* Stats + barre */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-[#62666d] tabular-nums" style={mono}>
          {s.generated_count.toLocaleString('fr-FR')} / {s.target_count.toLocaleString('fr-FR')}
        </span>
        <div className="flex-1 h-[3px] bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${progressPct}%`,
              background: s.status === 'ready' || s.status === 'validated' ? '#10b981' : '#7170ff',
            }}
          />
        </div>
        <span className="text-[10px] text-[#62666d] uppercase" style={{ ...sans, letterSpacing: '0.04em' }}>
          {s.source === 'ai' ? 'IA' : 'Manuel'}
        </span>
      </div>

      {/* Erreur éventuelle */}
      {s.status === 'failed' && s.failed_reason && (
        <div
          className="flex items-start gap-1.5 px-2.5 py-2 rounded text-[11px] text-[#fca5a5]"
          style={{
            ...sans,
            background: 'var(--t-danger-muted-bg)',
            border: '1px solid var(--t-danger-muted-border)',
          }}
        >
          <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
          <span>{s.failed_reason}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1.5 mt-1">
        {s.status === 'pending' && (
          <button
            type="button"
            onClick={() => onGenerate(s)}
            disabled={lockGenerate}
            title={disabled ? 'Une autre génération est en cours' : undefined}
            className="inline-flex items-center gap-1.5 h-[28px] px-2.5 text-[12px] rounded-md transition-colors disabled:opacity-40"
            style={{
              ...sans,
              fontWeight: 510,
              color: '#ffffff',
              background: '#5e6ad2',
            }}
          >
            {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" strokeWidth={1.75} />}
            Générer
          </button>
        )}

        {s.status === 'generating' && (
          <span className="inline-flex items-center gap-1.5 h-[28px] px-2.5 text-[12px] text-[#8a8f98]" style={sans}>
            <Loader2 className="w-3 h-3 animate-spin" />
            Patientez…
          </span>
        )}

        {s.status === 'ready' && (
          <>
            <Link
              to={`/project/${projectId}/subtopic/${s.id}`}
              className="inline-flex items-center gap-1.5 h-[28px] px-2.5 text-[12px] rounded-md text-[#d0d6e0] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
              style={{ ...sans, fontWeight: 510 }}
            >
              <Eye className="w-3 h-3" strokeWidth={1.75} />
              Relire ({s.generated_count})
            </Link>
            <button
              type="button"
              onClick={() => onValidate(s)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 h-[28px] px-2.5 text-[12px] rounded-md transition-colors disabled:opacity-40"
              style={{
                ...sans,
                fontWeight: 510,
                color: '#ffffff',
                background: '#5e6ad2',
              }}
            >
              {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" strokeWidth={2} />}
              Valider
            </button>
          </>
        )}

        {s.status === 'validated' && (
          <span className="inline-flex items-center gap-1.5 h-[28px] px-2.5 text-[12px] text-[#10b981]" style={sans}>
            <Check className="w-3 h-3" strokeWidth={2} />
            Intégré au projet
          </span>
        )}

        {s.status === 'failed' && (
          <button
            type="button"
            onClick={() => onGenerate(s)}
            disabled={lockGenerate}
            title={disabled ? 'Une autre génération est en cours' : undefined}
            className="inline-flex items-center gap-1.5 h-[28px] px-2.5 text-[12px] rounded-md transition-colors disabled:opacity-40"
            style={{
              ...sans,
              fontWeight: 510,
              color: 'var(--t-fg)',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            <RefreshCw className="w-3 h-3" strokeWidth={1.75} />
            Réessayer
          </button>
        )}

        {s.status === 'ready' && (
          <button
            type="button"
            onClick={() => {
              if (confirm(`Régénérer toutes les ${s.generated_count} phrases de "${s.title}" ? Les phrases actuelles seront supprimées.`)) {
                onGenerate(s, 'replace')
              }
            }}
            disabled={lockGenerate}
            className="inline-flex items-center gap-1 h-[28px] px-2 text-[11px] rounded-md text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[rgba(255,255,255,0.04)] transition-colors disabled:opacity-40 ml-auto"
            style={{ ...sans, fontWeight: 510 }}
            title="Régénérer (écrase l'existant)"
          >
            <RefreshCw className="w-3 h-3" strokeWidth={1.75} />
          </button>
        )}
      </div>
    </article>
  )
}

/* ---------- Modal ajout sous-thème manuel ---------- */

interface AddSubtopicModalProps {
  projectId: string
  onClose: () => void
  onCreated: () => void
}

function AddSubtopicModal({ projectId, onClose, onCreated }: AddSubtopicModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [targetCount, setTargetCount] = useState(200)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const { notify } = useToast()

  const valid = title.trim().length >= 3 && targetCount >= 50 && targetCount <= 500

  const handleSubmit = async () => {
    if (!valid) return
    setSubmitting(true)
    setError('')
    try {
      // Position max actuelle
      const { data: maxRow } = await supabase
        .from('subtopics')
        .select('position')
        .eq('project_id', projectId)
        .order('position', { ascending: false })
        .limit(1)
        .maybeSingle()

      const nextPos = ((maxRow as { position?: number } | null)?.position ?? 0) + 1

      const { error: insertErr } = await supabase
        .from('subtopics')
        .insert({
          project_id: projectId,
          position: nextPos,
          title: title.trim(),
          description: description.trim() || null,
          target_count: targetCount,
          source: 'manual',
          status: 'pending',
        } as never)

      if (insertErr) throw insertErr
      notify({ variant: 'success', title: 'Sous-thème ajouté', message: title.trim() })
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.85)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-[480px] max-h-[92dvh] overflow-y-auto"
        style={{
          background: 'var(--t-surface-2)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Plus className="w-4 h-4 text-[#7170ff]" strokeWidth={1.75} />
          <h2 className="text-[15px] text-[#f7f8f8] m-0" style={{ ...sans, fontWeight: 590 }}>
            Ajouter un sous-thème
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto w-7 h-7 flex items-center justify-center rounded-md text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
          >
            <X className="w-3.5 h-3.5" strokeWidth={1.75} />
          </button>
        </div>
        <p className="text-[12px] text-[#8a8f98] mb-4" style={sans}>
          Le sous-thème sera créé en statut « En attente ». Vous pourrez ensuite générer ses phrases.
        </p>

        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-[12px] text-[#d0d6e0] mb-1.5" style={{ ...sans, fontWeight: 510 }}>
              Titre <span className="text-[#62666d]">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex : Vocabulaire des sages-femmes"
              maxLength={200}
              className="w-full h-[36px] px-3 text-[14px] text-[#f7f8f8] placeholder:text-[#62666d] rounded-md bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] focus:outline-none focus:border-[rgba(255,255,255,0.22)]"
              style={sans}
            />
          </div>
          <div>
            <label className="block text-[12px] text-[#d0d6e0] mb-1.5" style={{ ...sans, fontWeight: 510 }}>
              Description <span className="text-[#62666d]">· Optionnel</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez le contexte pour orienter la génération…"
              rows={2}
              maxLength={500}
              className="w-full px-3 py-2.5 text-[13px] text-[#f7f8f8] placeholder:text-[#62666d] rounded-md bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] focus:outline-none focus:border-[rgba(255,255,255,0.22)] resize-y"
              style={{ ...sans, lineHeight: 1.5 }}
            />
          </div>
          <div>
            <label className="block text-[12px] text-[#d0d6e0] mb-1.5" style={{ ...sans, fontWeight: 510 }}>
              Quantité de phrases
            </label>
            <input
              type="number"
              min={50}
              max={500}
              step={10}
              value={targetCount}
              onChange={(e) => setTargetCount(parseInt(e.target.value, 10) || 0)}
              className="w-full h-[36px] px-3 text-[14px] text-[#f7f8f8] rounded-md bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] focus:outline-none focus:border-[rgba(255,255,255,0.22)] tabular-nums"
              style={sans}
            />
            <p className="text-[11px] text-[#62666d] mt-1.5" style={sans}>
              Min 50, max 500 par sous-thème.
            </p>
          </div>
        </div>

        {error && (
          <div
            className="flex items-start gap-2 px-3 py-2 rounded-md text-[12px] text-[#fca5a5] mt-3"
            style={{
              ...sans,
              background: 'var(--t-danger-muted-bg)',
              border: '1px solid var(--t-danger-muted-border)',
            }}
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-2 mt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 h-[34px] text-[13px] rounded-md text-[#d0d6e0] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
            style={{ ...sans, fontWeight: 510 }}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!valid || submitting}
            className="flex-1 inline-flex items-center justify-center gap-1.5 h-[34px] text-[13px] rounded-md transition-colors disabled:opacity-40"
            style={{
              ...sans,
              fontWeight: 510,
              color: '#ffffff',
              background: '#5e6ad2',
            }}
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />}
            Ajouter
          </button>
        </div>
      </div>
    </div>
  )
}

// Imports inutilisés
void FileText
