import { useState, useRef, useCallback } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import { FileText, ChevronDown, ChevronUp, Plus, Upload, File, X, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { parseTextToPhrases } from '../lib/text-parser'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import type { Phrase, Recording } from '../types/database'

interface PhraseListProps {
  phrases: Phrase[]
  recordings: Recording[]
  projectId: string
  onPhrasesAdded: () => void
}

const ACCEPTED_EXTENSIONS = ['.txt', '.pdf', '.docx']

export function PhraseList({ phrases, recordings, projectId, onPhrasesAdded }: PhraseListProps) {
  const [expanded, setExpanded] = useState(false)
  const [showAddPanel, setShowAddPanel] = useState(false)

  // Add panel state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [manualText, setManualText] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const [addSuccess, setAddSuccess] = useState('')

  const recordedPhraseIds = new Set(recordings.map((r) => r.phrase_id))
  const visiblePhrases = expanded ? phrases : phrases.slice(0, 10)

  const isValidFile = (file: File): boolean => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    return ACCEPTED_EXTENSIONS.includes(ext)
  }

  const handleFileSelect = useCallback((file: File) => {
    if (!isValidFile(file)) {
      setAddError('Format non supporté. Utilisez .txt, .pdf ou .docx.')
      return
    }
    setAddError('')
    setAddSuccess('')
    setSelectedFile(file)
    setManualText('')
  }, [])

  const handleFileInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFileSelect(file)
    },
    [handleFileSelect],
  )

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files?.[0]
      if (file) handleFileSelect(file)
    },
    [handleFileSelect],
  )

  const resetPanel = useCallback(() => {
    setSelectedFile(null)
    setManualText('')
    setAddError('')
    setAddSuccess('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const handleClosePanel = useCallback(() => {
    setShowAddPanel(false)
    resetPanel()
  }, [resetPanel])

  const handleAddPhrases = useCallback(async () => {
    setAdding(true)
    setAddError('')
    setAddSuccess('')

    try {
      // Calculer la prochaine position disponible
      const nextPosition = phrases.length > 0
        ? Math.max(...phrases.map((p) => p.position)) + 1
        : 1

      if (selectedFile) {
        // Upload via Edge Function (Python extrait + insère)
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) throw new Error('Session expirée, veuillez vous reconnecter.')

        const formData = new FormData()
        formData.append('file', selectedFile)
        formData.append('project_id', projectId)
        formData.append('start_position', String(nextPosition))

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-phrases`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: formData,
          },
        )

        const result = await response.json()
        if (!response.ok) {
          const detail = result?.error ?? result?.message ?? null
          const status = response.status
          if (detail) {
            throw new Error(detail)
          } else if (status === 400) {
            throw new Error('Fichier invalide ou paramètre manquant.')
          } else if (status === 500) {
            throw new Error('Erreur serveur lors du traitement. Vérifiez que le fichier n\'est pas corrompu ou protégé.')
          } else {
            throw new Error(`Erreur ${status} lors du traitement du fichier.`)
          }
        }

        const count: number = result.data?.total_phrases ?? 0
        setAddSuccess(`${count} phrase${count > 1 ? 's' : ''} ajoutée${count > 1 ? 's' : ''} avec succès.`)
      } else if (manualText.trim()) {
        // Saisie manuelle → insertion directe, en filtrant les doublons
        const parsed = parseTextToPhrases(manualText)
        if (parsed.length === 0) throw new Error('Aucune phrase détectée dans le texte saisi.')

        const existingNormalized = new Set(phrases.map((p) => p.normalized_content?.toLowerCase().trim() ?? p.content.toLowerCase().trim()))
        const newPhrases = parsed.filter((p) => !existingNormalized.has(p.toLowerCase().trim()))

        if (newPhrases.length === 0) {
          throw new Error('Toutes les phrases saisies existent déjà dans ce projet.')
        }

        const batchSize = 500
        for (let i = 0; i < newPhrases.length; i += batchSize) {
          const batch = newPhrases.slice(i, i + batchSize).map((content, idx) => ({
            project_id: projectId,
            position: nextPosition + i + idx,
            content,
            normalized_content: content.toLowerCase().trim(),
          }))
          const { error: insertError } = await supabase.from('phrases').insert(batch as never)
          if (insertError) throw insertError
        }

        const skipped = parsed.length - newPhrases.length
        const msg = `${newPhrases.length} phrase${newPhrases.length > 1 ? 's' : ''} ajoutée${newPhrases.length > 1 ? 's' : ''}.`
          + (skipped > 0 ? ` (${skipped} doublon${skipped > 1 ? 's' : ''} ignoré${skipped > 1 ? 's' : ''})` : '')
        setAddSuccess(msg)
      } else {
        throw new Error('Choisissez un fichier ou saisissez des phrases manuellement.')
      }

      resetPanel()
      onPhrasesAdded()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de l\'ajout des phrases'
      setAddError(message)
      console.error('Add phrases error:', err)
    } finally {
      setAdding(false)
    }
  }, [selectedFile, manualText, phrases, projectId, resetPanel, onPhrasesAdded])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary-500" />
          <h3
            className="text-base font-bold text-sand-900 dark:text-sand-100"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Phrases ({phrases.length})
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-sand-400">
            {recordedPhraseIds.size}/{phrases.length} enregistrées
          </span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => { setShowAddPanel(!showAddPanel); setAddError(''); setAddSuccess('') }}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            Ajouter
          </Button>
        </div>
      </div>

      {/* Panel ajout de phrases */}
      {showAddPanel && (
        <div className="bg-sand-50 dark:bg-sand-800/50 rounded-xl p-4 mb-4 space-y-3 border border-sand-200/60 dark:border-sand-700 animate-scale-in">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-sand-700 dark:text-sand-300">
              Ajouter des phrases
            </p>
            <button
              type="button"
              onClick={handleClosePanel}
              className="text-sand-400 hover:text-sand-600 dark:hover:text-sand-200 transition-colors"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Zone fichier */}
          {!selectedFile ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors ${
                dragOver
                  ? 'border-primary-400 bg-primary-50/70 dark:bg-primary-900/20'
                  : 'border-sand-300 dark:border-sand-700 hover:border-primary-400 dark:hover:border-primary-500 hover:bg-primary-50/40 dark:hover:bg-primary-900/10'
              }`}
            >
              <Upload className="w-6 h-6 mx-auto mb-1.5 text-sand-400" />
              <p className="text-xs font-medium text-sand-600 dark:text-sand-400">
                Déposer ou cliquer · .txt · .pdf · .docx
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.pdf,.docx"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg px-3 py-2">
              <File className="w-4 h-4 text-primary-500 shrink-0" />
              <span className="text-xs font-medium text-primary-700 dark:text-primary-300 flex-1 truncate">
                {selectedFile.name}
              </span>
              <button
                type="button"
                onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                className="text-primary-400 hover:text-red-500 transition-colors"
                aria-label="Retirer le fichier"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Séparateur */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-sand-200 dark:bg-sand-700" />
            <span className="text-[10px] text-sand-400 uppercase font-medium">ou</span>
            <div className="flex-1 h-px bg-sand-200 dark:bg-sand-700" />
          </div>

          {/* Saisie manuelle */}
          <Textarea
            id="add-phrases-manual"
            label="Saisie manuelle (une phrase par ligne)"
            value={manualText}
            onChange={(e) => { setManualText(e.target.value); setSelectedFile(null) }}
            placeholder={"Nanga def ?\nMaa ngi fi rekk."}
            rows={4}
          />

          {addError && (
            <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
              {addError}
            </p>
          )}
          {addSuccess && (
            <p className="text-xs text-secondary-700 dark:text-secondary-400 bg-secondary-50 dark:bg-secondary-900/20 px-3 py-2 rounded-lg">
              {addSuccess}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={handleClosePanel} disabled={adding}>
              Annuler
            </Button>
            <Button
              size="sm"
              loading={adding}
              onClick={handleAddPhrases}
              disabled={adding || (!selectedFile && !manualText.trim())}
              icon={adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            >
              {adding ? 'Ajout en cours...' : 'Ajouter les phrases'}
            </Button>
          </div>
        </div>
      )}

      {/* Liste des phrases */}
      {phrases.length === 0 ? (
        <p className="text-sm text-sand-400 dark:text-sand-500 py-6 text-center">
          Aucune phrase dans ce projet.
        </p>
      ) : (
        <div className="space-y-1">
          {visiblePhrases.map((phrase) => {
            const isRecorded = recordedPhraseIds.has(phrase.id)
            return (
              <div
                key={phrase.id}
                className={`flex items-start gap-3 py-2.5 px-3 rounded-lg text-sm ${
                  isRecorded
                    ? 'bg-secondary-50/50 dark:bg-secondary-900/10'
                    : 'hover:bg-sand-50 dark:hover:bg-sand-800/50'
                }`}
              >
                <span className="text-sand-400 tabular-nums shrink-0 w-7 text-right text-xs pt-0.5">
                  {phrase.position}
                </span>
                <span className="text-sand-800 dark:text-sand-200 flex-1">{phrase.content}</span>
                {isRecorded && (
                  <span className="shrink-0 w-2 h-2 rounded-full bg-secondary-500 mt-1.5" />
                )}
              </div>
            )
          })}
        </div>
      )}

      {phrases.length > 10 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 mt-3 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
        >
          {expanded ? (
            <><ChevronUp className="w-4 h-4" />Réduire</>
          ) : (
            <><ChevronDown className="w-4 h-4" />Voir les {phrases.length - 10} autres</>
          )}
        </button>
      )}
    </div>
  )
}
