import { useState, useCallback } from 'react'
import {
  Link2, Check, Plus, Loader2, Trash2, AlertTriangle, X,
  ChevronDown, Circle, CircleCheck, CircleDashed, Clock,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { RecordingSession } from '../types/database'

const sans = { fontFamily: 'var(--font-body)', fontFeatureSettings: "'cv01','ss03'" }
const mono = { fontFamily: 'var(--font-mono)' }

interface SessionListProps {
  sessions: RecordingSession[]
  projectId: string
  totalPhrases: number
  onSessionCreated: () => void
  onSessionDeleted: () => void
}

export function SessionList({
  sessions, projectId, totalPhrases, onSessionCreated, onSessionDeleted,
}: SessionListProps) {
  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [error, setError] = useState('')

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState('')

  const [speakerName, setSpeakerName] = useState('')
  const [gender, setGender] = useState('')
  const [age, setAge] = useState('')
  const [dialect, setDialect] = useState('')
  const [city, setCity] = useState('')

  const handleCreate = useCallback(async () => {
    setCreating(true)
    setError('')
    try {
      const metadata: Record<string, unknown> = {}
      if (gender) metadata.gender = gender
      if (age) metadata.age = parseInt(age, 10)
      if (dialect) metadata.dialect = dialect
      if (city) metadata.city = city

      const { error: insertError } = await supabase
        .from('recording_sessions')
        .insert({
          project_id: projectId,
          speaker_name: speakerName.trim() || null,
          speaker_metadata: metadata,
        } as never)
      if (insertError) throw insertError

      setSpeakerName(''); setGender(''); setAge(''); setDialect(''); setCity('')
      setShowForm(false)
      onSessionCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création')
    } finally {
      setCreating(false)
    }
  }, [projectId, speakerName, gender, age, dialect, city, onSessionCreated])

  const handleDelete = useCallback(async (sessionId: string) => {
    setDeletingId(sessionId)
    setDeleteError('')
    try {
      const { error: deleteErr } = await supabase
        .from('recording_sessions').delete().eq('id', sessionId)
      if (deleteErr) throw deleteErr
      setConfirmDeleteId(null)
      onSessionDeleted()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Erreur lors de la suppression')
    } finally {
      setDeletingId(null)
    }
  }, [onSessionDeleted])

  const copyLink = useCallback(async (token: string) => {
    const url = `${window.location.origin}/record/${token}`
    await navigator.clipboard.writeText(url)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }, [])

  const sessionToDelete = sessions.find((s) => s.id === confirmDeleteId)

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center gap-2 h-[36px] mb-2 -mx-5 lg:-mx-8 px-5 lg:px-8 border-b border-[rgba(255,255,255,0.05)]">
        <ChevronDown className="w-3 h-3 text-[#8a8f98]" strokeWidth={2} />
        <span className="text-[12px] text-[#f7f8f8]" style={{ ...sans, fontWeight: 510 }}>
          Sessions
        </span>
        <span className="text-[11px] text-[#62666d]" style={mono}>
          {sessions.length}
        </span>
        <button
          onClick={() => setShowForm(!showForm)}
          className="ml-auto inline-flex items-center gap-1 h-[26px] px-2.5 text-[12px] rounded-md transition-colors"
          style={{
            ...sans,
            fontWeight: 510,
            color: 'var(--t-fg)',
            background: showForm ? 'rgba(255,255,255,0.08)' : 'var(--t-surface-active)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <Plus className="w-3 h-3" strokeWidth={2} />
          Nouvelle session
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div
          className="rounded-[8px] p-4 mb-3 animate-scale-in"
          style={{
            background: 'var(--t-surface)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nom du locuteur">
              <TextInput value={speakerName} onChange={setSpeakerName} placeholder="Optionnel" />
            </Field>
            <Field label="Genre">
              <SelectInput
                value={gender}
                onChange={setGender}
                options={[
                  { value: '', label: 'Sélectionner…' },
                  { value: 'homme', label: 'Homme' },
                  { value: 'femme', label: 'Femme' },
                ]}
              />
            </Field>
            <Field label="Âge">
              <TextInput type="number" value={age} onChange={setAge} placeholder="Ex : 35" />
            </Field>
            <Field label="Dialecte">
              <TextInput value={dialect} onChange={setDialect} placeholder="Ex : Wolof de Dakar" />
            </Field>
            <Field label="Ville">
              <TextInput value={city} onChange={setCity} placeholder="Ex : Dakar" />
            </Field>
          </div>

          {error && (
            <p
              className="mt-3 flex items-start gap-2 px-3 py-2 rounded-md text-[12px] text-[#fca5a5]"
              style={{
                ...sans,
                background: 'var(--t-danger-muted-bg)',
                border: '1px solid var(--t-danger-muted-border)',
              }}
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setShowForm(false)}
              className="h-[30px] px-3 text-[12px] rounded-md text-[#d0d6e0] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
              style={{ ...sans, fontWeight: 510 }}
            >
              Annuler
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="inline-flex items-center gap-1.5 h-[30px] px-3 text-[12px] rounded-md transition-colors disabled:opacity-40"
              style={{
                ...sans,
                fontWeight: 510,
                color: '#ffffff',
                background: '#5e6ad2',
              }}
            >
              {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" strokeWidth={2} />}
              Créer la session
            </button>
          </div>
        </div>
      )}

      {/* Liste */}
      {sessions.length === 0 ? (
        <EmptyState />
      ) : (
        <div
          className="rounded-[8px] overflow-hidden"
          style={{
            background: 'var(--t-surface)',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          {sessions.map((session, idx) => (
            <SessionRow
              key={session.id}
              session={session}
              totalPhrases={totalPhrases}
              last={idx === sessions.length - 1}
              copiedToken={copiedToken}
              onCopy={() => copyLink(session.token)}
              onDelete={() => { setConfirmDeleteId(session.id); setDeleteError('') }}
              isDeleting={deletingId === session.id}
            />
          ))}
        </div>
      )}

      {/* Modal delete */}
      {confirmDeleteId && sessionToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmDeleteId(null) }}
        >
          <div
            className="rounded-[12px] p-6 w-full max-w-[420px]"
            style={{
              background: 'var(--t-modal-bg)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 40px 80px -20px rgba(0,0,0,0.8)',
            }}
          >
            <div className="flex items-start gap-3 mb-4">
              <div
                className="w-9 h-9 rounded-md flex items-center justify-center shrink-0"
                style={{
                  background: 'var(--t-danger-muted-bg)',
                  border: '1px solid var(--t-danger-muted-border)',
                }}
              >
                <AlertTriangle className="w-4 h-4 text-[#fca5a5]" strokeWidth={1.75} />
              </div>
              <div className="flex-1">
                <h2 className="text-[15px] text-[#f7f8f8] m-0" style={{ ...sans, fontWeight: 590 }}>
                  Supprimer ce locuteur ?
                </h2>
                <p className="text-[12px] text-[#8a8f98] mt-1" style={sans}>
                  Tous ses enregistrements seront supprimés.
                </p>
              </div>
            </div>
            <p className="text-[13px] text-[#d0d6e0]" style={sans}>
              La session de{' '}
              <span className="text-[#f7f8f8]" style={{ fontWeight: 510 }}>
                {sessionToDelete.speaker_name || 'Locuteur anonyme'}
              </span>{' '}
              et ses{' '}
              <span className="text-[#f7f8f8]" style={{ fontWeight: 510 }}>
                {sessionToDelete.total_recorded}
              </span>{' '}
              enregistrement{sessionToDelete.total_recorded > 1 ? 's' : ''} seront définitivement supprimés.
            </p>

            {deleteError && (
              <p
                className="mt-3 text-[12px] text-[#fca5a5] px-3 py-2 rounded-md"
                style={{
                  ...sans,
                  background: 'var(--t-danger-muted-bg)',
                  border: '1px solid var(--t-danger-muted-border)',
                }}
              >
                {deleteError}
              </p>
            )}

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => { setConfirmDeleteId(null); setDeleteError('') }}
                disabled={!!deletingId}
                className="flex-1 h-[34px] text-[13px] rounded-md text-[#d0d6e0] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
                style={{ ...sans, fontWeight: 510 }}
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={!!deletingId}
                className="flex-1 inline-flex items-center justify-center gap-1.5 h-[34px] text-[13px] rounded-md transition-colors disabled:opacity-40"
                style={{
                  ...sans,
                  fontWeight: 510,
                  color: 'var(--t-fg)',
                  background: '#ef4444',
                }}
              >
                {deletingId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />}
                {deletingId ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- SessionRow ---------- */

function SessionRow({
  session, totalPhrases, last, copiedToken, onCopy, onDelete, isDeleting,
}: {
  session: RecordingSession
  totalPhrases: number
  last: boolean
  copiedToken: string | null
  onCopy: () => void
  onDelete: () => void
  isDeleting: boolean
}) {
  const progress = totalPhrases > 0
    ? Math.min(100, Math.round((session.total_recorded / totalPhrases) * 100))
    : 0
  const expiresDate = new Date(session.expires_at)
  const isExpired = expiresDate < new Date()

  const status = isExpired ? 'expired' : session.status
  const statusMap: Record<string, { Icon: typeof Circle; color: string; label: string }> = {
    pending: { Icon: CircleDashed, color: '#62666d', label: 'En attente' },
    active: { Icon: Circle, color: '#7170ff', label: 'Actif' },
    completed: { Icon: CircleCheck, color: '#10b981', label: 'Terminé' },
    expired: { Icon: Clock, color: '#fbbf24', label: 'Expiré' },
  }
  const cfg = statusMap[status] ?? statusMap.pending!
  const { Icon } = cfg

  const meta = session.speaker_metadata as Record<string, unknown> | null
  const metaChips: string[] = []
  if (meta?.gender) metaChips.push(String(meta.gender))
  if (meta?.age) metaChips.push(`${meta.age} ans`)
  if (meta?.dialect) metaChips.push(String(meta.dialect))
  if (meta?.city) metaChips.push(String(meta.city))

  return (
    <div
      className="px-4 py-3.5"
      style={{ borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.04)' }}
    >
      <div className="flex items-center gap-3">
        <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={2} style={{ color: cfg.color }} />
        <span className="text-[13px] text-[#f7f8f8] truncate flex-1 min-w-0" style={{ ...sans, fontWeight: 510 }}>
          {session.speaker_name || 'Locuteur anonyme'}
        </span>
        <span
          className="inline-flex items-center gap-1.5 px-2 h-[20px] rounded-full text-[10px]"
          style={{
            ...sans,
            fontWeight: 510,
            color: cfg.color,
            background: `${cfg.color}18`,
            border: `1px solid ${cfg.color}40`,
          }}
        >
          {cfg.label}
        </span>

        <button
          onClick={onCopy}
          className="inline-flex items-center gap-1 h-[26px] px-2 text-[11px] rounded-md transition-colors"
          style={{
            ...sans,
            fontWeight: 510,
            color: copiedToken === session.token ? 'var(--t-success)' : 'var(--t-fg-2)',
            background: 'var(--t-surface)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {copiedToken === session.token ? (
            <>
              <Check className="w-3 h-3" strokeWidth={2} />
              Copié
            </>
          ) : (
            <>
              <Link2 className="w-3 h-3" strokeWidth={1.75} />
              Copier lien
            </>
          )}
        </button>

        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="w-[26px] h-[26px] flex items-center justify-center rounded-md text-[#8a8f98] hover:text-[#fca5a5] hover:bg-[rgba(239,68,68,0.08)] transition-colors disabled:opacity-40"
          aria-label="Supprimer"
        >
          {isDeleting
            ? <Loader2 className="w-3 h-3 animate-spin" />
            : <Trash2 className="w-3 h-3" strokeWidth={1.75} />}
        </button>
      </div>

      {/* Progress + meta */}
      <div className="mt-2.5 flex items-center gap-3">
        <div className="flex-1 max-w-[200px] h-[3px] bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#f7f8f8] rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[11px] text-[#62666d] tabular-nums" style={mono}>
          {session.total_recorded}/{totalPhrases} · {progress}%
        </span>
        <span className="ml-auto text-[11px] text-[#62666d]" style={mono}>
          Expire {expiresDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
        </span>
      </div>

      {metaChips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {metaChips.map((chip, i) => (
            <span
              key={i}
              className="inline-flex items-center px-2 h-[20px] rounded-full text-[10px] text-[#d0d6e0]"
              style={{
                ...sans,
                fontWeight: 510,
                background: 'var(--t-surface-hover)',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              {chip}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/* ---------- Helpers ---------- */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] text-[#d0d6e0] mb-1" style={{ ...sans, fontWeight: 510 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function TextInput({
  value, onChange, placeholder, type = 'text',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-[32px] px-3 text-[13px] text-[#f7f8f8] placeholder:text-[#62666d] rounded-md bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] focus:outline-none focus:border-[rgba(255,255,255,0.22)] transition-colors"
      style={sans}
    />
  )
}

function SelectInput({
  value, onChange, options,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-[32px] px-3 text-[13px] text-[#f7f8f8] rounded-md bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] focus:outline-none focus:border-[rgba(255,255,255,0.22)] transition-colors appearance-none cursor-pointer"
      style={sans}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} className="bg-[#191a1b] text-[#f7f8f8]">
          {opt.label}
        </option>
      ))}
    </select>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div
        className="w-10 h-10 rounded-md flex items-center justify-center mb-3"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <X className="w-4 h-4 text-[#8a8f98]" strokeWidth={1.5} />
      </div>
      <p className="text-[13px] text-[#8a8f98]" style={sans}>
        Aucune session. Créez-en une pour commencer les enregistrements.
      </p>
    </div>
  )
}
