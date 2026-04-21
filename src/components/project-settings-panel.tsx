import { useState, useEffect, useCallback } from 'react'
import { Settings, Save, Loader2, Check, Globe, Lock, Wallet, Users, Languages, Info } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../hooks/use-toast'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Select } from './ui/select'
import { Textarea } from './ui/textarea'
import { LANGUAGES } from '../lib/languages'
import type { Project, ProjectUsageType, RequiredGender } from '../types/database'

interface ProjectSettingsPanelProps {
  project: Project
  onUpdated: () => void
}

const MIN_RATE = 2000

const USAGE_OPTIONS = [
  { value: 'asr', label: 'ASR — Reconnaissance vocale' },
  { value: 'tts', label: 'TTS — Synthèse vocale' },
  { value: 'both', label: 'Les deux (ASR + TTS)' },
]

const GENDER_OPTIONS: { value: RequiredGender | 'any'; label: string }[] = [
  { value: 'any', label: 'Tous' },
  { value: 'male', label: 'Homme uniquement' },
  { value: 'female', label: 'Femme uniquement' },
]

export function ProjectSettingsPanel({ project, onUpdated }: ProjectSettingsPanelProps) {
  const { notify } = useToast()

  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description ?? '')
  const [usageType, setUsageType] = useState<ProjectUsageType>(project.usage_type)
  const [isPublic, setIsPublic] = useState(project.is_public)
  const [isVolunteer, setIsVolunteer] = useState(project.rate_per_hour_fcfa === 0)
  const [rateInput, setRateInput] = useState(
    project.rate_per_hour_fcfa > 0 ? String(project.rate_per_hour_fcfa) : '5000',
  )
  const [requiredLanguages, setRequiredLanguages] = useState<string[]>(project.required_languages ?? [])
  const [requiredGender, setRequiredGender] = useState<RequiredGender | 'any'>(project.required_gender ?? 'any')
  const [minSpeakers, setMinSpeakers] = useState<string>(project.min_speakers != null ? String(project.min_speakers) : '')
  const [maxSpeakers, setMaxSpeakers] = useState<string>(project.max_speakers != null ? String(project.max_speakers) : '')
  const [ageMin, setAgeMin] = useState<string>(project.age_min != null ? String(project.age_min) : '')
  const [ageMax, setAgeMax] = useState<string>(project.age_max != null ? String(project.age_max) : '')
  const [fundingSource, setFundingSource] = useState(project.funding_source ?? '')

  const [saving, setSaving] = useState(false)
  const [rateError, setRateError] = useState('')
  const [dirty, setDirty] = useState(false)

  useEffect(() => { setDirty(true) }, [
    name, description, usageType, isPublic, isVolunteer, rateInput,
    requiredLanguages, requiredGender, minSpeakers, maxSpeakers,
    ageMin, ageMax, fundingSource,
  ])

  // Reset dirty au premier render
  useEffect(() => { setDirty(false) }, [])

  const rateValue = isVolunteer ? 0 : parseInt(rateInput, 10) || 0
  const rateValid = isVolunteer || rateValue >= MIN_RATE

  const toggleLanguage = (code: string) => {
    setRequiredLanguages((langs) =>
      langs.includes(code) ? langs.filter((l) => l !== code) : [...langs, code],
    )
  }

  const handleSave = useCallback(async () => {
    if (!rateValid) {
      setRateError(`Minimum ${MIN_RATE.toLocaleString('fr-FR')} FCFA/h.`)
      return
    }
    if (!name.trim()) {
      notify({ variant: 'error', title: 'Erreur', message: 'Le nom du projet est requis.' })
      return
    }

    setSaving(true)
    setRateError('')

    const { error } = await (supabase
      .from('projects')
      .update({
        name: name.trim(),
        description: description.trim() || null,
        usage_type: usageType,
        is_public: isPublic,
        rate_per_hour_fcfa: rateValue,
        required_languages: requiredLanguages,
        required_gender: requiredGender === 'any' ? null : requiredGender,
        min_speakers: minSpeakers ? parseInt(minSpeakers, 10) : null,
        max_speakers: maxSpeakers ? parseInt(maxSpeakers, 10) : null,
        age_min: ageMin ? parseInt(ageMin, 10) : null,
        age_max: ageMax ? parseInt(ageMax, 10) : null,
        funding_source: fundingSource.trim() || null,
      } as unknown as never)
      .eq('id', project.id) as unknown as Promise<{ error: { message: string } | null }>)

    setSaving(false)

    if (error) {
      notify({ variant: 'error', title: 'Échec', message: error.message })
      return
    }

    notify({ variant: 'success', message: 'Paramètres mis à jour' })
    setDirty(false)
    onUpdated()
  }, [
    rateValid, name, description, usageType, isPublic, rateValue, requiredLanguages,
    requiredGender, minSpeakers, maxSpeakers, ageMin, ageMax, fundingSource,
    project.id, notify, onUpdated,
  ])

  return (
    <div className="space-y-6 pb-20">
      {/* En-tête */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-sand-100 dark:bg-sand-800 flex items-center justify-center">
          <Settings className="w-5 h-5 text-sand-600 dark:text-sand-400" />
        </div>
        <div>
          <h2
            className="text-lg font-extrabold text-sand-900 dark:text-sand-100"
            style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}
          >
            Paramètres du projet
          </h2>
          <p className="text-xs text-sand-500 dark:text-sand-400">
            Informations générales, recrutement et visibilité
          </p>
        </div>
      </div>

      {/* Section : Informations générales */}
      <Section icon={<Info className="w-4 h-4" />} title="Informations générales">
        <Input
          id="settings-name"
          label="Nom du projet"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Textarea
          id="settings-description"
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Décrivez le contexte et l'objectif de ce dataset…"
        />
        <Select
          id="settings-usage"
          label="Type d'utilisation"
          value={usageType}
          onChange={(e) => setUsageType(e.target.value as ProjectUsageType)}
          options={USAGE_OPTIONS}
        />
        <div>
          <label className="block text-sm font-semibold text-sand-800 dark:text-sand-200 mb-1.5">
            Source de financement (optionnel)
          </label>
          <input
            type="text"
            value={fundingSource}
            onChange={(e) => setFundingSource(e.target.value)}
            placeholder="Ex : subvention, client privé…"
            className="w-full px-4 py-2.5 rounded-xl border border-sand-200 dark:border-sand-700 bg-white dark:bg-sand-900 text-sand-900 dark:text-sand-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>
      </Section>

      {/* Section : Visibilité */}
      <Section icon={<Globe className="w-4 h-4" />} title="Visibilité du projet">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <VisibilityCard
            active={isPublic}
            onClick={() => setIsPublic(true)}
            icon={<Globe className="w-4 h-4" />}
            title="Public"
            description="Visible par tous les locuteurs qui parlent la langue cible"
            accent="secondary"
          />
          <VisibilityCard
            active={!isPublic}
            onClick={() => setIsPublic(false)}
            icon={<Lock className="w-4 h-4" />}
            title="Sur invitation"
            description="Seuls les locuteurs invités voient et accèdent au projet"
            accent="accent"
          />
        </div>
      </Section>

      {/* Section : Rémunération */}
      <Section icon={<Wallet className="w-4 h-4" />} title="Rémunération des locuteurs">
        <p className="text-xs text-sand-500 dark:text-sand-400 -mt-2 mb-1">
          Fourchette recommandée : <span className="font-semibold text-sand-700 dark:text-sand-300">3 000 – 8 000 FCFA/h</span>.
          Minimum : {MIN_RATE.toLocaleString('fr-FR')} FCFA/h.
        </p>
        <div className={`relative ${isVolunteer ? 'opacity-50 pointer-events-none' : ''}`}>
          <input
            type="number"
            inputMode="numeric"
            min={MIN_RATE}
            step={500}
            value={rateInput}
            onChange={(e) => {
              setRateInput(e.target.value)
              const n = parseInt(e.target.value, 10) || 0
              setRateError(e.target.value && n < MIN_RATE ? `Minimum ${MIN_RATE.toLocaleString('fr-FR')} FCFA/h.` : '')
            }}
            disabled={isVolunteer}
            className="w-full pr-20 pl-4 py-2.5 rounded-xl border border-sand-200 dark:border-sand-700 bg-white dark:bg-sand-900 text-sand-900 dark:text-sand-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 tabular-nums"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-sand-500 dark:text-sand-400 pointer-events-none">
            FCFA/h
          </span>
        </div>
        {rateError && !isVolunteer && (
          <p className="text-xs text-red-600 dark:text-red-400">{rateError}</p>
        )}
        <label className="flex items-start gap-2.5 p-3 rounded-xl border border-sand-200 dark:border-sand-700 bg-sand-50/50 dark:bg-sand-800/30 cursor-pointer hover:border-sand-300 dark:hover:border-sand-600 transition-colors">
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
              Les locuteurs verront le badge « Bénévole »
            </p>
          </div>
        </label>
      </Section>

      {/* Section : Critères de recrutement */}
      <Section icon={<Languages className="w-4 h-4" />} title="Critères de recrutement">
        <div>
          <label className="block text-sm font-semibold text-sand-800 dark:text-sand-200 mb-2">
            Langues requises
          </label>
          <p className="text-xs text-sand-500 dark:text-sand-400 mb-2.5">
            Les locuteurs doivent parler au moins une de ces langues pour voir le projet.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(LANGUAGES).map(([code, lang]) => {
              const active = requiredLanguages.includes(code)
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => toggleLanguage(code)}
                  className={[
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
                    active
                      ? 'bg-secondary-50 dark:bg-secondary-900/30 border-secondary-400 text-secondary-700 dark:text-secondary-300'
                      : 'border-sand-200 dark:border-sand-700 text-sand-600 dark:text-sand-400 hover:border-sand-300',
                  ].join(' ')}
                >
                  {active && <Check className="w-3 h-3" />}
                  {lang.label}
                </button>
              )
            })}
          </div>
        </div>
        <Select
          id="settings-gender"
          label="Genre du locuteur"
          value={requiredGender}
          onChange={(e) => setRequiredGender(e.target.value as RequiredGender | 'any')}
          options={GENDER_OPTIONS}
        />
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Âge minimum"
            value={ageMin}
            onChange={setAgeMin}
            placeholder="18"
            suffix="ans"
          />
          <NumberField
            label="Âge maximum"
            value={ageMax}
            onChange={setAgeMax}
            placeholder="65"
            suffix="ans"
          />
        </div>
      </Section>

      {/* Section : Nombre de locuteurs */}
      <Section icon={<Users className="w-4 h-4" />} title="Nombre de locuteurs">
        <p className="text-xs text-sand-500 dark:text-sand-400 -mt-2 mb-1">
          Bornes du projet (optionnel). Dépasser le maximum bloque de nouvelles invitations.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Minimum"
            value={minSpeakers}
            onChange={setMinSpeakers}
            placeholder="1"
          />
          <NumberField
            label="Maximum"
            value={maxSpeakers}
            onChange={setMaxSpeakers}
            placeholder="10"
          />
        </div>
      </Section>

      {/* Barre de sauvegarde fixée en bas */}
      <div className="sticky bottom-4 z-10">
        <div className={[
          'flex items-center justify-between gap-3 p-3 rounded-2xl shadow-lg border backdrop-blur-xl transition-all',
          dirty
            ? 'bg-primary-50/90 dark:bg-primary-900/40 border-primary-300/70 dark:border-primary-700/50'
            : 'bg-white/90 dark:bg-sand-900/90 border-sand-200/70 dark:border-sand-700/70',
        ].join(' ')}>
          <p className={[
            'text-xs font-semibold',
            dirty
              ? 'text-primary-700 dark:text-primary-300'
              : 'text-sand-500 dark:text-sand-400',
          ].join(' ')}>
            {dirty ? 'Modifications non enregistrées' : 'Tous les changements sont enregistrés'}
          </p>
          <Button
            onClick={handleSave}
            disabled={saving || !dirty || !rateValid}
            size="sm"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Enregistrement…
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                Enregistrer
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Composants auxiliaires ──────────────────────────────────────────────

interface SectionProps {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}

function Section({ icon, title, children }: SectionProps) {
  return (
    <div className="bg-white dark:bg-sand-900 rounded-2xl border border-sand-200/60 dark:border-sand-800 p-5">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-sand-100 dark:border-sand-800/70">
        <span className="w-7 h-7 rounded-lg bg-sand-100 dark:bg-sand-800 flex items-center justify-center text-sand-600 dark:text-sand-400">
          {icon}
        </span>
        <h3
          className="text-sm font-bold text-sand-800 dark:text-sand-200"
          style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.01em' }}
        >
          {title}
        </h3>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

interface VisibilityCardProps {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  title: string
  description: string
  accent: 'secondary' | 'accent'
}

function VisibilityCard({ active, onClick, icon, title, description, accent }: VisibilityCardProps) {
  const accentClasses = active
    ? accent === 'secondary'
      ? 'bg-secondary-50 dark:bg-secondary-900/30 border-secondary-400 text-secondary-700 dark:text-secondary-300'
      : 'bg-accent-50 dark:bg-accent-900/30 border-accent-400 text-accent-700 dark:text-accent-300'
    : 'border-sand-200 dark:border-sand-700 text-sand-700 dark:text-sand-300 hover:border-sand-300'

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'relative flex items-start gap-2.5 p-3.5 rounded-xl border-2 text-left transition-all',
        accentClasses,
      ].join(' ')}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold leading-tight">{title}</p>
        <p className="text-[11px] mt-0.5 opacity-80 leading-snug">{description}</p>
      </div>
      {active && (
        <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-current flex items-center justify-center">
          <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
        </span>
      )}
    </button>
  )
}

interface NumberFieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  suffix?: string
}

function NumberField({ label, value, onChange, placeholder, suffix }: NumberFieldProps) {
  return (
    <div>
      <label className="block text-sm font-semibold text-sand-800 dark:text-sand-200 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={[
            'w-full pl-4 py-2.5 rounded-xl border border-sand-200 dark:border-sand-700 bg-white dark:bg-sand-900 text-sand-900 dark:text-sand-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 tabular-nums',
            suffix ? 'pr-12' : 'pr-4',
          ].join(' ')}
        />
        {suffix && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-sand-500 dark:text-sand-400 pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    </div>
  )
}
