import { useState, useRef, useCallback } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import {
  FileText, ChevronDown, ChevronUp, Plus, Upload, File, X, Loader2,
  CheckCircle2,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { parseTextToPhrases } from '../lib/text-parser'
import type { Phrase, Recording } from '../types/database'

const sans = { fontFamily: 'var(--font-body)', fontFeatureSettings: "'cv01','ss03'" }
const mono = { fontFamily: 'var(--font-mono)' }

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

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [manualText, setManualText] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const [addSuccess, setAddSuccess] = useState('')

  const recordedPhraseIds = new Set(recordings.map((r) => r.phrase_id))
  const visiblePhrases = expanded ? phrases : phrases.slice(0, 15)

  const isValidFile = (file: File): boolean => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    return ACCEPTED_EXTENSIONS.includes(ext)
  }

  const handleFileSelect = useCallback((file: File) => {
    if (!isValidFile(file)) {
      setAddError('Format non supporté. Utilisez .txt, .pdf ou .docx.')
      return
    }
    setAddError(''); setAddSuccess('')
    setSelectedFile(file); setManualText('')
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
      e.preventDefault(); setDragOver(false)
      const file = e.dataTransfer.files?.[0]
      if (file) handleFileSelect(file)
    },
    [handleFileSelect],
  )

  const resetPanel = useCallback(() => {
    setSelectedFile(null); setManualText(''); setAddError(''); setAddSuccess('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const handleClosePanel = useCallback(() => {
    setShowAddPanel(false); resetPanel()
  }, [resetPanel])

  const handleAddPhrases = useCallback(async () => {
    setAdding(true); setAddError(''); setAddSuccess('')
    try {
      const nextPosition = phrases.length > 0
        ? Math.max(...phrases.map((p) => p.position)) + 1
        : 1

      if (selectedFile) {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) throw new Error('Session expirée, reconnectez-vous.')

        const formData = new FormData()
        formData.append('file', selectedFile)
        formData.append('project_id', projectId)
        formData.append('start_position', String(nextPosition))

        const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-phrases`
        const fnRes = await fetch(fnUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: formData,
        })
        const fnJson = await fnRes.json()
        if (!fnRes.ok) throw new Error(fnJson.error ?? 'Erreur du serveur')
        const count: number = fnJson.data?.total_phrases ?? 0
        setAddSuccess(`${count} phrase${count > 1 ? 's' : ''} ajoutée${count > 1 ? 's' : ''}.`)
      } else if (manualText.trim()) {
        const parsed = parseTextToPhrases(manualText)
        if (parsed.length === 0) throw new Error('Aucune phrase détectée.')

        const existingNormalized = new Set(
          phrases.map((p) => p.normalized_content?.toLowerCase().trim() ?? p.content.toLowerCase().trim()),
        )
        const newPhrases = parsed.filter((p) => !existingNormalized.has(p.toLowerCase().trim()))

        if (newPhrases.length === 0) {
          throw new Error('Toutes les phrases saisies existent déjà.')
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
        setAddSuccess(
          `${newPhrases.length} phrase${newPhrases.length > 1 ? 's' : ''} ajoutée${newPhrases.length > 1 ? 's' : ''}.` +
          (skipped > 0 ? ` (${skipped} doublon${skipped > 1 ? 's' : ''} ignoré${skipped > 1 ? 's' : ''})` : ''),
        )
      } else {
        throw new Error('Choisissez un fichier ou saisissez des phrases.')
      }

      resetPanel()
      onPhrasesAdded()
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Erreur lors de l\'ajout')
    } finally {
      setAdding(false)
    }
  }, [selectedFile, manualText, phrases, projectId, resetPanel, onPhrasesAdded])

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center gap-2 h-[36px] mb-2 -mx-5 lg:-mx-8 px-5 lg:px-8 border-b border-[rgba(255,255,255,0.05)]">
        <ChevronDown className="w-3 h-3 text-[#8a8f98]" strokeWidth={2} />
        <span className="text-[12px] text-[#f7f8f8]" style={{ ...sans, fontWeight: 510 }}>
          Phrases
        </span>
        <span className="text-[11px] text-[#62666d]" style={mono}>
          {phrases.length}
        </span>
        {phrases.length > 0 && (
          <>
            <span className="text-[#3e3e44]">·</span>
            <span className="text-[11px] text-[#10b981] tabular-nums" style={mono}>
              {recordedPhraseIds.size} enregistrées
            </span>
          </>
        )}
        <button
          onClick={() => { setShowAddPanel(!showAddPanel); setAddError(''); setAddSuccess('') }}
          className="ml-auto inline-flex items-center gap-1 h-[26px] px-2.5 text-[12px] rounded-md transition-colors"
          style={{
            ...sans,
            fontWeight: 510,
            color: 'var(--t-fg)',
            background: showAddPanel ? 'rgba(255,255,255,0.08)' : 'var(--t-surface-active)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <Plus className="w-3 h-3" strokeWidth={2} />
          Ajouter
        </button>
      </div>

      {/* Panel ajout */}
      {showAddPanel && (
        <div
          className="rounded-[8px] p-4 mb-3 animate-scale-in"
          style={{
            background: 'var(--t-surface)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-[13px] text-[#f7f8f8]" style={{ ...sans, fontWeight: 510 }}>
              Ajouter des phrases
            </p>
            <button
              onClick={handleClosePanel}
              className="w-[22px] h-[22px] flex items-center justify-center rounded-sm text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
            >
              <X className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
          </div>

          {/* Zone fichier */}
          {!selectedFile ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              className="rounded-md p-5 text-center cursor-pointer transition-colors"
              style={{
                background: dragOver ? 'var(--t-accent-muted-bg)' : 'var(--t-surface)',
                border: `1px dashed ${dragOver ? 'var(--t-accent-muted-border)' : 'rgba(255,255,255,0.15)'}`,
              }}
            >
              <Upload className="w-5 h-5 mx-auto mb-2 text-[#8a8f98]" strokeWidth={1.75} />
              <p className="text-[12px] text-[#d0d6e0]" style={sans}>
                Déposer un fichier ou cliquer
              </p>
              <p className="text-[11px] text-[#62666d] mt-0.5" style={mono}>
                .txt · .pdf · .docx
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
            <div
              className="flex items-center gap-2 rounded-md px-3 py-2.5"
              style={{
                background: 'var(--t-accent-muted-bg)',
                border: '1px solid var(--t-accent-muted-border)',
              }}
            >
              <File className="w-4 h-4 text-[#828fff] shrink-0" strokeWidth={1.75} />
              <span className="text-[12px] text-[#f7f8f8] flex-1 truncate" style={sans}>
                {selectedFile.name}
              </span>
              <button
                onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                className="text-[#8a8f98] hover:text-[#fca5a5] transition-colors"
              >
                <X className="w-3.5 h-3.5" strokeWidth={1.75} />
              </button>
            </div>
          )}

          {/* Séparateur */}
          <div className="flex items-center gap-2 my-4">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <span className="text-[10px] text-[#62666d] uppercase" style={{ ...sans, fontWeight: 510, letterSpacing: '0.08em' }}>
              ou
            </span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
          </div>

          {/* Saisie manuelle */}
          <div>
            <label className="block text-[12px] text-[#d0d6e0] mb-1.5" style={{ ...sans, fontWeight: 510 }}>
              Saisie manuelle (une phrase par ligne)
            </label>
            <div
              className="rounded-md px-3 py-2.5"
              style={{
                background: 'var(--t-surface)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <textarea
                value={manualText}
                onChange={(e) => { setManualText(e.target.value); setSelectedFile(null) }}
                placeholder={'Nanga def ?\nMaa ngi fi rekk.'}
                rows={4}
                className="w-full bg-transparent border-0 outline-none text-[#f7f8f8] text-[13px] resize-y"
                style={{ ...sans, lineHeight: 1.5, minHeight: 80 }}
              />
            </div>
          </div>

          {addError && (
            <div
              className="mt-3 flex items-start gap-2 px-3 py-2 rounded-md text-[12px] text-[#fca5a5]"
              style={{
                ...sans,
                background: 'var(--t-danger-muted-bg)',
                border: '1px solid var(--t-danger-muted-border)',
              }}
            >
              {addError}
            </div>
          )}
          {addSuccess && (
            <div
              className="mt-3 flex items-start gap-2 px-3 py-2 rounded-md text-[12px] text-[#10b981]"
              style={{
                ...sans,
                background: 'var(--t-success-muted-bg)',
                border: '1px solid var(--t-success-muted-border)',
              }}
            >
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" strokeWidth={1.75} />
              <span>{addSuccess}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={handleClosePanel}
              disabled={adding}
              className="h-[30px] px-3 text-[12px] rounded-md text-[#d0d6e0] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
              style={{ ...sans, fontWeight: 510 }}
            >
              Annuler
            </button>
            <button
              onClick={handleAddPhrases}
              disabled={adding || (!selectedFile && !manualText.trim())}
              className="inline-flex items-center gap-1.5 h-[30px] px-3 text-[12px] rounded-md transition-colors disabled:opacity-40"
              style={{
                ...sans,
                fontWeight: 510,
                color: '#ffffff',
                background: '#5e6ad2',
              }}
            >
              {adding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" strokeWidth={2} />}
              {adding ? 'Ajout…' : 'Ajouter les phrases'}
            </button>
          </div>
        </div>
      )}

      {/* Liste */}
      {phrases.length === 0 ? (
        <EmptyState />
      ) : (
        <div
          className="rounded-[8px] overflow-hidden"
          style={{
            background: 'var(--t-surface)',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          {visiblePhrases.map((phrase, idx) => {
            const isRecorded = recordedPhraseIds.has(phrase.id)
            const last = idx === visiblePhrases.length - 1
            return (
              <div
                key={phrase.id}
                className="flex items-start gap-3 px-4 py-2.5 hover:bg-[rgba(255,255,255,0.025)] transition-colors"
                style={{
                  borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.04)',
                }}
              >
                <span
                  className="text-[11px] text-[#62666d] tabular-nums shrink-0 w-8 text-right"
                  style={mono}
                >
                  #{phrase.position}
                </span>
                {isRecorded ? (
                  <CheckCircle2 className="w-3 h-3 text-[#10b981] shrink-0 mt-0.5" strokeWidth={2} />
                ) : (
                  <span className="w-3 h-3 rounded-full border border-[#3e3e44] shrink-0 mt-0.5" />
                )}
                <span className="text-[13px] text-[#f7f8f8] flex-1" style={sans}>
                  {phrase.content}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {phrases.length > 15 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center gap-1 mt-3 text-[12px] text-[#8a8f98] hover:text-[#f7f8f8] transition-colors"
          style={{ ...sans, fontWeight: 510 }}
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" strokeWidth={1.75} />
              Réduire
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" strokeWidth={1.75} />
              Voir les {phrases.length - 15} autres
            </>
          )}
        </button>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div
        className="w-10 h-10 rounded-md flex items-center justify-center mb-3"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <FileText className="w-4 h-4 text-[#8a8f98]" strokeWidth={1.5} />
      </div>
      <p className="text-[13px] text-[#8a8f98]" style={sans}>
        Aucune phrase dans ce projet.
      </p>
    </div>
  )
}
