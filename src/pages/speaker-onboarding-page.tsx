import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import {
  Loader2, AlertCircle, MapPin, Calendar, Phone,
  ArrowRight, ArrowLeft, Check,
} from 'lucide-react'
import { useAuth } from '../hooks/use-auth'
import { useSpeakerGuard } from '../hooks/use-speaker-guard'
import { supabase } from '../lib/supabase'
import { LANGUAGES } from '../lib/languages'
import { PublicLayout } from '../components/layout/public-layout'
import { Field } from '../components/ui/field'
import { Button } from '../components/ui/button'
import { Stepper } from '../components/ui/stepper'
import type { Gender } from '../types/database'

const sans = { fontFamily: 'var(--font-body)', fontFeatureSettings: "'cv01','ss03'" }
const mono = { fontFamily: 'var(--font-mono)' }

type Step = 1 | 2 | 3 | 4
const LABELS = ['Identité', 'Langues', 'Bio', 'Récap']

interface FormData {
  gender: Gender | ''
  date_of_birth: string
  city: string
  phone: string
  languages: string[]
  dialects: Record<string, string[]>
  bio: string
}

const INITIAL: FormData = {
  gender: '', date_of_birth: '', city: '', phone: '',
  languages: [], dialects: {}, bio: '',
}

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Homme' },
  { value: 'female', label: 'Femme' },
  { value: 'other', label: 'Autre' },
  { value: 'prefer_not_to_say', label: 'Non précisé' },
]

export function SpeakerOnboardingPage() {
  const { user } = useAuth()
  const guard = useSpeakerGuard()
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>(1)
  const [form, setForm] = useState<FormData>(INITIAL)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (guard.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#08090a]">
        <Loader2 className="w-5 h-5 animate-spin text-[#8a8f98]" />
      </div>
    )
  }

  if (guard.hasProfile) return <Navigate to="/speaker/dashboard" replace />

  const update = <K extends keyof FormData>(k: K, v: FormData[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const toggleLanguage = (code: string) => {
    setForm((f) => {
      const has = f.languages.includes(code)
      const languages = has ? f.languages.filter((l) => l !== code) : [...f.languages, code]
      const dialects = { ...f.dialects }
      if (has) delete dialects[code]
      else dialects[code] = []
      return { ...f, languages, dialects }
    })
  }

  const toggleDialect = (lang: string, d: string) => {
    setForm((f) => {
      const current = f.dialects[lang] ?? []
      return {
        ...f,
        dialects: {
          ...f.dialects,
          [lang]: current.includes(d) ? current.filter((x) => x !== d) : [...current, d],
        },
      }
    })
  }

  const canNext: Record<Step, boolean> = {
    1: !!form.gender && !!form.city,
    2: form.languages.length >= 1,
    3: form.bio.length <= 400,
    4: true,
  }

  const submit = async () => {
    if (!user) return
    setError('')
    setLoading(true)

    const { error: err } = await (supabase
      .from('speaker_profiles')
      .upsert({
        id: user.id,
        gender: form.gender || null,
        date_of_birth: form.date_of_birth || null,
        city: form.city || null,
        phone: form.phone || null,
        languages: form.languages,
        dialects: form.dialects,
        bio: form.bio || null,
        verification_status: 'approved',
        is_available: true,
      } as unknown as never) as unknown as Promise<{ error: { message: string } | null }>)

    if (err) { setError(err.message); setLoading(false); return }
    navigate('/speaker/dashboard')
  }

  return (
    <PublicLayout
      brandTitle={<>Finalisez<br />votre profil<br />locuteur.</>}
      brandSubtitle="Quelques infos pour que les clients puissent vous proposer les bons projets."
    >
      {/* Top bar */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-3.5">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as Step)}
              className="inline-flex items-center gap-1.5 text-[12px] text-[#8a8f98] hover:text-[#f7f8f8] transition-colors"
              style={sans}
            >
              <ArrowLeft className="w-[13px] h-[13px]" strokeWidth={1.75} />
              Retour
            </button>
          ) : <span />}
          <span className="text-[11px] text-[#62666d]" style={mono}>
            /speaker/onboarding
          </span>
        </div>
        <Stepper
          current={step}
          total={4}
          labels={LABELS}
          onJump={(n) => n < step && setStep(n as Step)}
        />
      </div>

      {/* Contenu */}
      <div className="flex-1 flex flex-col justify-center max-w-[520px] w-full mx-auto mt-8">
        {error && (
          <div className="mb-4 flex items-start gap-2 px-3 py-2.5 rounded-md text-[12px] text-[#fca5a5] border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)]">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {step === 1 && (
          <>
            <StepTitle title="Votre identité" subtitle="Nous filtrons les projets selon le profil demandé." />
            <div className="flex flex-col gap-4 mt-6">
              <div>
                <div
                  className="text-[12px] text-[#d0d6e0] mb-2"
                  style={{ ...sans, fontWeight: 510 }}
                >
                  Genre <span className="text-[#62666d]">*</span>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {GENDER_OPTIONS.map((g) => {
                    const on = form.gender === g.value
                    return (
                      <button
                        key={g.value}
                        type="button"
                        onClick={() => update('gender', g.value)}
                        className="px-3.5 h-[34px] rounded-md text-[13px]"
                        style={{
                          ...sans,
                          fontWeight: 510,
                          color: on ? '#f7f8f8' : '#d0d6e0',
                          background: on ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
                          border: `1px solid ${on ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)'}`,
                        }}
                      >
                        {g.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <Field
                label="Date de naissance"
                type="date"
                icon={<Calendar className="w-3.5 h-3.5" strokeWidth={1.75} />}
                value={form.date_of_birth}
                onChange={(v) => update('date_of_birth', v)}
                hint="Optionnel."
              />
              <Field
                label="Ville"
                icon={<MapPin className="w-3.5 h-3.5" strokeWidth={1.75} />}
                placeholder="Dakar"
                required
                value={form.city}
                onChange={(v) => update('city', v)}
              />
              <Field
                label="Téléphone"
                icon={<Phone className="w-3.5 h-3.5" strokeWidth={1.75} />}
                placeholder="+221 77 000 00 00"
                hint="Optionnel. Pour les paiements Wave / Orange Money."
                value={form.phone}
                onChange={(v) => update('phone', v)}
              />
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <StepTitle
              title="Langues parlées"
              subtitle="Sélectionnez au moins une langue. Ajoutez les dialectes si vous les connaissez."
            />
            <div className="flex flex-col gap-2.5 mt-6">
              {Object.entries(LANGUAGES).map(([code, lang]) => {
                const active = form.languages.includes(code)
                const selectedD = form.dialects[code] ?? []
                return (
                  <div
                    key={code}
                    className="rounded-lg p-3"
                    style={{
                      background: active ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${active ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)'}`,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleLanguage(code)}
                      className="w-full flex items-center gap-2.5"
                    >
                      <span
                        className="w-[18px] h-[18px] rounded-sm flex items-center justify-center shrink-0"
                        style={{
                          border: `1.5px solid ${active ? '#f7f8f8' : 'rgba(255,255,255,0.2)'}`,
                          background: active ? '#f7f8f8' : 'transparent',
                        }}
                      >
                        {active && <Check className="w-3 h-3" strokeWidth={3} style={{ color: '#08090a' }} />}
                      </span>
                      <span
                        className="text-[14px] text-[#f7f8f8]"
                        style={{ ...sans, fontWeight: 510 }}
                      >
                        {lang.label}
                      </span>
                      <span className="ml-auto text-[11px] text-[#62666d]" style={mono}>
                        {active ? `${selectedD.length}/${lang.dialects.length}` : ''}
                      </span>
                    </button>

                    {active && lang.dialects.length > 0 && (
                      <div className="flex gap-1.5 flex-wrap mt-2.5 pl-7">
                        {lang.dialects.map((d) => {
                          const on = selectedD.includes(d)
                          return (
                            <button
                              key={d}
                              type="button"
                              onClick={() => toggleDialect(code, d)}
                              className="px-2.5 py-[3px] text-[12px] rounded-full"
                              style={{
                                ...sans,
                                fontWeight: 510,
                                color: on ? '#f7f8f8' : '#d0d6e0',
                                background: on ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
                                border: `1px solid ${on ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)'}`,
                              }}
                            >
                              {d}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <StepTitle
              title="Présentation"
              subtitle="Une courte bio aide les clients à vous choisir. Optionnel."
            />
            <div className="mt-6">
              <div
                className="rounded-md px-3 py-2.5"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <textarea
                  value={form.bio}
                  onChange={(e) => update('bio', e.target.value.slice(0, 400))}
                  placeholder="Ex : Journaliste radio à Dakar, locuteur natif wolof, 12 ans d'expérience en voix-off."
                  className="w-full bg-transparent border-0 outline-none text-[#f7f8f8] text-[14px] resize-y"
                  style={{ ...sans, lineHeight: 1.5, minHeight: 120 }}
                />
              </div>
              <div className="text-[11px] text-[#62666d] mt-1.5 text-right tabular-nums" style={mono}>
                {form.bio.length}/400
              </div>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <StepTitle title="Récapitulatif" subtitle="Vérifiez avant de valider votre profil." />
            <div
              className="mt-6 p-5 rounded-[10px] flex flex-col gap-3"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <SummaryLine label="Genre" value={GENDER_OPTIONS.find((g) => g.value === form.gender)?.label ?? '—'} />
              <SummaryLine label="Ville" value={form.city || '—'} />
              {form.date_of_birth && <SummaryLine label="Né(e) le" value={form.date_of_birth} />}
              {form.phone && <SummaryLine label="Téléphone" value={form.phone} mono />}
              <SummaryLine
                label="Langues"
                value={form.languages.length === 0
                  ? '—'
                  : form.languages.map((c) => LANGUAGES[c]?.label ?? c).join(', ')}
              />
              <SummaryLine label="Bio" value={form.bio || 'Non renseignée'} multiline />
            </div>
          </>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center mt-6 gap-3">
          {step > 1 ? (
            <Button
              variant="ghost"
              size="lg"
              icon={<ArrowLeft className="w-4 h-4" strokeWidth={1.75} />}
              onClick={() => setStep((s) => (s - 1) as Step)}
            >
              Retour
            </Button>
          ) : <span />}
          {step < 4 ? (
            <Button
              variant="primary"
              size="lg"
              iconRight={<ArrowRight className="w-4 h-4" strokeWidth={1.75} />}
              disabled={!canNext[step]}
              onClick={() => setStep((s) => (s + 1) as Step)}
            >
              Continuer
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              iconRight={<Check className="w-4 h-4" strokeWidth={2.5} />}
              loading={loading}
              onClick={submit}
            >
              Créer mon profil
            </Button>
          )}
        </div>
      </div>
    </PublicLayout>
  )
}

/* ---------- Helpers ---------- */

function StepTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <>
      <h1
        className="text-[24px] sm:text-[28px] text-[#f7f8f8] m-0"
        style={{ ...sans, fontWeight: 510, lineHeight: 1.1, letterSpacing: '-0.5px' }}
      >
        {title}
      </h1>
      <p className="text-[14px] text-[#8a8f98] mt-2" style={sans}>
        {subtitle}
      </p>
    </>
  )
}

function SummaryLine({
  label, value, mono: isMono, multiline,
}: {
  label: string
  value: string
  mono?: boolean
  multiline?: boolean
}) {
  return (
    <div className={`grid grid-cols-[100px_1fr] gap-3 ${multiline ? 'items-start' : 'items-center'}`}>
      <span
        className="text-[11px] text-[#62666d] uppercase"
        style={{ ...sans, fontWeight: 510, letterSpacing: '0.04em' }}
      >
        {label}
      </span>
      <span
        className={`text-[13px] text-[#f7f8f8] ${multiline ? 'leading-relaxed' : 'truncate'}`}
        style={isMono ? mono : { ...sans, fontWeight: 510 }}
      >
        {value}
      </span>
    </div>
  )
}
