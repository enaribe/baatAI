import { useState, useCallback } from 'react'
import { Link2, Copy, Check, Users, Plus, Loader2, Trash2, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Input } from './ui/input'
import { Select } from './ui/select'
import type { RecordingSession } from '../types/database'

interface SessionListProps {
  sessions: RecordingSession[]
  projectId: string
  totalPhrases: number
  onSessionCreated: () => void
  onSessionDeleted: () => void
}

const sessionStatusLabels: Record<string, string> = {
  pending: 'En attente',
  active: 'Actif',
  completed: 'Terminé',
}

const sessionStatusVariants: Record<string, 'pending' | 'processing' | 'valid'> = {
  pending: 'pending',
  active: 'processing',
  completed: 'valid',
}

export function SessionList({ sessions, projectId, totalPhrases, onSessionCreated, onSessionDeleted }: SessionListProps) {
  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [error, setError] = useState('')

  // Suppression
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState('')

  // Form fields
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

      setSpeakerName('')
      setGender('')
      setAge('')
      setDialect('')
      setCity('')
      setShowForm(false)
      onSessionCreated()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la création de la session'
      setError(message)
      console.error('Create session error:', err)
    } finally {
      setCreating(false)
    }
  }, [projectId, speakerName, gender, age, dialect, city, onSessionCreated])

  const handleDelete = useCallback(async (sessionId: string) => {
    setDeletingId(sessionId)
    setDeleteError('')

    try {
      const { error: deleteErr } = await supabase
        .from('recording_sessions')
        .delete()
        .eq('id', sessionId)

      if (deleteErr) throw deleteErr

      setConfirmDeleteId(null)
      onSessionDeleted()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la suppression'
      setDeleteError(message)
      console.error('Delete session error:', err)
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
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-accent-500" />
          <h3
            className="text-base font-bold text-sand-900 dark:text-sand-100"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Sessions ({sessions.length})
          </h3>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setShowForm(!showForm)} icon={<Plus className="w-3.5 h-3.5" />}>
          Nouvelle session
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-sand-50 dark:bg-sand-800/50 rounded-xl p-4 mb-4 space-y-3 animate-scale-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              id="speaker-name"
              label="Nom du locuteur"
              value={speakerName}
              onChange={(e) => setSpeakerName(e.target.value)}
              placeholder="Optionnel"
            />
            <Select
              id="speaker-gender"
              label="Genre"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              options={[
                { value: 'homme', label: 'Homme' },
                { value: 'femme', label: 'Femme' },
              ]}
              placeholder="Sélectionner..."
            />
            <Input
              id="speaker-age"
              label="Âge"
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="Ex : 35"
            />
            <Input
              id="speaker-dialect"
              label="Dialecte"
              value={dialect}
              onChange={(e) => setDialect(e.target.value)}
              placeholder="Ex : Wolof de Dakar"
            />
            <Input
              id="speaker-city"
              label="Ville"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Ex : Dakar"
            />
          </div>

          {error && (
            <p className="text-sm text-error">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
              Annuler
            </Button>
            <Button size="sm" loading={creating} onClick={handleCreate}>
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Créer la session
            </Button>
          </div>
        </div>
      )}

      {/* Sessions list */}
      {sessions.length === 0 ? (
        <p className="text-sm text-sand-400 dark:text-sand-500 py-4 text-center">
          Aucune session. Créez-en une pour commencer les enregistrements.
        </p>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => {
            const progress = totalPhrases > 0
              ? Math.min(100, Math.round((session.total_recorded / totalPhrases) * 100))
              : 0
            const expiresDate = new Date(session.expires_at)
            const isExpired = expiresDate < new Date()
            const isDeleting = deletingId === session.id

            return (
              <div
                key={session.id}
                className="bg-white dark:bg-sand-900 rounded-xl border border-sand-200/50 dark:border-sand-800 p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-semibold text-sand-800 dark:text-sand-200 truncate">
                      {session.speaker_name || 'Locuteur anonyme'}
                    </span>
                    <Badge variant={isExpired ? 'rejected' : sessionStatusVariants[session.status]}>
                      {isExpired ? 'Expiré' : sessionStatusLabels[session.status]}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => copyLink(session.token)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                      aria-label="Copier le lien d'enregistrement"
                    >
                      {copiedToken === session.token ? (
                        <><Check className="w-3.5 h-3.5 text-secondary-500" />Copié !</>
                      ) : (
                        <><Link2 className="w-3.5 h-3.5" /><Copy className="w-3 h-3" /></>
                      )}
                    </button>
                    <button
                      onClick={() => { setConfirmDeleteId(session.id); setDeleteError('') }}
                      className="text-sand-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                      aria-label="Supprimer la session"
                      disabled={isDeleting}
                    >
                      {isDeleting
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" />
                        : <Trash2 className="w-3.5 h-3.5" />
                      }
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-sand-200 dark:bg-sand-800 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-500 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-sand-400">
                  <span className="tabular-nums">{session.total_recorded}/{totalPhrases} phrases</span>
                  <span>
                    Expire le {expiresDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </span>
                </div>

                {/* Speaker metadata */}
                {session.speaker_metadata && Object.keys(session.speaker_metadata).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {session.speaker_metadata.gender && (
                      <span className="text-xs bg-sand-100 dark:bg-sand-800 text-sand-500 px-2 py-0.5 rounded-full">
                        {session.speaker_metadata.gender}
                      </span>
                    )}
                    {session.speaker_metadata.age && (
                      <span className="text-xs bg-sand-100 dark:bg-sand-800 text-sand-500 px-2 py-0.5 rounded-full">
                        {session.speaker_metadata.age} ans
                      </span>
                    )}
                    {session.speaker_metadata.dialect && (
                      <span className="text-xs bg-sand-100 dark:bg-sand-800 text-sand-500 px-2 py-0.5 rounded-full">
                        {session.speaker_metadata.dialect}
                      </span>
                    )}
                    {session.speaker_metadata.city && (
                      <span className="text-xs bg-sand-100 dark:bg-sand-800 text-sand-500 px-2 py-0.5 rounded-full">
                        {session.speaker_metadata.city}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {deleteError && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-2 text-center">{deleteError}</p>
      )}

      {/* Modale de confirmation suppression session */}
      {confirmDeleteId && sessionToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmDeleteId(null) }}
        >
          <div className="bg-white dark:bg-sand-900 rounded-2xl shadow-xl border border-sand-200/60 dark:border-sand-800 p-6 w-full max-w-[24rem] animate-scale-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-sand-900 dark:text-sand-100" style={{ fontFamily: 'var(--font-heading)' }}>
                  Supprimer ce locuteur ?
                </h2>
                <p className="text-xs text-sand-500 dark:text-sand-400">Tous ses enregistrements seront supprimés.</p>
              </div>
            </div>

            <p className="text-sm text-sand-600 dark:text-sand-400 mb-2">
              La session de{' '}
              <span className="font-semibold text-sand-800 dark:text-sand-200">
                {sessionToDelete.speaker_name || 'Locuteur anonyme'}
              </span>{' '}
              et ses <span className="font-semibold">{sessionToDelete.total_recorded}</span> enregistrement{sessionToDelete.total_recorded > 1 ? 's' : ''} seront définitivement supprimés.
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
                onClick={() => { setConfirmDeleteId(null); setDeleteError('') }}
                disabled={!!deletingId}
              >
                Annuler
              </Button>
              <button
                type="button"
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={!!deletingId}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition-all duration-200 disabled:opacity-50 active:scale-[0.98]"
              >
                {deletingId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {deletingId ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
