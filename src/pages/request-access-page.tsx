import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle, CheckCircle2, Database, Mic, ArrowRight, ArrowLeft,
  User, Mail, Phone, Building2, MapPin,
} from 'lucide-react'
import { PublicLayout } from '../components/layout/public-layout'
import { Field } from '../components/ui/field'
import { Button } from '../components/ui/button'
import { ThemeToggle } from '../components/ui/theme-toggle'
import { LANGUAGES } from '../lib/languages'

type Role = 'client' | 'speaker' | null
type Step = 'choose' | 'form' | 'success'

const sans = { fontFamily: 'var(--font-body)', fontFeatureSettings: "'cv01','ss03'" }
const mono = { fontFamily: 'var(--font-mono)' }

const VOLUME_OPTIONS = [
  { value: 'poc', label: 'Tester / POC (~500 phrases)' },
  { value: 'medium', label: 'Adapter un modèle (5 000 — 10 000 phrases)' },
  { value: 'large', label: 'Fine-tuning sérieux (30 000+ phrases)' },
  { value: 'unsure', label: 'Pas encore décidé' },
]

const AGE_RANGES = ['18-25', '26-35', '36-45', '46-55', '55+']
const GENDERS = [
  { value: 'female', label: 'Femme' },
  { value: 'male', label: 'Homme' },
  { value: 'other', label: 'Autre' },
  { value: 'prefer_not_to_say', label: 'Préfère ne pas répondre' },
]

export function RequestAccessPage() {
  const [step, setStep] = useState<Step>('choose')
  const [role, setRole] = useState<Role>(null)

  // Champs communs
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  // Client
  const [organization, setOrganization] = useState('')
  const [useCase, setUseCase] = useState('')
  const [expectedVolume, setExpectedVolume] = useState('')
  const [targetLanguages, setTargetLanguages] = useState<string[]>([])

  // Speaker
  const [speakerLanguages, setSpeakerLanguages] = useState<string[]>([])
  const [speakerCity, setSpeakerCity] = useState('')
  const [speakerAgeRange, setSpeakerAgeRange] = useState('')
  const [speakerGender, setSpeakerGender] = useState('')
  const [speakerMotivation, setSpeakerMotivation] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleLang = (list: string[], setList: (v: string[]) => void, code: string) => {
    if (list.includes(code)) setList(list.filter(c => c !== code))
    else setList([...list, code])
  }

  const validateForm = (): string | null => {
    if (fullName.trim().length < 2) return 'Nom complet requis (min 2 caractères)'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Email invalide'
    if (role === 'client') {
      if (targetLanguages.length === 0) return 'Sélectionnez au moins une langue cible'
      if (useCase.trim().length < 10) return 'Décrivez brièvement votre cas d\'usage (min 10 caractères)'
    } else if (role === 'speaker') {
      if (speakerLanguages.length === 0) return 'Sélectionnez au moins une langue parlée'
      if (!speakerCity.trim()) return 'Ville requise'
      if (!speakerGender) return 'Genre requis'
      if (!speakerAgeRange) return 'Tranche d\'âge requise'
    }
    return null
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }
    setSubmitting(true)
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

    const payload: Record<string, unknown> = {
      email: email.trim().toLowerCase(),
      full_name: fullName.trim(),
      intended_role: role,
      phone: phone.trim() || undefined,
    }
    if (role === 'client') {
      payload.organization = organization.trim() || undefined
      payload.use_case = useCase.trim()
      payload.expected_volume = expectedVolume || undefined
      payload.target_languages = targetLanguages
    } else {
      payload.speaker_languages = speakerLanguages
      payload.speaker_city = speakerCity.trim()
      payload.speaker_age_range = speakerAgeRange
      payload.speaker_gender = speakerGender
      payload.speaker_motivation = speakerMotivation.trim() || undefined
    }

    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/request-access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: anonKey,
        },
        body: JSON.stringify(payload),
      })
      const json = await res.json() as { data?: { request_id: string }; error?: string }
      if (json.error) {
        setError(json.error)
        setSubmitting(false)
        return
      }
      setStep('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PublicLayout
      brandTitle={<>Daandé,<br />sur invitation<br />uniquement.</>}
      brandSubtitle="Beta privée. Quelques pilotes triés sur le volet pendant qu'on stabilise la plateforme."
    >
      <TopBar />

      <div className="flex-1 flex flex-col justify-center max-w-[580px] w-full mx-auto mt-8">
        {step === 'success' ? (
          <SuccessView role={role} email={email} />
        ) : step === 'choose' ? (
          <ChooseStep
            role={role}
            setRole={setRole}
            onContinue={() => setStep('form')}
          />
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 animate-fade-in">
            <button
              type="button"
              onClick={() => setStep('choose')}
              className="inline-flex items-center gap-1.5 text-[12px] self-start"
              style={{ ...sans, color: 'var(--t-fg-3)' }}
            >
              <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
              Changer de profil
            </button>

            <div>
              <h1
                className="text-[24px] sm:text-[28px] m-0"
                style={{
                  ...sans,
                  fontWeight: 510,
                  lineHeight: 1.15,
                  letterSpacing: '-0.5px',
                  color: 'var(--t-fg)',
                }}
              >
                {role === 'client' ? 'Demande d\'accès — Client' : 'Demande d\'accès — Locuteur'}
              </h1>
              <p className="text-[14px] mt-2" style={{ ...sans, color: 'var(--t-fg-3)' }}>
                Réponse sous 48 heures par email.
              </p>
            </div>

            {error && (
              <div
                className="flex items-start gap-2 px-3 py-2.5 rounded-md text-[12px]"
                style={{
                  ...sans,
                  color: 'var(--t-danger-text)',
                  border: '1px solid var(--t-danger-muted-border)',
                  background: 'var(--t-danger-muted-bg)',
                }}
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Champs communs */}
            <Field
              label="Nom complet"
              icon={<User className="w-3.5 h-3.5" strokeWidth={1.75} />}
              placeholder="Aminata Diop"
              required
              value={fullName}
              onChange={setFullName}
            />
            <Field
              label="Email"
              type="email"
              icon={<Mail className="w-3.5 h-3.5" strokeWidth={1.75} />}
              placeholder="aminata@orange.sn"
              required
              value={email}
              onChange={setEmail}
            />
            <Field
              label="Téléphone"
              icon={<Phone className="w-3.5 h-3.5" strokeWidth={1.75} />}
              placeholder="+221 77 123 45 67"
              value={phone}
              onChange={setPhone}
            />

            {role === 'client' ? (
              <ClientFields
                organization={organization}
                setOrganization={setOrganization}
                useCase={useCase}
                setUseCase={setUseCase}
                expectedVolume={expectedVolume}
                setExpectedVolume={setExpectedVolume}
                targetLanguages={targetLanguages}
                toggleLang={(c) => toggleLang(targetLanguages, setTargetLanguages, c)}
              />
            ) : (
              <SpeakerFields
                speakerLanguages={speakerLanguages}
                toggleLang={(c) => toggleLang(speakerLanguages, setSpeakerLanguages, c)}
                speakerCity={speakerCity}
                setSpeakerCity={setSpeakerCity}
                speakerAgeRange={speakerAgeRange}
                setSpeakerAgeRange={setSpeakerAgeRange}
                speakerGender={speakerGender}
                setSpeakerGender={setSpeakerGender}
                speakerMotivation={speakerMotivation}
                setSpeakerMotivation={setSpeakerMotivation}
              />
            )}

            <div className="mt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={submitting}
                iconRight={!submitting ? <ArrowRight className="w-4 h-4" /> : undefined}
                className="w-full justify-center"
              >
                Envoyer ma demande
              </Button>
            </div>
            <p
              className="text-[11px] text-center"
              style={{ ...sans, color: 'var(--t-fg-4)' }}
            >
              En soumettant, vous acceptez d'être recontacté à propos de votre demande.
            </p>
          </form>
        )}
      </div>
    </PublicLayout>
  )
}

/* ---------- Top bar ---------- */
function TopBar() {
  return (
    <div className="flex items-center gap-3 h-[32px]">
      <span
        className="inline-flex items-center h-[22px] px-2 rounded-[5px] text-[11px]"
        style={{
          ...mono,
          color: 'var(--t-fg-3)',
          background: 'var(--t-surface)',
          border: '1px solid var(--t-border-subtle)',
        }}
      >
        /request-access
      </span>
      <div className="flex-1" />
      <span
        className="hidden sm:inline text-[12px]"
        style={{ ...sans, color: 'var(--t-fg-3)' }}
      >
        Déjà un accès ?
      </span>
      <Link
        to="/login"
        className="inline-flex items-center h-[28px] px-2.5 text-[12px] rounded-md transition-colors"
        style={{
          ...sans,
          fontWeight: 510,
          color: 'var(--t-fg)',
          background: 'var(--t-surface)',
          border: '1px solid var(--t-border)',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--t-surface-hover)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--t-surface)')}
      >
        Se connecter
      </Link>
      <ThemeToggle size={28} />
    </div>
  )
}

/* ---------- Step Choose ---------- */
interface ChooseStepProps {
  role: Role
  setRole: (r: Role) => void
  onContinue: () => void
}

function ChooseStep({ role, setRole, onContinue }: ChooseStepProps) {
  return (
    <div>
      <h1
        className="text-[28px] sm:text-[32px] m-0"
        style={{
          ...sans,
          fontWeight: 510,
          lineHeight: 1.1,
          letterSpacing: '-0.7px',
          color: 'var(--t-fg)',
        }}
      >
        Demander un accès
      </h1>
      <p
        className="text-[15px] mt-2.5"
        style={{ ...sans, lineHeight: 1.55, color: 'var(--t-fg-3)' }}
      >
        Daandé est en beta privée. Choisissez votre profil pour postuler.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
        <RoleCard
          icon={<Database className="w-[18px] h-[18px]" strokeWidth={1.75} />}
          title="Je crée des datasets"
          subtitle="Entreprise, chercheur, labo. J'ai un cas d'usage IA et un budget."
          selected={role === 'client'}
          onClick={() => setRole('client')}
        />
        <RoleCard
          icon={<Mic className="w-[18px] h-[18px]" strokeWidth={1.75} />}
          title="J'enregistre ma voix"
          subtitle="Locuteur natif. Je veux participer aux projets et être rémunéré."
          selected={role === 'speaker'}
          onClick={() => setRole('speaker')}
        />
      </div>

      <div className="mt-6">
        <Button
          variant="primary"
          size="lg"
          disabled={!role}
          onClick={onContinue}
          iconRight={<ArrowRight className="w-4 h-4" />}
          className="w-full justify-center"
        >
          Continuer
        </Button>
      </div>
    </div>
  )
}

interface RoleCardProps {
  icon: ReactNode
  title: string
  subtitle: string
  selected: boolean
  onClick: () => void
}

function RoleCard({ icon, title, subtitle, selected, onClick }: RoleCardProps) {
  const [hover, setHover] = useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="relative flex flex-col gap-3 p-5 rounded-[12px] text-left cursor-pointer min-h-[140px]"
      style={{
        background: selected
          ? 'var(--t-surface-active)'
          : hover
            ? 'var(--t-surface-hover)'
            : 'var(--t-surface)',
        border: `1px solid ${selected ? 'var(--t-border-strong)' : 'var(--t-border)'}`,
        boxShadow: selected ? '0 0 0 3px var(--t-surface-active)' : 'none',
        transition: 'all 140ms cubic-bezier(0.22,1,0.36,1)',
      }}
    >
      <div
        className="w-9 h-9 flex items-center justify-center rounded-lg"
        style={{
          background: 'var(--t-surface-2)',
          border: '1px solid var(--t-border)',
          color: 'var(--t-fg)',
        }}
      >
        {icon}
      </div>
      <div>
        <div
          className="text-[15px]"
          style={{
            ...sans,
            fontWeight: 590,
            letterSpacing: '-0.2px',
            color: 'var(--t-fg)',
          }}
        >
          {title}
        </div>
        <div
          className="text-[12px] mt-1"
          style={{ ...sans, lineHeight: 1.5, color: 'var(--t-fg-3)' }}
        >
          {subtitle}
        </div>
      </div>
      <div
        className="absolute top-4 right-4 w-[18px] h-[18px] rounded-full flex items-center justify-center"
        style={{
          border: `1.5px solid ${selected ? 'var(--t-fg)' : 'var(--t-border-strong)'}`,
        }}
      >
        {selected && (
          <span className="w-2 h-2 rounded-full" style={{ background: 'var(--t-fg)' }} />
        )}
      </div>
    </button>
  )
}

/* ---------- Client fields ---------- */
interface ClientFieldsProps {
  organization: string
  setOrganization: (v: string) => void
  useCase: string
  setUseCase: (v: string) => void
  expectedVolume: string
  setExpectedVolume: (v: string) => void
  targetLanguages: string[]
  toggleLang: (code: string) => void
}

function ClientFields({
  organization, setOrganization, useCase, setUseCase,
  expectedVolume, setExpectedVolume, targetLanguages, toggleLang,
}: ClientFieldsProps) {
  return (
    <>
      <Field
        label="Organisation"
        icon={<Building2 className="w-3.5 h-3.5" strokeWidth={1.75} />}
        placeholder="Sonatel, UCAD, Orange Labs…"
        value={organization}
        onChange={setOrganization}
      />

      <LanguagePicker
        label="Langue(s) cible(s)"
        required
        selected={targetLanguages}
        onToggle={toggleLang}
      />

      <div className="flex flex-col gap-1.5">
        <span
          className="text-[12px]"
          style={{ ...sans, fontWeight: 510, color: 'var(--t-fg-2)' }}
        >
          Volume estimé
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {VOLUME_OPTIONS.map(opt => {
            const active = expectedVolume === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setExpectedVolume(active ? '' : opt.value)}
                className="text-[12px] text-left px-3 py-2 rounded-md transition-colors"
                style={{
                  ...sans,
                  fontWeight: 510,
                  color: active ? 'var(--t-fg)' : 'var(--t-fg-2)',
                  background: active ? 'var(--t-surface-active)' : 'var(--t-surface)',
                  border: `1px solid ${active ? 'var(--t-border-strong)' : 'var(--t-border)'}`,
                }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span
          className="text-[12px]"
          style={{ ...sans, fontWeight: 510, color: 'var(--t-fg-2)' }}
        >
          Cas d'usage <span style={{ color: 'var(--t-fg-4)' }}>*</span>
        </span>
        <textarea
          value={useCase}
          onChange={e => setUseCase(e.target.value)}
          placeholder="Ex: Assistant vocal pour service client banque mobile en wolof. Modèle ASR à fine-tuner."
          rows={4}
          className="rounded-md px-3 py-2.5 text-[14px] outline-none resize-y"
          style={{
            ...sans,
            color: 'var(--t-fg)',
            background: 'var(--t-surface)',
            border: '1px solid var(--t-border)',
            minHeight: 96,
          }}
        />
      </div>
    </>
  )
}

/* ---------- Speaker fields ---------- */
interface SpeakerFieldsProps {
  speakerLanguages: string[]
  toggleLang: (code: string) => void
  speakerCity: string
  setSpeakerCity: (v: string) => void
  speakerAgeRange: string
  setSpeakerAgeRange: (v: string) => void
  speakerGender: string
  setSpeakerGender: (v: string) => void
  speakerMotivation: string
  setSpeakerMotivation: (v: string) => void
}

function SpeakerFields({
  speakerLanguages, toggleLang, speakerCity, setSpeakerCity,
  speakerAgeRange, setSpeakerAgeRange, speakerGender, setSpeakerGender,
  speakerMotivation, setSpeakerMotivation,
}: SpeakerFieldsProps) {
  return (
    <>
      <LanguagePicker
        label="Langue(s) que vous parlez"
        required
        selected={speakerLanguages}
        onToggle={toggleLang}
      />

      <Field
        label="Ville"
        icon={<MapPin className="w-3.5 h-3.5" strokeWidth={1.75} />}
        placeholder="Dakar, Saint-Louis, Bamako…"
        required
        value={speakerCity}
        onChange={setSpeakerCity}
      />

      <div className="flex flex-col gap-1.5">
        <span
          className="text-[12px]"
          style={{ ...sans, fontWeight: 510, color: 'var(--t-fg-2)' }}
        >
          Tranche d'âge <span style={{ color: 'var(--t-fg-4)' }}>*</span>
        </span>
        <div className="flex flex-wrap gap-1.5">
          {AGE_RANGES.map(age => {
            const active = speakerAgeRange === age
            return (
              <button
                key={age}
                type="button"
                onClick={() => setSpeakerAgeRange(active ? '' : age)}
                className="text-[12px] px-3 h-[30px] rounded-md transition-colors"
                style={{
                  ...sans,
                  fontWeight: 510,
                  color: active ? 'var(--t-fg)' : 'var(--t-fg-2)',
                  background: active ? 'var(--t-surface-active)' : 'var(--t-surface)',
                  border: `1px solid ${active ? 'var(--t-border-strong)' : 'var(--t-border)'}`,
                }}
              >
                {age}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span
          className="text-[12px]"
          style={{ ...sans, fontWeight: 510, color: 'var(--t-fg-2)' }}
        >
          Genre <span style={{ color: 'var(--t-fg-4)' }}>*</span>
        </span>
        <div className="grid grid-cols-2 gap-1.5">
          {GENDERS.map(g => {
            const active = speakerGender === g.value
            return (
              <button
                key={g.value}
                type="button"
                onClick={() => setSpeakerGender(active ? '' : g.value)}
                className="text-[12px] text-left px-3 h-[34px] rounded-md transition-colors"
                style={{
                  ...sans,
                  fontWeight: 510,
                  color: active ? 'var(--t-fg)' : 'var(--t-fg-2)',
                  background: active ? 'var(--t-surface-active)' : 'var(--t-surface)',
                  border: `1px solid ${active ? 'var(--t-border-strong)' : 'var(--t-border)'}`,
                }}
              >
                {g.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span
          className="text-[12px]"
          style={{ ...sans, fontWeight: 510, color: 'var(--t-fg-2)' }}
        >
          Motivation <span style={{ color: 'var(--t-fg-4)' }}>(optionnel)</span>
        </span>
        <textarea
          value={speakerMotivation}
          onChange={e => setSpeakerMotivation(e.target.value)}
          placeholder="Pourquoi voulez-vous participer ? Avez-vous déjà fait de la voix-off ?"
          rows={3}
          className="rounded-md px-3 py-2.5 text-[14px] outline-none resize-y"
          style={{
            ...sans,
            color: 'var(--t-fg)',
            background: 'var(--t-surface)',
            border: '1px solid var(--t-border)',
            minHeight: 80,
          }}
        />
      </div>
    </>
  )
}

/* ---------- Language picker ---------- */
interface LanguagePickerProps {
  label: string
  required?: boolean
  selected: string[]
  onToggle: (code: string) => void
}

function LanguagePicker({ label, required, selected, onToggle }: LanguagePickerProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <span
        className="text-[12px]"
        style={{ ...sans, fontWeight: 510, color: 'var(--t-fg-2)' }}
      >
        {label} {required && <span style={{ color: 'var(--t-fg-4)' }}>*</span>}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(LANGUAGES).map(([code, def]) => {
          const active = selected.includes(code)
          return (
            <button
              key={code}
              type="button"
              onClick={() => onToggle(code)}
              className="text-[12px] px-3 h-[30px] rounded-full transition-colors"
              style={{
                ...sans,
                fontWeight: 510,
                color: active ? 'var(--t-fg)' : 'var(--t-fg-2)',
                background: active ? 'var(--t-surface-active)' : 'var(--t-surface)',
                border: `1px solid ${active ? 'var(--t-border-strong)' : 'var(--t-border)'}`,
              }}
            >
              {def.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ---------- Success view ---------- */
function SuccessView({ role, email }: { role: Role; email: string }) {
  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <div
        className="w-12 h-12 flex items-center justify-center rounded-[10px]"
        style={{
          background: 'var(--t-surface-active)',
          border: '1px solid var(--t-border-strong)',
          color: 'var(--t-fg)',
        }}
      >
        <CheckCircle2 className="w-5 h-5" strokeWidth={1.75} />
      </div>
      <h1
        className="text-[24px] sm:text-[28px] m-0"
        style={{
          ...sans,
          fontWeight: 510,
          lineHeight: 1.15,
          letterSpacing: '-0.5px',
          color: 'var(--t-fg)',
        }}
      >
        Demande envoyée.
      </h1>
      <p
        className="text-[14px]"
        style={{ ...sans, lineHeight: 1.55, color: 'var(--t-fg-3)' }}
      >
        Nous étudions toutes les demandes manuellement et reviendrons vers <span style={{ color: 'var(--t-fg)' }}>{email}</span> sous 48 heures.
      </p>
      <p
        className="text-[13px]"
        style={{ ...sans, lineHeight: 1.55, color: 'var(--t-fg-4)' }}
      >
        {role === 'client'
          ? 'Si votre profil correspond, vous recevrez un lien pour créer votre compte client.'
          : 'Si votre profil correspond, vous recevrez un lien pour créer votre compte locuteur.'}
      </p>
      <Link
        to="/"
        className="inline-flex items-center justify-center h-[36px] px-4 text-[13px] rounded-md transition-colors mt-2 self-start"
        style={{
          ...sans,
          fontWeight: 510,
          color: 'var(--t-fg-2)',
          background: 'var(--t-surface)',
          border: '1px solid var(--t-border)',
        }}
      >
        Retour à l'accueil
      </Link>
    </div>
  )
}
