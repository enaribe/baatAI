import { useState, useRef, useCallback } from 'react'
import type { FormEvent, ChangeEvent, DragEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Upload, FileText, X, Check, Loader2, File, Globe, Lock, Languages } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/use-auth'
import { parseTextToPhrases } from '../lib/text-parser'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import { Select } from '../components/ui/select'
import { Button } from '../components/ui/button'
import type { ProjectUsageType } from '../types/database'

const LANGUAGES = [
  { value: 'wol', label: 'Wolof' },
  { value: 'fuc', label: 'Pulaar' },
  { value: 'srr', label: 'Sereer' },
  { value: 'bam', label: 'Bambara' },
]

const USAGE_OPTIONS = [
  { value: 'asr', label: 'ASR — Reconnaissance vocale' },
  { value: 'tts', label: 'TTS — Synthèse vocale' },
  { value: 'both', label: 'Les deux (ASR + TTS)' },
]

const ACCEPTED_EXTENSIONS = ['.txt', '.pdf', '.docx']
const ACCEPTED_MIME = [
  'text/plain',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

type Step = 0 | 1 | 2

// Source des phrases : 'file' (traité par Python) ou 'manual' (parsé côté client)
type PhrasesSource = 'file' | 'manual'

export function NewProjectPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Step 0 — Project info
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [targetLanguage, setTargetLanguage] = useState('wol')
  const [usageType, setUsageType] = useState<ProjectUsageType>('asr')
  const [isVolunteer, setIsVolunteer] = useState(false)
  const [rateInput, setRateInput] = useState('5000')
  const [rateError, setRateError] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [requiredLanguages, setRequiredLanguages] = useState<string[]>(['wol'])

  const MIN_RATE = 2000
  const rateValue = isVolunteer ? 0 : parseInt(rateInput, 10) || 0

  // Synchroniser la langue cible avec les langues requises :
  // si on change la langue cible, on s'assure qu'elle est dans requiredLanguages
  const handleTargetLanguageChange = (code: string) => {
    setTargetLanguage(code)
    if (!requiredLanguages.includes(code)) {
      setRequiredLanguages((langs) => [...langs, code])
    }
  }

  const toggleRequiredLanguage = (code: string) => {
    // On ne peut pas décocher la langue cible (obligatoire)
    if (code === targetLanguage) return
    setRequiredLanguages((langs) =>
      langs.includes(code) ? langs.filter((l) => l !== code) : [...langs, code],
    )
  }

  // Step 1 — Phrases
  const [phrasesSource, setPhrasesSource] = useState<PhrasesSource | null>(null)
  const [phrases, setPhrases] = useState<string[]>([])
  const [totalPhrases, setTotalPhrases] = useState(0)
  const [fileName, setFileName] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [manualText, setManualText] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const languageLabel = LANGUAGES.find((l) => l.value === targetLanguage)?.label ?? targetLanguage

  const isValidFile = (file: File): boolean => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    return ACCEPTED_EXTENSIONS.includes(ext) || ACCEPTED_MIME.includes(file.type)
  }

  const handleFileSelect = useCallback((file: File) => {
    if (!isValidFile(file)) {
      setUploadError('Format non supporté. Utilisez un fichier .txt, .pdf ou .docx.')
      return
    }
    setUploadError('')
    setSelectedFile(file)
    setFileName(file.name)
    setPhrases([])
    setTotalPhrases(0)
    setPhrasesSource(null)
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

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => setDragOver(false), [])

  const handleManualParse = useCallback(() => {
    if (!manualText.trim()) return
    const parsed = parseTextToPhrases(manualText)
    setPhrases(parsed)
    setTotalPhrases(parsed.length)
    setPhrasesSource('manual')
    setSelectedFile(null)
    setFileName('')
    setUploadError('')
  }, [manualText])

  const clearPhrases = useCallback(() => {
    setPhrases([])
    setTotalPhrases(0)
    setPhrasesSource(null)
    setFileName('')
    setSelectedFile(null)
    setManualText('')
    setUploadError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const canProceedStep0 = name.trim().length > 0
    && (isVolunteer || rateValue >= MIN_RATE)
  // On peut avancer si on a des phrases (manuelles ou fichier sélectionné)
  const canProceedStep1 = totalPhrases > 0 || selectedFile !== null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSubmitting(true)
    setError('')

    try {
      // 1. Créer le projet
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .insert({
          owner_id: user.id,
          name: name.trim(),
          description: description.trim() || null,
          target_language: targetLanguage,
          language_label: languageLabel,
          usage_type: usageType,
          rate_per_hour_fcfa: rateValue,
          is_public: isPublic,
          required_languages: requiredLanguages,
        } as never)
        .select()
        .single()

      if (projectError) throw projectError

      const project = projectData as unknown as { id: string }

      // Fonction de rollback : supprime le projet si une erreur survient après sa création
      const rollback = async () => {
        await supabase.from('projects').delete().eq('id', project.id)
      }

      try {
        // 2a. Si fichier → le soumettre à l'Edge Function (Python fait l'extraction + insertion)
        if (phrasesSource === 'file' && selectedFile) {
          setUploading(true)

          const { data: { session } } = await supabase.auth.getSession()
          if (!session) throw new Error('Session expirée, veuillez vous reconnecter.')

          const formData = new FormData()
          formData.append('file', selectedFile)
          formData.append('project_id', project.id)

          // Utiliser fetch directement : supabase.functions.invoke perd l'apikey header avec FormData
          const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-phrases`
          const fnRes = await fetch(fnUrl, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: formData,
          })

          setUploading(false)

          const fnJson = await fnRes.json()
          if (!fnRes.ok) {
            throw new Error(fnJson.error ?? 'Erreur du serveur de traitement')
          }
        }

        // 2b. Si saisie manuelle → insertion directe par le frontend
        if (phrasesSource === 'manual' && phrases.length > 0) {
          const batchSize = 500
          for (let i = 0; i < phrases.length; i += batchSize) {
            const batch = phrases.slice(i, i + batchSize).map((content, idx) => ({
              project_id: project.id,
              position: i + idx + 1,
              content,
              normalized_content: content.toLowerCase().trim(),
            }))
            const { error: phrasesError } = await supabase.from('phrases').insert(batch as never)
            if (phrasesError) throw phrasesError
          }
        }

        // 3. Activer le projet
        const { error: updateError } = await supabase
          .from('projects')
          .update({ status: 'active' } as never)
          .eq('id', project.id)
        if (updateError) throw updateError

        navigate(`/project/${project.id}`)
      } catch (innerErr) {
        // Rollback : supprimer le projet créé pour éviter un projet zombie
        await rollback()
        throw innerErr
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la création du projet'
      setError(message)
      console.error('Create project error:', err)
    } finally {
      setSubmitting(false)
      setUploading(false)
    }
  }

  // Lorsque l'utilisateur clique "Suivant" à l'étape 1, si c'est un fichier
  // on fait un upload de preview pour afficher les phrases avant confirmation
  const handlePreviewFile = useCallback(async () => {
    if (!selectedFile || !user) return

    setUploading(true)
    setUploadError('')

    try {
      // Créer un projet temporaire (draft) pour le preview
      // Non — on évite ça. On parse juste pour le preview via une requête dédiée.
      // Pour l'instant : on stocke le fichier et on affiche juste le nom + message.
      // Le parsing réel se fait au submit.
      setPhrasesSource('file')
      setTotalPhrases(-1) // -1 = "sera déterminé par Python"
    } finally {
      setUploading(false)
    }
  }, [selectedFile, user])

  const handleStep1Next = useCallback(async () => {
    if (phrasesSource === null && selectedFile) {
      await handlePreviewFile()
    }
    setStep(2)
  }, [phrasesSource, selectedFile, handlePreviewFile])

  return (
    <div className="p-6 lg:p-8 max-w-[42rem]">
      {/* Header */}
      <button
        onClick={() => navigate('/dashboard')}
        className="inline-flex items-center gap-1.5 text-sm text-sand-500 hover:text-sand-700 dark:text-sand-400 dark:hover:text-sand-200 transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour au dashboard
      </button>

      <h1
        className="text-sand-900 dark:text-sand-100 mb-1"
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 'clamp(1.5rem, 3vw, 2.25rem)',
          fontWeight: 800,
          lineHeight: 1.05,
        }}
      >
        Nouveau projet
      </h1>
      <p className="text-sand-500 dark:text-sand-400 mb-8">
        Configurez votre dataset vocal en quelques étapes.
      </p>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {(['Informations', 'Phrases', 'Confirmation'] as const).map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            {i > 0 && <div className={`w-8 h-px ${i <= step ? 'bg-primary-400' : 'bg-sand-300 dark:bg-sand-700'}`} />}
            <div className="flex items-center gap-1.5">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  i < step
                    ? 'bg-primary-500 text-white'
                    : i === step
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
                      : 'bg-sand-200 text-sand-500 dark:bg-sand-800 dark:text-sand-500'
                }`}
              >
                {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={`text-xs font-medium hidden sm:inline ${
                i <= step ? 'text-sand-700 dark:text-sand-300' : 'text-sand-400 dark:text-sand-600'
              }`}>
                {label}
              </span>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Step 0 — Project info */}
        {step === 0 && (
          <div className="bg-white dark:bg-sand-900 rounded-2xl shadow-sm border border-sand-200/50 dark:border-sand-800 p-6 space-y-5 animate-fade-in-up">
            <Input
              id="project-name"
              label="Nom du projet"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex : Dataset Wolof journalisme"
              required
            />
            <Textarea
              id="project-description"
              label="Description (optionnel)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez le contexte et l'objectif de ce dataset..."
              rows={3}
            />
            <Select
              id="target-language"
              label="Langue cible"
              value={targetLanguage}
              onChange={(e) => handleTargetLanguageChange(e.target.value)}
              options={LANGUAGES}
            />
            <Select
              id="usage-type"
              label="Type d'utilisation"
              value={usageType}
              onChange={(e) => setUsageType(e.target.value as ProjectUsageType)}
              options={USAGE_OPTIONS}
            />

            {/* Tarif de rémunération */}
            <div className="pt-2 border-t border-sand-100 dark:border-sand-800">
              <label htmlFor="rate" className="block text-sm font-semibold text-sand-800 dark:text-sand-200 mb-1.5">
                Rémunération des locuteurs <span className="text-primary-500">*</span>
              </label>
              <p className="text-xs text-sand-500 dark:text-sand-400 mb-3">
                Les locuteurs sont payés à l'heure d'enregistrement validé.
                Fourchette recommandée : <span className="font-semibold text-sand-700 dark:text-sand-300">3 000 – 8 000 FCFA/h</span>.
                Minimum légal : {MIN_RATE.toLocaleString('fr-FR')} FCFA/h.
              </p>

              <div className={`relative ${isVolunteer ? 'opacity-50 pointer-events-none' : ''}`}>
                <input
                  id="rate"
                  type="number"
                  inputMode="numeric"
                  min={MIN_RATE}
                  step={500}
                  value={rateInput}
                  onChange={(e) => {
                    setRateInput(e.target.value)
                    const n = parseInt(e.target.value, 10) || 0
                    if (e.target.value && n < MIN_RATE) {
                      setRateError(`Minimum ${MIN_RATE.toLocaleString('fr-FR')} FCFA/h.`)
                    } else {
                      setRateError('')
                    }
                  }}
                  disabled={isVolunteer}
                  className="w-full pr-20 pl-4 py-2.5 rounded-xl border border-sand-200 dark:border-sand-700 bg-white dark:bg-sand-900 text-sand-900 dark:text-sand-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent tabular-nums"
                  placeholder="5000"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-sand-500 dark:text-sand-400 pointer-events-none">
                  FCFA/h
                </span>
              </div>

              {rateError && !isVolunteer && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1.5">{rateError}</p>
              )}

              <label className="flex items-start gap-2.5 mt-3 p-3 rounded-xl border border-sand-200 dark:border-sand-700 bg-sand-50/50 dark:bg-sand-800/30 cursor-pointer hover:border-sand-300 dark:hover:border-sand-600 transition-colors">
                <input
                  type="checkbox"
                  checked={isVolunteer}
                  onChange={(e) => {
                    setIsVolunteer(e.target.checked)
                    if (e.target.checked) setRateError('')
                  }}
                  className="mt-0.5 w-4 h-4 accent-primary-500 shrink-0"
                />
                <div>
                  <p className="text-sm font-semibold text-sand-800 dark:text-sand-200">Projet bénévole / académique</p>
                  <p className="text-xs text-sand-500 dark:text-sand-400 leading-relaxed">
                    Les locuteurs verront le badge « Bénévole » et sauront qu'ils participent gratuitement.
                  </p>
                </div>
              </label>
            </div>

            {/* Visibilité */}
            <div className="pt-2 border-t border-sand-100 dark:border-sand-800">
              <label className="block text-sm font-semibold text-sand-800 dark:text-sand-200 mb-1.5">
                Visibilité du projet <span className="text-primary-500">*</span>
              </label>
              <p className="text-xs text-sand-500 dark:text-sand-400 mb-3">
                Qui peut voir et postuler à ce projet ?
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsPublic(true)}
                  className={[
                    'relative flex items-start gap-2.5 p-3.5 rounded-xl border-2 text-left transition-all',
                    isPublic
                      ? 'bg-secondary-50 dark:bg-secondary-900/30 border-secondary-400 text-secondary-700 dark:text-secondary-300'
                      : 'border-sand-200 dark:border-sand-700 text-sand-700 dark:text-sand-300 hover:border-sand-300',
                  ].join(' ')}
                >
                  <Globe className="w-4 h-4 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold leading-tight">Public</p>
                    <p className="text-[11px] mt-0.5 opacity-80 leading-snug">
                      Visible par tous les locuteurs qui parlent les langues requises
                    </p>
                  </div>
                  {isPublic && (
                    <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-current flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsPublic(false)}
                  className={[
                    'relative flex items-start gap-2.5 p-3.5 rounded-xl border-2 text-left transition-all',
                    !isPublic
                      ? 'bg-accent-50 dark:bg-accent-900/30 border-accent-400 text-accent-700 dark:text-accent-300'
                      : 'border-sand-200 dark:border-sand-700 text-sand-700 dark:text-sand-300 hover:border-sand-300',
                  ].join(' ')}
                >
                  <Lock className="w-4 h-4 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold leading-tight">Sur invitation</p>
                    <p className="text-[11px] mt-0.5 opacity-80 leading-snug">
                      Seuls les locuteurs que vous invitez voient le projet
                    </p>
                  </div>
                  {!isPublic && (
                    <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-current flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Langues requises */}
            <div className="pt-2 border-t border-sand-100 dark:border-sand-800">
              <label className="block text-sm font-semibold text-sand-800 dark:text-sand-200 mb-1.5">
                <Languages className="w-4 h-4 inline -mt-0.5 mr-1" />
                Langues acceptées
              </label>
              <p className="text-xs text-sand-500 dark:text-sand-400 mb-3">
                Les locuteurs doivent parler au moins une de ces langues.
                La langue cible est obligatoire.
              </p>

              <div className="flex flex-wrap gap-1.5">
                {LANGUAGES.map((lang) => {
                  const active = requiredLanguages.includes(lang.value)
                  const isTarget = lang.value === targetLanguage
                  return (
                    <button
                      key={lang.value}
                      type="button"
                      onClick={() => toggleRequiredLanguage(lang.value)}
                      disabled={isTarget}
                      className={[
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
                        isTarget
                          ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-400 text-primary-700 dark:text-primary-300 cursor-default'
                          : active
                            ? 'bg-secondary-50 dark:bg-secondary-900/30 border-secondary-400 text-secondary-700 dark:text-secondary-300'
                            : 'border-sand-200 dark:border-sand-700 text-sand-600 dark:text-sand-400 hover:border-sand-300',
                      ].join(' ')}
                    >
                      {active && <Check className="w-3 h-3" />}
                      {lang.label}
                      {isTarget && <span className="text-[9px] opacity-70">(cible)</span>}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="button"
                disabled={!canProceedStep0}
                onClick={() => setStep(1)}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Suivant
              </Button>
            </div>
          </div>
        )}

        {/* Step 1 — Phrases */}
        {step === 1 && (
          <div className="bg-white dark:bg-sand-900 rounded-2xl shadow-sm border border-sand-200/50 dark:border-sand-800 p-6 space-y-5 animate-fade-in-up">
            <p className="text-sm text-sand-600 dark:text-sand-400">
              Importez un fichier (.txt, .pdf, .docx) ou saisissez vos phrases manuellement.
            </p>

            {/* Zone de dépôt de fichier */}
            {!selectedFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  dragOver
                    ? 'border-primary-400 bg-primary-50/70 dark:bg-primary-900/20'
                    : 'border-sand-300 dark:border-sand-700 hover:border-primary-400 dark:hover:border-primary-500 hover:bg-primary-50/50 dark:hover:bg-primary-900/10'
                }`}
              >
                <Upload className="w-8 h-8 mx-auto mb-2 text-sand-400" />
                <p className="text-sm font-medium text-sand-700 dark:text-sand-300">
                  Cliquez ou déposez un fichier ici
                </p>
                <p className="text-xs text-sand-400 mt-1">.txt · .pdf · .docx</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.pdf,.docx"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>
            ) : (
              /* Fichier sélectionné */
              <div className="flex items-center gap-3 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl px-4 py-3">
                <File className="w-5 h-5 text-primary-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary-700 dark:text-primary-300 truncate">
                    {fileName}
                  </p>
                  <p className="text-xs text-primary-500 dark:text-primary-400">
                    Sera traité par le serveur lors de la création
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearPhrases}
                  className="text-primary-400 hover:text-red-500 transition-colors shrink-0"
                  aria-label="Retirer le fichier"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {uploadError && (
              <p className="text-xs text-red-600 dark:text-red-400">{uploadError}</p>
            )}

            {/* Séparateur */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-sand-200 dark:bg-sand-800" />
              <span className="text-xs text-sand-400 uppercase font-medium">ou</span>
              <div className="flex-1 h-px bg-sand-200 dark:bg-sand-800" />
            </div>

            {/* Saisie manuelle */}
            <div className="space-y-2">
              <Textarea
                id="manual-phrases"
                label="Saisie manuelle"
                value={manualText}
                onChange={(e) => {
                  setManualText(e.target.value)
                  // Réinitialiser si on re-tape après avoir validé
                  if (phrasesSource === 'manual') {
                    setPhrases([])
                    setTotalPhrases(0)
                    setPhrasesSource(null)
                  }
                }}
                placeholder={"Saisissez vos phrases, une par ligne...\nExemple : Nanga def ?\nMaa ngi fi rekk."}
                rows={6}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleManualParse}
                disabled={!manualText.trim()}
              >
                Valider les phrases
              </Button>
            </div>

            {/* Preview phrases manuelles */}
            {phrasesSource === 'manual' && phrases.length > 0 && (
              <div className="bg-sand-50 dark:bg-sand-800/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary-500" />
                    <span className="text-sm font-semibold text-sand-700 dark:text-sand-300">
                      {phrases.length} phrase{phrases.length > 1 ? 's' : ''} saisie{phrases.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={clearPhrases}
                    className="text-sand-400 hover:text-red-500 transition-colors"
                    aria-label="Supprimer les phrases"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1 text-sm">
                  {phrases.slice(0, 20).map((phrase, i) => (
                    <div key={i} className="flex gap-2 py-1 border-b border-sand-200/50 dark:border-sand-700/50 last:border-0">
                      <span className="text-sand-400 tabular-nums shrink-0 w-6 text-right">{i + 1}.</span>
                      <span className="text-sand-700 dark:text-sand-300">{phrase}</span>
                    </div>
                  ))}
                  {phrases.length > 20 && (
                    <p className="text-xs text-sand-400 pt-2">
                      ... et {phrases.length - 20} autres phrases
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button type="button" variant="ghost" onClick={() => setStep(0)}>
                <ArrowLeft className="w-4 h-4" />
                Retour
              </Button>
              <Button
                type="button"
                disabled={!canProceedStep1 || uploading}
                loading={uploading}
                onClick={handleStep1Next}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Suivant
              </Button>
            </div>
          </div>
        )}

        {/* Step 2 — Confirmation */}
        {step === 2 && (
          <div className="bg-white dark:bg-sand-900 rounded-2xl shadow-sm border border-sand-200/50 dark:border-sand-800 p-6 space-y-5 animate-fade-in-up">
            <h2
              className="text-lg font-bold text-sand-900 dark:text-sand-100"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Récapitulatif
            </h2>

            <div className="space-y-3">
              <SummaryRow label="Nom" value={name} />
              {description && <SummaryRow label="Description" value={description} />}
              <SummaryRow label="Langue" value={languageLabel} />
              <SummaryRow label="Utilisation" value={usageType.toUpperCase()} />
              <SummaryRow
                label="Rémunération"
                value={isVolunteer
                  ? 'Bénévole'
                  : `${rateValue.toLocaleString('fr-FR')} FCFA/h`}
              />
              <SummaryRow
                label="Visibilité"
                value={isPublic ? 'Public' : 'Sur invitation'}
              />
              <SummaryRow
                label="Langues acceptées"
                value={
                  requiredLanguages
                    .map((c) => LANGUAGES.find((l) => l.value === c)?.label ?? c)
                    .join(', ') || '—'
                }
              />
              {phrasesSource === 'file' && fileName && (
                <SummaryRow label="Fichier" value={fileName} />
              )}
              {phrasesSource === 'manual' && totalPhrases > 0 && (
                <SummaryRow
                  label="Phrases"
                  value={`${totalPhrases} phrase${totalPhrases > 1 ? 's' : ''}`}
                />
              )}
              {phrasesSource === 'file' && (
                <div className="flex items-start justify-between py-2 border-b border-sand-100 dark:border-sand-800">
                  <span className="text-sm text-sand-500 dark:text-sand-400">Phrases</span>
                  <span className="text-sm font-medium text-sand-500 dark:text-sand-400 italic">
                    Extraites à la création
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-between pt-4 border-t border-sand-100 dark:border-sand-800">
              <Button type="button" variant="ghost" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4" />
                Retour
              </Button>
              <Button type="submit" loading={submitting} size="lg">
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {uploading ? 'Traitement du fichier...' : 'Création...'}
                  </>
                ) : (
                  'Créer le projet'
                )}
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}

interface SummaryRowProps {
  label: string
  value: string
}

function SummaryRow({ label, value }: SummaryRowProps) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-sand-100 dark:border-sand-800 last:border-0">
      <span className="text-sm text-sand-500 dark:text-sand-400">{label}</span>
      <span className="text-sm font-medium text-sand-800 dark:text-sand-200 text-right max-w-[60%]">{value}</span>
    </div>
  )
}
