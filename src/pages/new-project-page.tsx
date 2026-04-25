import { useState, useRef, useCallback } from 'react'
import type { FormEvent, ChangeEvent, DragEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, Upload, FileText, X, Check, Loader2, File,
  Globe, Lock, Languages, Type, AlertCircle, FolderPlus, Pencil, Sparkles,
  Languages as LanguagesIcon,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/use-auth'
import { parseTextToPhrases } from '../lib/text-parser'
import { Stepper } from '../components/ui/stepper'
import type { ProjectUsageType } from '../types/database'

const sans = { fontFamily: 'var(--font-body)', fontFeatureSettings: "'cv01','ss03'" }
const mono = { fontFamily: 'var(--font-mono)' }

const LANGUAGES = [
  { value: 'wol', label: 'Wolof' },
  { value: 'fuc', label: 'Pulaar' },
  { value: 'srr', label: 'Sereer' },
  { value: 'bam', label: 'Bambara' },
]

const USAGE_OPTIONS: { value: ProjectUsageType; label: string; desc: string }[] = [
  { value: 'asr', label: 'ASR', desc: 'Reconnaissance vocale' },
  { value: 'tts', label: 'TTS', desc: 'Synthèse vocale' },
  { value: 'both', label: 'ASR + TTS', desc: 'Les deux' },
]

const ACCEPTED_EXTENSIONS = ['.txt', '.pdf', '.docx']
const ACCEPTED_MIME = [
  'text/plain',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]
const MIN_RATE = 2000
const STEP_LABELS = ['Infos', 'Phrases', 'Récap']

type Step = 0 | 1 | 2
type PhrasesSource = 'file' | 'manual' | 'ai' | 'import-translate'

const IMPORT_TRANSLATE_EXT = ['.txt', '.md']
const IMPORT_TRANSLATE_MAX_MB = 5

const AI_PRESETS = [500, 1000, 2000, 5000]
const AI_MIN = 100
const AI_MAX = 5000

export function NewProjectPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Étape 0
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [targetLanguage, setTargetLanguage] = useState('wol')
  const [usageType, setUsageType] = useState<ProjectUsageType>('asr')
  const [isVolunteer, setIsVolunteer] = useState(false)
  const [rateInput, setRateInput] = useState('5000')
  const [isPublic, setIsPublic] = useState(true)
  const [requiredLanguages, setRequiredLanguages] = useState<string[]>(['wol'])

  // Étape 1
  const [phrasesSource, setPhrasesSource] = useState<PhrasesSource | null>(null)
  const [phrases, setPhrases] = useState<string[]>([])
  const [totalPhrases, setTotalPhrases] = useState(0)
  const [fileName, setFileName] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [manualText, setManualText] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  // Étape 1 — mode IA
  const [aiTheme, setAiTheme] = useState('')
  const [aiTotalCount, setAiTotalCount] = useState<number>(2000)

  // Étape 1 — mode import + traduction
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importTitle, setImportTitle] = useState('')
  const [importError, setImportError] = useState('')
  const importInputRef = useRef<HTMLInputElement>(null)

  const languageLabel = LANGUAGES.find((l) => l.value === targetLanguage)?.label ?? targetLanguage
  const rateValue = isVolunteer ? 0 : parseInt(rateInput, 10) || 0

  const handleTargetLanguageChange = (code: string) => {
    setTargetLanguage(code)
    if (!requiredLanguages.includes(code)) setRequiredLanguages((l) => [...l, code])
  }

  const toggleRequiredLanguage = (code: string) => {
    if (code === targetLanguage) return
    setRequiredLanguages((l) => (l.includes(code) ? l.filter((x) => x !== code) : [...l, code]))
  }

  const isValidFile = (file: File): boolean => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    return ACCEPTED_EXTENSIONS.includes(ext) || ACCEPTED_MIME.includes(file.type)
  }

  const handleFileSelect = useCallback((file: File) => {
    if (!isValidFile(file)) {
      setUploadError('Format non supporté. Utilisez .txt, .pdf ou .docx.')
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

  const handleFileInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
  }, [handleFileSelect])

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileSelect(file)
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleImportFileSelect = useCallback((file: File) => {
    setImportError('')
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!IMPORT_TRANSLATE_EXT.includes(ext)) {
      setImportError(`Format non supporté. Utilisez ${IMPORT_TRANSLATE_EXT.join(' ou ')}`)
      return
    }
    if (file.size > IMPORT_TRANSLATE_MAX_MB * 1024 * 1024) {
      setImportError(`Fichier trop volumineux (max ${IMPORT_TRANSLATE_MAX_MB} MB)`)
      return
    }
    setImportFile(file)
    if (!importTitle.trim()) {
      // Auto-rempli le titre avec le nom du fichier sans l'extension
      const baseName = file.name.replace(/\.(txt|md)$/i, '').slice(0, 80)
      setImportTitle(baseName)
    }
  }, [importTitle])

  const handleImportFileInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleImportFileSelect(file)
  }, [handleImportFileSelect])

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
    setPhrases([]); setTotalPhrases(0); setPhrasesSource(null)
    setFileName(''); setSelectedFile(null); setManualText(''); setUploadError('')
    setAiTheme('')
    setImportFile(null); setImportTitle(''); setImportError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (importInputRef.current) importInputRef.current.value = ''
  }, [])

  const aiThemeValid = aiTheme.trim().length >= 5 && aiTheme.trim().length <= 200
  const aiCountValid = aiTotalCount >= AI_MIN && aiTotalCount <= AI_MAX
  const importValid = importFile !== null && importTitle.trim().length >= 3

  const canProceedStep0 = name.trim().length > 0 && (isVolunteer || rateValue >= MIN_RATE)
  const canProceedStep1 =
    totalPhrases > 0 ||
    selectedFile !== null ||
    (phrasesSource === 'ai' && aiThemeValid && aiCountValid) ||
    (phrasesSource === 'import-translate' && importValid)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSubmitting(true)
    setError('')

    try {
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

      const rollback = async () => {
        await supabase.from('projects').delete().eq('id', project.id)
      }

      try {
        if (phrasesSource === 'file' && selectedFile) {
          setUploading(true)
          const { data: { session } } = await supabase.auth.getSession()
          if (!session) throw new Error('Session expirée, reconnectez-vous.')

          const formData = new FormData()
          formData.append('file', selectedFile)
          formData.append('project_id', project.id)

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
          if (!fnRes.ok) throw new Error(fnJson.error ?? 'Erreur du serveur')
        }

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

        if (phrasesSource === 'ai') {
          const { data: { session } } = await supabase.auth.getSession()
          if (!session) throw new Error('Session expirée, reconnectez-vous.')
          const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-subtopics-plan`
          const fnRes = await fetch(fnUrl, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              project_id: project.id,
              theme: aiTheme.trim(),
              language: languageLabel,
              total_count: aiTotalCount,
            }),
          })
          const fnJson = await fnRes.json()
          if (!fnRes.ok) throw new Error(fnJson.error ?? 'Erreur lors de la génération du plan')
        }

        if (phrasesSource === 'import-translate' && importFile) {
          setUploading(true)
          const { data: { session } } = await supabase.auth.getSession()
          if (!session) throw new Error('Session expirée, reconnectez-vous.')

          const formData = new FormData()
          formData.append('file', importFile)
          formData.append('project_id', project.id)
          formData.append('subtopic_title', importTitle.trim())

          const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-document-translate`
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
          if (!fnRes.ok) throw new Error(fnJson.error ?? "Erreur lors de l'import")
        }

        const { error: updateError } = await supabase
          .from('projects')
          .update({ status: 'active' } as never)
          .eq('id', project.id)
        if (updateError) throw updateError

        if (phrasesSource === 'ai' || phrasesSource === 'import-translate') {
          navigate(`/project/${project.id}?tab=phrases`)
        } else {
          navigate(`/project/${project.id}?tab=recruitment&invite=1`)
        }
      } catch (innerErr) {
        await rollback()
        throw innerErr
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création')
      console.error('Create project error:', err)
    } finally {
      setSubmitting(false)
      setUploading(false)
    }
  }

  const handleStep1Next = useCallback(async () => {
    if (phrasesSource === null && selectedFile) {
      setPhrasesSource('file')
      setTotalPhrases(-1)
    }
    setStep(2)
  }, [phrasesSource, selectedFile])

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-10 flex items-center gap-3 px-5 lg:px-8 h-[52px] border-b border-[rgba(255,255,255,0.05)] bg-[rgba(8,9,10,0.9)] backdrop-blur-md">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-[12px] text-[#8a8f98] hover:text-[#f7f8f8] transition-colors"
          style={sans}
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
          Dashboard
        </Link>
        <span className="w-px h-3 bg-[rgba(255,255,255,0.1)]" />
        <FolderPlus className="w-[13px] h-[13px] text-[#8a8f98]" strokeWidth={1.75} />
        <span className="text-[13px] text-[#f7f8f8]" style={{ ...sans, fontWeight: 510 }}>
          Nouveau projet
        </span>
        <span className="text-[11px] text-[#62666d] ml-1" style={mono}>
          /project/new
        </span>
        <div className="ml-auto">
          <Stepper
            current={step + 1}
            total={3}
            labels={STEP_LABELS}
            onJump={(n) => n - 1 < step && setStep((n - 1) as Step)}
          />
        </div>
      </header>

      <form onSubmit={handleSubmit} className="max-w-[720px] mx-auto px-5 lg:px-8 py-10">
        {error && (
          <div
            className="mb-6 flex items-start gap-2 px-3 py-2.5 rounded-md text-[12px] text-[#fca5a5] border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)]"
            style={sans}
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Étape 0 */}
        {step === 0 && (
          <div className="flex flex-col gap-8">
            <div>
              <h1
                className="text-[28px] text-[#f7f8f8] m-0"
                style={{ ...sans, fontWeight: 510, lineHeight: 1.1, letterSpacing: '-0.5px' }}
              >
                Configurez votre projet
              </h1>
              <p className="text-[14px] text-[#8a8f98] mt-2" style={sans}>
                Informations générales, rémunération, et visibilité.
              </p>
            </div>

            <Section title="Informations">
              <FieldBlock label="Nom du projet" required>
                <TextInput value={name} onChange={setName} placeholder="Ex : Dataset Wolof journalisme" />
              </FieldBlock>
              <FieldBlock label="Description" hint="Optionnel">
                <TextArea value={description} onChange={setDescription} placeholder="Décrivez le contexte et l'objectif…" rows={3} />
              </FieldBlock>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FieldBlock label="Langue cible">
                  <div className="flex flex-wrap gap-1.5">
                    {LANGUAGES.map((l) => (
                      <LangPill
                        key={l.value}
                        active={targetLanguage === l.value}
                        onClick={() => handleTargetLanguageChange(l.value)}
                      >
                        {l.label}
                      </LangPill>
                    ))}
                  </div>
                </FieldBlock>
                <FieldBlock label="Type d'utilisation">
                  <div className="grid grid-cols-3 gap-1.5">
                    {USAGE_OPTIONS.map((u) => {
                      const on = usageType === u.value
                      return (
                        <button
                          key={u.value}
                          type="button"
                          onClick={() => setUsageType(u.value)}
                          className="px-2 py-2 rounded-md text-left transition-colors"
                          style={{
                            ...sans,
                            fontWeight: 510,
                            color: on ? 'var(--t-fg)' : 'var(--t-fg-2)',
                            background: on ? 'rgba(255,255,255,0.06)' : 'var(--t-surface)',
                            border: `1px solid ${on ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)'}`,
                          }}
                        >
                          <div className="text-[12px]">{u.label}</div>
                          <div className="text-[10px] text-[#8a8f98] mt-0.5">{u.desc}</div>
                        </button>
                      )
                    })}
                  </div>
                </FieldBlock>
              </div>
            </Section>

            <Section title="Rémunération">
              <p className="text-[12px] text-[#8a8f98]" style={sans}>
                Recommandé : 3 000 – 8 000 FCFA/h. Minimum 2 000 FCFA/h.
              </p>
              <div className={`relative ${isVolunteer ? 'opacity-40 pointer-events-none' : ''}`}>
                <input
                  type="number"
                  min={MIN_RATE}
                  step={500}
                  value={rateInput}
                  onChange={(e) => setRateInput(e.target.value)}
                  disabled={isVolunteer}
                  className="w-full h-[36px] pl-3 pr-16 text-[14px] text-[#f7f8f8] rounded-md bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] focus:outline-none focus:border-[rgba(255,255,255,0.22)] tabular-nums"
                  style={sans}
                />
                <span
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-[#62666d] pointer-events-none"
                  style={mono}
                >
                  FCFA/h
                </span>
              </div>
              <label
                className="flex items-start gap-2.5 p-3 rounded-md cursor-pointer"
                style={{
                  background: 'var(--t-surface)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <input
                  type="checkbox"
                  checked={isVolunteer}
                  onChange={(e) => setIsVolunteer(e.target.checked)}
                  className="mt-0.5 w-3.5 h-3.5 accent-[#5e6ad2] shrink-0"
                />
                <div>
                  <p className="text-[13px] text-[#f7f8f8]" style={{ ...sans, fontWeight: 510 }}>
                    Projet bénévole / académique
                  </p>
                  <p className="text-[11px] text-[#8a8f98] mt-0.5" style={sans}>
                    Les locuteurs verront le badge « Bénévole ».
                  </p>
                </div>
              </label>
            </Section>

            <Section title="Visibilité">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <VisibilityCard
                  active={isPublic}
                  onClick={() => setIsPublic(true)}
                  icon={<Globe className="w-3.5 h-3.5" strokeWidth={1.75} />}
                  title="Public"
                  desc="Visible par tous les locuteurs parlant les langues requises"
                />
                <VisibilityCard
                  active={!isPublic}
                  onClick={() => setIsPublic(false)}
                  icon={<Lock className="w-3.5 h-3.5" strokeWidth={1.75} />}
                  title="Sur invitation"
                  desc="Seuls les locuteurs que vous invitez voient le projet"
                />
              </div>
            </Section>

            <Section title="Langues acceptées" subtitle="La langue cible est obligatoire. Ajoutez-en d'autres si besoin.">
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
                      className="inline-flex items-center gap-1.5 px-3 h-[28px] rounded-full text-[12px] transition-colors"
                      style={{
                        ...sans,
                        fontWeight: 510,
                        color: isTarget ? 'var(--t-fg)' : active ? 'var(--t-fg)' : 'var(--t-fg-2)',
                        background: isTarget
                          ? 'var(--t-accent-muted-bg)'
                          : active
                            ? 'rgba(255,255,255,0.06)'
                            : 'var(--t-surface)',
                        border: `1px solid ${
                          isTarget
                            ? 'var(--t-accent-muted-border)'
                            : active
                              ? 'rgba(255,255,255,0.22)'
                              : 'rgba(255,255,255,0.08)'
                        }`,
                        cursor: isTarget ? 'default' : 'pointer',
                      }}
                    >
                      {active && <Check className="w-3 h-3" strokeWidth={2} />}
                      {lang.label}
                      {isTarget && <span className="text-[9px] text-[#8a8f98]">(cible)</span>}
                    </button>
                  )
                })}
              </div>
            </Section>

            <FooterActions
              onBack={() => navigate('/dashboard')}
              backLabel="Annuler"
              onNext={() => setStep(1)}
              nextDisabled={!canProceedStep0}
              nextLabel="Continuer"
            />
          </div>
        )}

        {/* Étape 1 */}
        {step === 1 && (
          <div className="flex flex-col gap-8">
            <div>
              <h1
                className="text-[28px] text-[#f7f8f8] m-0"
                style={{ ...sans, fontWeight: 510, lineHeight: 1.1, letterSpacing: '-0.5px' }}
              >
                Ajoutez vos phrases
              </h1>
              <p className="text-[14px] text-[#8a8f98] mt-2" style={sans}>
                Uploadez un fichier ou saisissez votre liste de phrases.
              </p>
            </div>

            {/* Choix de la source */}
            {!selectedFile && phrasesSource !== 'manual' && phrasesSource !== 'ai' && phrasesSource !== 'import-translate' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <SourceCard
                  active={false}
                  onClick={() => fileInputRef.current?.click()}
                  icon={<Upload className="w-4 h-4" strokeWidth={1.75} />}
                  title="Uploader un fichier"
                  desc={`.txt, .pdf ou .docx déjà en ${languageLabel}`}
                />
                <SourceCard
                  active={false}
                  onClick={() => setPhrasesSource('manual')}
                  icon={<Type className="w-4 h-4" strokeWidth={1.75} />}
                  title="Saisir manuellement"
                  desc={`Coller directement le texte en ${languageLabel}`}
                />
                <SourceCard
                  active={false}
                  onClick={() => setPhrasesSource('ai')}
                  icon={<Sparkles className="w-4 h-4" strokeWidth={1.75} />}
                  title="Générer avec l'IA"
                  desc={`Décrivez un thème, on génère jusqu'à ${AI_MAX} phrases en ${languageLabel}`}
                  highlight
                />
                <SourceCard
                  active={false}
                  onClick={() => setPhrasesSource('import-translate')}
                  icon={<LanguagesIcon className="w-4 h-4" strokeWidth={1.75} />}
                  title="Importer + traduire"
                  desc={`Doc texte en français → traduit automatiquement en ${languageLabel}`}
                  highlight
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.pdf,.docx"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>
            )}

            {/* Panneau IA */}
            {phrasesSource === 'ai' && (
              <div className="flex flex-col gap-4">
                <div
                  className="flex items-start gap-3 p-3.5 rounded-md"
                  style={{
                    background: 'var(--t-accent-muted-bg)',
                    border: '1px solid var(--t-accent-muted-border)',
                  }}
                >
                  <Sparkles className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#7170ff' }} strokeWidth={1.75} />
                  <div>
                    <p className="text-[13px] text-[#f7f8f8]" style={{ ...sans, fontWeight: 510 }}>
                      Génération assistée par IA
                    </p>
                    <p className="text-[11px] text-[#8a8f98] mt-0.5 leading-relaxed" style={sans}>
                      L'IA va proposer un découpage en sous-thèmes équilibrés. Vous pourrez ensuite générer les phrases sous-thème par sous-thème, les éditer, puis les valider.
                    </p>
                  </div>
                </div>

                <FieldBlock label="Thème du dataset" required>
                  <TextInput
                    value={aiTheme}
                    onChange={setAiTheme}
                    placeholder="Ex : Santé maternelle au Sénégal"
                  />
                  <p className="text-[11px] text-[#62666d] mt-1.5" style={sans}>
                    Soyez précis : un thème clair = un meilleur découpage en sous-thèmes.
                  </p>
                </FieldBlock>

                <FieldBlock label={`Quantité totale en ${languageLabel}`} required>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {AI_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setAiTotalCount(preset)}
                        className="px-3 h-[28px] text-[12px] rounded-full transition-colors tabular-nums"
                        style={{
                          ...sans,
                          fontWeight: 510,
                          color: aiTotalCount === preset ? 'var(--t-fg)' : 'var(--t-fg-2)',
                          background: aiTotalCount === preset ? 'rgba(255,255,255,0.06)' : 'var(--t-surface)',
                          border: `1px solid ${aiTotalCount === preset ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)'}`,
                        }}
                      >
                        {preset.toLocaleString('fr-FR')}
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min={AI_MIN}
                      max={AI_MAX}
                      step={100}
                      value={aiTotalCount}
                      onChange={(e) => setAiTotalCount(parseInt(e.target.value, 10) || 0)}
                      className="w-full h-[36px] pl-3 pr-20 text-[14px] text-[#f7f8f8] rounded-md bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] focus:outline-none focus:border-[rgba(255,255,255,0.22)] tabular-nums"
                      style={sans}
                    />
                    <span
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#62666d] pointer-events-none"
                      style={mono}
                    >
                      phrases
                    </span>
                  </div>
                  <p className="text-[11px] text-[#62666d] mt-1.5" style={sans}>
                    Min {AI_MIN} · Max {AI_MAX.toLocaleString('fr-FR')} (quota beta par projet).
                    {aiTotalCount > 0 && aiCountValid && (
                      <span className="text-[#10b981] ml-1.5">✓ Valide</span>
                    )}
                  </p>
                </FieldBlock>

                <button
                  type="button"
                  onClick={clearPhrases}
                  className="self-start inline-flex items-center gap-1.5 h-[28px] px-2.5 text-[11px] rounded-md text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
                  style={{ ...sans, fontWeight: 510 }}
                >
                  <X className="w-3 h-3" strokeWidth={1.75} />
                  Choisir un autre mode
                </button>
              </div>
            )}

            {/* Panneau Import + traduction */}
            {phrasesSource === 'import-translate' && (
              <div className="flex flex-col gap-4">
                <div
                  className="flex items-start gap-3 p-3.5 rounded-md"
                  style={{
                    background: 'var(--t-accent-muted-bg)',
                    border: '1px solid var(--t-accent-muted-border)',
                  }}
                >
                  <LanguagesIcon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#7170ff' }} strokeWidth={1.75} />
                  <div>
                    <p className="text-[13px] text-[#f7f8f8]" style={{ ...sans, fontWeight: 510 }}>
                      Import + traduction automatique
                    </p>
                    <p className="text-[11px] text-[#8a8f98] mt-0.5 leading-relaxed" style={sans}>
                      Uploadez un texte en français (.txt ou .md). On segmente en phrases, on traduit chaque phrase vers le {languageLabel}, et vous pouvez ensuite éditer les traductions douteuses avant validation.
                    </p>
                  </div>
                </div>

                <FieldBlock label="Document français à traduire" required>
                  {!importFile ? (
                    <button
                      type="button"
                      onClick={() => importInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 h-[80px] rounded-md text-[13px] text-[#d0d6e0] hover:text-[#f7f8f8] transition-colors"
                      style={{
                        ...sans,
                        background: 'var(--t-surface)',
                        border: '1px dashed rgba(255,255,255,0.15)',
                      }}
                    >
                      <Upload className="w-4 h-4" strokeWidth={1.75} />
                      Choisir un fichier .txt ou .md (max {IMPORT_TRANSLATE_MAX_MB} MB)
                    </button>
                  ) : (
                    <div
                      className="flex items-center gap-3 p-3 rounded-md"
                      style={{
                        background: 'var(--t-surface)',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <div
                        className="w-9 h-9 flex items-center justify-center rounded-md shrink-0"
                        style={{
                          background: 'var(--t-surface-active)',
                          border: '1px solid rgba(255,255,255,0.05)',
                        }}
                      >
                        <File className="w-4 h-4 text-[#d0d6e0]" strokeWidth={1.75} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-[#f7f8f8] truncate" style={{ ...sans, fontWeight: 510 }}>
                          {importFile.name}
                        </p>
                        <p className="text-[11px] text-[#62666d]" style={sans}>
                          {(importFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setImportFile(null); if (importInputRef.current) importInputRef.current.value = '' }}
                        className="w-7 h-7 flex items-center justify-center rounded-md text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
                      >
                        <X className="w-3.5 h-3.5" strokeWidth={1.75} />
                      </button>
                    </div>
                  )}
                  <input
                    ref={importInputRef}
                    type="file"
                    accept=".txt,.md"
                    onChange={handleImportFileInputChange}
                    className="hidden"
                  />
                </FieldBlock>

                <FieldBlock label="Titre du sous-thème" required>
                  <TextInput
                    value={importTitle}
                    onChange={setImportTitle}
                    placeholder="Ex : Article santé maternelle"
                  />
                  <p className="text-[11px] text-[#62666d] mt-1.5" style={sans}>
                    Visible dans la liste des sous-thèmes du projet.
                  </p>
                </FieldBlock>

                {importError && (
                  <div
                    className="flex items-start gap-2 px-3 py-2.5 rounded-md text-[12px] text-[#fca5a5]"
                    style={{
                      ...sans,
                      background: 'var(--t-danger-muted-bg)',
                      border: '1px solid var(--t-danger-muted-border)',
                    }}
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{importError}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={clearPhrases}
                  className="self-start inline-flex items-center gap-1.5 h-[28px] px-2.5 text-[11px] rounded-md text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
                  style={{ ...sans, fontWeight: 510 }}
                >
                  <X className="w-3 h-3" strokeWidth={1.75} />
                  Choisir un autre mode
                </button>
              </div>
            )}

            {/* Dropzone + fichier sélectionné */}
            {selectedFile && (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={() => setDragOver(false)}
                className="rounded-[10px] p-5 transition-colors"
                style={{
                  background: dragOver ? 'var(--t-accent-muted-bg)' : 'var(--t-surface)',
                  border: `1px dashed ${dragOver ? 'var(--t-accent-muted-border)' : 'rgba(255,255,255,0.15)'}`,
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 flex items-center justify-center rounded-md shrink-0"
                    style={{
                      background: 'var(--t-surface-active)',
                      border: '1px solid rgba(255,255,255,0.05)',
                    }}
                  >
                    <File className="w-4 h-4 text-[#d0d6e0]" strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-[#f7f8f8] truncate" style={{ ...sans, fontWeight: 510 }}>
                      {fileName}
                    </p>
                    <p className="text-[11px] text-[#62666d]" style={sans}>
                      Les phrases seront extraites à la création
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={clearPhrases}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
                  >
                    <X className="w-3.5 h-3.5" strokeWidth={1.75} />
                  </button>
                </div>
              </div>
            )}

            {/* Saisie manuelle */}
            {phrasesSource === 'manual' && (
              <div className="flex flex-col gap-3">
                <div
                  className="rounded-md p-3"
                  style={{
                    background: 'var(--t-surface)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <textarea
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    placeholder="Collez vos phrases ici, une par ligne…"
                    className="w-full bg-transparent border-0 outline-none text-[#f7f8f8] text-[13px] resize-y"
                    style={{ ...sans, lineHeight: 1.5, minHeight: 180 }}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={clearPhrases}
                    className="h-[30px] px-3 text-[12px] rounded-md text-[#d0d6e0] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
                    style={{ ...sans, fontWeight: 510 }}
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleManualParse}
                    disabled={!manualText.trim()}
                    className="h-[30px] px-3 text-[12px] rounded-md transition-colors disabled:opacity-40"
                    style={{
                      ...sans,
                      fontWeight: 510,
                      color: 'var(--t-fg)',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.15)',
                    }}
                  >
                    Parser les phrases
                  </button>
                  {totalPhrases > 0 && (
                    <span className="ml-auto self-center text-[12px] text-[#10b981]" style={sans}>
                      {totalPhrases} phrases détectées
                    </span>
                  )}
                </div>
              </div>
            )}

            {uploadError && (
              <div
                className="flex items-start gap-2 px-3 py-2.5 rounded-md text-[12px] text-[#fca5a5] border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.06)]"
                style={sans}
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{uploadError}</span>
              </div>
            )}

            <FooterActions
              onBack={() => setStep(0)}
              onNext={handleStep1Next}
              nextDisabled={!canProceedStep1}
              nextLabel="Continuer"
            />
          </div>
        )}

        {/* Étape 2 — Récap */}
        {step === 2 && (
          <div className="flex flex-col gap-8">
            <div>
              <h1
                className="text-[28px] text-[#f7f8f8] m-0"
                style={{ ...sans, fontWeight: 510, lineHeight: 1.1, letterSpacing: '-0.5px' }}
              >
                Récapitulatif
              </h1>
              <p className="text-[14px] text-[#8a8f98] mt-2" style={sans}>
                Vérifiez avant de créer votre projet.
              </p>
            </div>

            <div
              className="rounded-[10px]"
              style={{
                background: 'var(--t-surface)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <Summary label="Nom" value={name} onEdit={() => setStep(0)} />
              <SumDivider />
              <Summary label="Description" value={description || '—'} onEdit={() => setStep(0)} />
              <SumDivider />
              <Summary label="Langue" value={languageLabel} />
              <SumDivider />
              <Summary label="Usage" value={usageType.toUpperCase()} />
              <SumDivider />
              <Summary
                label="Rémunération"
                value={isVolunteer ? 'Bénévole' : `${rateValue.toLocaleString('fr-FR')} FCFA/h`}
                mono
              />
              <SumDivider />
              <Summary label="Visibilité" value={isPublic ? 'Public' : 'Sur invitation'} />
              <SumDivider />
              <Summary
                label="Langues acceptées"
                value={requiredLanguages.map((c) => LANGUAGES.find((l) => l.value === c)?.label ?? c).join(', ')}
              />
              <SumDivider />
              <Summary
                label="Phrases"
                value={
                  phrasesSource === 'ai'
                    ? `Génération IA · ${aiTotalCount.toLocaleString('fr-FR')} phrases sur "${aiTheme.trim()}"`
                    : phrasesSource === 'import-translate' && importFile
                      ? `Import + traduction · ${importFile.name} → "${importTitle.trim()}"`
                      : phrasesSource === 'file'
                        ? `${fileName} (extraction à la création)`
                        : totalPhrases > 0
                          ? `${totalPhrases} phrases`
                          : '—'
                }
                onEdit={() => setStep(1)}
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1.5 h-[36px] px-3.5 text-[13px] rounded-md text-[#d0d6e0] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
                style={{ ...sans, fontWeight: 510 }}
              >
                <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
                Retour
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 h-[36px] px-4 text-[13px] rounded-md transition-colors disabled:opacity-40"
                style={{
                  ...sans,
                  fontWeight: 510,
                  color: '#ffffff',
                  background: '#5e6ad2',
                }}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {phrasesSource === 'ai'
                      ? 'Génération du plan…'
                      : phrasesSource === 'import-translate'
                        ? 'Import et traduction…'
                        : uploading
                          ? 'Traitement du fichier…'
                          : 'Création…'}
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" strokeWidth={2} />
                    Créer le projet
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}

/* ---------- Helpers ---------- */

function Section({
  title, subtitle, children,
}: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section>
      <div
        className="text-[11px] text-[#62666d] uppercase mb-3"
        style={{ ...sans, fontWeight: 510, letterSpacing: '0.04em' }}
      >
        {title}
      </div>
      {subtitle && (
        <p className="text-[12px] text-[#8a8f98] mb-3" style={sans}>{subtitle}</p>
      )}
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  )
}

function FieldBlock({
  label, required, hint, children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-[12px] text-[#d0d6e0] mb-1.5" style={{ ...sans, fontWeight: 510 }}>
        {label}
        {required && <span className="text-[#62666d] ml-1">*</span>}
        {hint && <span className="text-[#62666d] ml-1">· {hint}</span>}
      </label>
      {children}
    </div>
  )
}

function TextInput({
  value, onChange, placeholder,
}: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-[36px] px-3 text-[14px] text-[#f7f8f8] placeholder:text-[#62666d] rounded-md bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] focus:outline-none focus:border-[rgba(255,255,255,0.22)] transition-colors"
      style={sans}
    />
  )
}

function TextArea({
  value, onChange, placeholder, rows = 3,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2.5 text-[14px] text-[#f7f8f8] placeholder:text-[#62666d] rounded-md bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] focus:outline-none focus:border-[rgba(255,255,255,0.22)] resize-y transition-colors"
      style={{ ...sans, lineHeight: 1.5 }}
    />
  )
}

function LangPill({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3 h-[28px] text-[12px] rounded-full transition-colors"
      style={{
        ...sans,
        fontWeight: 510,
        color: active ? 'var(--t-fg)' : 'var(--t-fg-2)',
        background: active ? 'rgba(255,255,255,0.06)' : 'var(--t-surface)',
        border: `1px solid ${active ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)'}`,
      }}
    >
      {children}
    </button>
  )
}

function VisibilityCard({
  active, onClick, icon, title, desc,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  title: string
  desc: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex items-start gap-3 p-3.5 rounded-md text-left transition-colors"
      style={{
        background: active ? 'rgba(255,255,255,0.05)' : 'var(--t-surface)',
        border: `1px solid ${active ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)'}`,
      }}
    >
      <span
        className="w-7 h-7 flex items-center justify-center rounded-md shrink-0 text-[#d0d6e0]"
        style={{
          background: 'var(--t-surface-hover)',
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-[#f7f8f8]" style={{ ...sans, fontWeight: 510 }}>
          {title}
        </p>
        <p className="text-[11px] text-[#8a8f98] mt-0.5 leading-relaxed" style={sans}>
          {desc}
        </p>
      </div>
      {active && (
        <span
          className="absolute top-3 right-3 w-4 h-4 rounded-full flex items-center justify-center"
          style={{ background: 'var(--t-fg)' }}
        >
          <Check className="w-2.5 h-2.5" strokeWidth={3} style={{ color: 'var(--t-bg)' }} />
        </span>
      )}
    </button>
  )
}

function SourceCard({
  active, onClick, icon, title, desc, highlight,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  title: string
  desc: string
  highlight?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex flex-col gap-3 p-5 rounded-md text-left transition-colors min-h-[140px]"
      style={{
        background: active ? 'rgba(255,255,255,0.05)' : 'var(--t-surface)',
        border: `1px solid ${
          active
            ? 'rgba(255,255,255,0.22)'
            : highlight
              ? 'var(--t-accent-muted-border)'
              : 'rgba(255,255,255,0.08)'
        }`,
      }}
    >
      {highlight && (
        <span
          className="absolute top-3 right-3 px-1.5 h-[18px] inline-flex items-center text-[9px] uppercase tracking-wider rounded"
          style={{
            ...sans,
            fontWeight: 590,
            letterSpacing: '0.06em',
            color: '#7170ff',
            background: 'rgba(113,112,255,0.08)',
            border: '1px solid rgba(113,112,255,0.25)',
          }}
        >
          Nouveau
        </span>
      )}
      <span
        className="w-9 h-9 flex items-center justify-center rounded-md text-[#f7f8f8]"
        style={{
          background: highlight
            ? 'linear-gradient(135deg, rgba(113,112,255,0.18), rgba(113,112,255,0.04))'
            : 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
          border: `1px solid ${highlight ? 'rgba(113,112,255,0.25)' : 'rgba(255,255,255,0.1)'}`,
        }}
      >
        {icon}
      </span>
      <div>
        <p className="text-[15px] text-[#f7f8f8]" style={{ ...sans, fontWeight: 590, letterSpacing: '-0.1px' }}>
          {title}
        </p>
        <p className="text-[12px] text-[#8a8f98] mt-1 leading-relaxed" style={sans}>
          {desc}
        </p>
      </div>
    </button>
  )
}

function FooterActions({
  onBack, backLabel = 'Retour', onNext, nextLabel, nextDisabled,
}: {
  onBack: () => void
  backLabel?: string
  onNext: () => void
  nextLabel: string
  nextDisabled?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 h-[36px] px-3.5 text-[13px] rounded-md text-[#d0d6e0] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
        style={{ ...sans, fontWeight: 510 }}
      >
        <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
        {backLabel}
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        className="inline-flex items-center gap-1.5 h-[36px] px-4 text-[13px] rounded-md transition-colors disabled:opacity-40"
        style={{
          ...sans,
          fontWeight: 510,
          color: '#ffffff',
          background: '#5e6ad2',
        }}
      >
        {nextLabel}
        <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
      </button>
    </div>
  )
}

function Summary({
  label, value, onEdit, mono: isMono,
}: {
  label: string
  value: string
  onEdit?: () => void
  mono?: boolean
}) {
  return (
    <div className="grid grid-cols-[130px_1fr_auto] items-start gap-3 px-4 py-3">
      <span
        className="text-[11px] text-[#62666d] uppercase pt-0.5"
        style={{ ...sans, fontWeight: 510, letterSpacing: '0.04em' }}
      >
        {label}
      </span>
      <span
        className="text-[13px] text-[#f7f8f8] break-words"
        style={isMono ? mono : { ...sans, fontWeight: 510 }}
      >
        {value}
      </span>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1 text-[11px] text-[#8a8f98] hover:text-[#f7f8f8] transition-colors bg-transparent border-0"
          style={sans}
        >
          <Pencil className="w-3 h-3" strokeWidth={1.75} />
          Modifier
        </button>
      )}
    </div>
  )
}

function SumDivider() {
  return <div className="h-px mx-4" style={{ background: 'var(--t-border-subtle)' }} />
}

// Imports inutilisés pour TS (Languages, FileText sont pas utilisés après refonte)
void Languages
void FileText
