import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import {
  Loader2, AlertCircle, Mail, Lock, User, Phone, MapPin, Calendar,
  ArrowRight, ArrowLeft, Check, Pencil,
} from 'lucide-react'
import { useAuth } from '../hooks/use-auth'
import { supabase } from '../lib/supabase'
import { LANGUAGES } from '../lib/languages'
import { PublicLayout } from '../components/layout/public-layout'
import { Field } from '../components/ui/field'
import { Button } from '../components/ui/button'
import { Stepper } from '../components/ui/stepper'
import type { Gender } from '../types/database'
import { parseAuthError, precheckWhitelist } from '../lib/auth-errors'

type Step = 1 | 2 | 3 | 4 | 5

interface SpeakerForm {
  name: string
  email: string
  phone: string
  password: string
  gender: Gender | ''
  dob: string
  city: string
  langs: Record<string, string[]>
  bio: string
}

const INITIAL: SpeakerForm = {
  name: '', email: '', phone: '', password: '',
  gender: '', dob: '', city: '',
  langs: {}, bio: '',
}

const LABELS = ['Compte', 'Identité', 'Langues', 'Présentation', 'Récap']

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Homme' },
  { value: 'female', label: 'Femme' },
]

export function SpeakerRegisterPage() {
  const { signUp, user, loading: authLoading, role } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>(1)
  const [data, setData] = useState<SpeakerForm>(INITIAL)
  const [error, setError] = useState('')
  const [accessDenied, setAccessDenied] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--t-bg)]">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--t-fg-2)]" />
      </div>
    )
  }

  if (user && role && !submitted) {
    if (role === 'speaker') return <Navigate to="/speaker/dashboard" replace />
    if (role === 'admin') return <Navigate to="/admin" replace />
    return <Navigate to="/dashboard" replace />
  }

  const update = <K extends keyof SpeakerForm>(k: K, v: SpeakerForm[K]) =>
    setData((d) => ({ ...d, [k]: v }))

  const canNext: Record<Step, boolean> = {
    1: !!data.name && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) && !!data.phone && data.password.length >= 8,
    2: !!data.gender && !!data.city,
    3: Object.keys(data.langs).length >= 1,
    4: data.bio.length <= 400,
    5: true,
  }

  const goBack = () => {
    setError('')
    if (step === 1) navigate('/register')
    else setStep((s) => (s - 1) as Step)
  }

  const goNext = () => {
    setError('')
    if (!canNext[step]) return
    if (step < 5) setStep((s) => (s + 1) as Step)
  }

  const submit = async () => {
    setError('')
    setSubmitting(true)
    setSubmitted(true)

    // Pré-check whitelist : court-circuite l'erreur DB cryptique côté Supabase Auth
    const allowed = await precheckWhitelist(data.email.trim())
    if (allowed === false) {
      setError("Cet email n'est pas encore autorisé. Daandé est en beta privée — demandez un accès.")
      setAccessDenied(true)
      setSubmitting(false); setSubmitted(false)
      return
    }

    const { error: signUpError } = await signUp(
      data.email.trim(), data.password, data.name.trim(), 'speaker',
    )
    if (signUpError) {
      const parsed = parseAuthError(signUpError)
      setError(parsed.message)
      setAccessDenied(parsed.isAccessDenied)
      setSubmitting(false); setSubmitted(false)
      return
    }

    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) {
      setError('Session introuvable après inscription.')
      setSubmitting(false); setSubmitted(false)
      return
    }

    const { error: profileError } = await (supabase
      .from('speaker_profiles')
      .upsert({
        id: u.id,
        phone: data.phone.trim() || null,
        gender: data.gender || null,
        date_of_birth: data.dob || null,
        city: data.city.trim() || null,
        languages: Object.keys(data.langs),
        dialects: data.langs,
        bio: data.bio.trim() || null,
        verification_status: 'approved',
        is_available: true,
      } as unknown as never) as unknown as Promise<{ error: { message: string } | null }>)

    if (profileError) {
      setError(profileError.message)
      setSubmitting(false); setSubmitted(false)
      return
    }

    navigate('/speaker/dashboard', { replace: true })
  }

  return (
    <PublicLayout
      brandTitle={<>Votre voix<br />compte.<br />Littéralement.</>}
      brandSubtitle="Chaque projet terminé est payé via Wave ou Orange Money. Inscription en 5 minutes depuis votre téléphone."
    >
      {/* Top bar */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-1.5 text-[12px] text-[var(--t-fg-3)] hover:text-[var(--t-fg)] transition-colors"
            style={{ fontFamily: 'var(--font-body)', fontFeatureSettings: "'cv01','ss03'" }}
          >
            <ArrowLeft className="w-[13px] h-[13px]" strokeWidth={1.75} />
            Retour
          </button>
          <span
            className="text-[11px] text-[var(--t-fg-4)]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            /speaker/register
          </span>
        </div>
        <Stepper
          current={step}
          total={5}
          labels={LABELS}
          onJump={(n) => n < step && setStep(n as Step)}
        />
      </div>

      {/* Contenu */}
      <div className="flex-1 flex flex-col justify-center max-w-[520px] w-full mx-auto mt-8">
        {error && (
          <div
            className="mb-4 flex flex-col gap-2 px-3 py-2.5 rounded-md text-[12px]"
            style={{
              color: 'var(--t-danger-text)',
              border: '1px solid var(--t-danger-muted-border)',
              background: 'var(--t-danger-muted-bg)',
            }}
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
            {accessDenied && (
              <Link
                to="/request-access"
                className="inline-flex items-center gap-1.5 self-start px-2.5 h-[26px] rounded-md text-[12px] transition-colors"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontFeatureSettings: "'cv01','ss03'",
                  fontWeight: 510,
                  color: 'var(--t-fg)',
                  background: 'var(--t-surface)',
                  border: '1px solid var(--t-border)',
                }}
              >
                Demander un accès
                <ArrowRight className="w-3 h-3" strokeWidth={1.75} />
              </Link>
            )}
          </div>
        )}

        {step === 1 && (
          <>
            <StepTitle title="Votre compte" subtitle="Ces informations servent à vous connecter et vous payer." />
            <div className="flex flex-col gap-3.5 mt-6">
              <Field label="Nom complet" icon={<User className="w-3.5 h-3.5" strokeWidth={1.75} />} placeholder="Aminata Diop" required value={data.name} onChange={(v) => update('name', v)} />
              <Field label="Email" type="email" icon={<Mail className="w-3.5 h-3.5" strokeWidth={1.75} />} placeholder="aminata@exemple.com" required value={data.email} onChange={(v) => update('email', v)} />
              <Field
                label="Téléphone"
                icon={<Phone className="w-3.5 h-3.5" strokeWidth={1.75} />}
                placeholder="+221 77 000 00 00"
                required
                hint="Pour les paiements Wave / Orange Money. Vérifié par SMS."
                value={data.phone}
                onChange={(v) => update('phone', v)}
              />
              <Field
                label="Mot de passe"
                type="password"
                icon={<Lock className="w-3.5 h-3.5" strokeWidth={1.75} />}
                placeholder="8 caractères minimum"
                required
                value={data.password}
                onChange={(v) => update('password', v)}
                hint={
                  data.password.length > 0 && data.password.length < 8
                    ? `${data.password.length}/8`
                    : '8 caractères minimum.'
                }
              />
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <StepTitle title="Votre identité" subtitle="Nous filtrons les projets selon le profil demandé." />
            <div className="flex flex-col gap-4 mt-6">
              <div>
                <div
                  className="text-[12px] text-[var(--t-fg-2)] mb-2"
                  style={{ fontFamily: 'var(--font-body)', fontFeatureSettings: "'cv01','ss03'", fontWeight: 510 }}
                >
                  Genre <span className="text-[var(--t-fg-4)]">*</span>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {GENDER_OPTIONS.map((g) => {
                    const on = data.gender === g.value
                    return (
                      <button
                        key={g.value}
                        type="button"
                        onClick={() => update('gender', g.value)}
                        className="px-3.5 h-[34px] rounded-md text-[13px]"
                        style={{
                          fontFamily: 'var(--font-body)',
                          fontFeatureSettings: "'cv01','ss03'",
                          fontWeight: 510,
                          color: on ? 'var(--t-fg)' : 'var(--t-fg-2)',
                          background: on ? 'var(--t-border)' : 'var(--t-surface)',
                          border: `1px solid ${on ? 'var(--t-border-strong)' : 'var(--t-border)'}`,
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
                placeholder="jj/mm/aaaa"
                value={data.dob}
                onChange={(v) => update('dob', v)}
                hint="Optionnel."
              />
              <Field
                label="Ville"
                icon={<MapPin className="w-3.5 h-3.5" strokeWidth={1.75} />}
                placeholder="Dakar"
                required
                value={data.city}
                onChange={(v) => update('city', v)}
              />
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <StepTitle
              title="Langues parlées"
              subtitle="Sélectionnez au moins une langue. Ajoutez les dialectes si vous les connaissez."
            />
            <div className="flex flex-col gap-2.5 mt-6">
              {Object.entries(LANGUAGES).map(([code, lang]) => {
                const active = code in data.langs
                const selectedDialects = data.langs[code] ?? []
                return (
                  <div
                    key={code}
                    className="rounded-lg p-3"
                    style={{
                      background: active ? 'var(--t-surface-2)' : 'var(--t-surface)',
                      border: `1px solid ${active ? 'var(--t-border-strong)' : 'var(--t-border)'}`,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        const next = { ...data.langs }
                        if (active) delete next[code]
                        else next[code] = []
                        update('langs', next)
                      }}
                      className="w-full flex items-center gap-2.5 cursor-pointer"
                    >
                      <span
                        className="w-[18px] h-[18px] rounded-sm flex items-center justify-center shrink-0"
                        style={{
                          border: `1.5px solid ${active ? 'var(--t-fg)' : 'var(--t-border-strong)'}`,
                          background: active ? 'var(--t-fg)' : 'transparent',
                        }}
                      >
                        {active && <Check className="w-3 h-3" strokeWidth={3} style={{ color: 'var(--t-bg)' }} />}
                      </span>
                      <span
                        className="text-[14px] text-[var(--t-fg)]"
                        style={{
                          fontFamily: 'var(--font-body)',
                          fontFeatureSettings: "'cv01','ss03'",
                          fontWeight: 510,
                        }}
                      >
                        {lang.label}
                      </span>
                      <span
                        className="ml-auto text-[11px] text-[var(--t-fg-4)]"
                        style={{ fontFamily: 'var(--font-body)', fontFeatureSettings: "'cv01','ss03'" }}
                      >
                        {active
                          ? `${selectedDialects.length} dialecte${selectedDialects.length > 1 ? 's' : ''}`
                          : ''}
                      </span>
                    </button>

                    {active && lang.dialects.length > 0 && (
                      <div className="flex gap-1.5 flex-wrap mt-2.5 pl-7">
                        {lang.dialects.map((d) => {
                          const on = selectedDialects.includes(d)
                          return (
                            <button
                              key={d}
                              type="button"
                              onClick={() => {
                                const next = { ...data.langs }
                                next[code] = on
                                  ? selectedDialects.filter((x) => x !== d)
                                  : [...selectedDialects, d]
                                update('langs', next)
                              }}
                              className="px-2.5 py-[3px] text-[12px] rounded-full cursor-pointer"
                              style={{
                                fontFamily: 'var(--font-body)',
                                fontFeatureSettings: "'cv01','ss03'",
                                fontWeight: 510,
                                color: on ? 'var(--t-fg)' : 'var(--t-fg-2)',
                                background: on ? 'var(--t-border)' : 'var(--t-surface)',
                                border: `1px solid ${on ? 'var(--t-border-strong)' : 'var(--t-border)'}`,
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

        {step === 4 && (
          <>
            <StepTitle
              title="Présentation"
              subtitle="Une courte bio aide les clients à vous choisir. Optionnel."
            />
            <div className="mt-6">
              <label
                className="block text-[12px] text-[var(--t-fg-2)] mb-1.5"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontFeatureSettings: "'cv01','ss03'",
                  fontWeight: 510,
                }}
              >
                Bio
              </label>
              <div
                className="rounded-md px-3 py-2.5"
                style={{
                  background: 'var(--t-surface)',
                  border: '1px solid var(--t-border)',
                }}
              >
                <textarea
                  value={data.bio}
                  onChange={(e) => update('bio', e.target.value.slice(0, 400))}
                  placeholder="Ex : Journaliste radio à Dakar, locuteur natif wolof, 12 ans d'expérience en voix-off."
                  className="w-full bg-transparent border-0 outline-none text-[var(--t-fg)] text-[14px] resize-y"
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontFeatureSettings: "'cv01','ss03'",
                    lineHeight: 1.5,
                    minHeight: 120,
                  }}
                />
              </div>
              <div
                className="text-[11px] text-[var(--t-fg-4)] mt-1.5 text-right tabular-nums"
                style={{ fontFamily: 'var(--font-body)', fontFeatureSettings: "'cv01','ss03'" }}
              >
                {data.bio.length}/400
              </div>
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <StepTitle
              title="Récapitulatif"
              subtitle="Vérifiez vos informations avant de créer votre compte."
            />
            <div
              className="mt-6 p-5 rounded-[10px] flex flex-col gap-3.5"
              style={{
                background: 'var(--t-surface)',
                border: '1px solid var(--t-border)',
              }}
            >
              <SummaryRow label="Compte" onEdit={() => setStep(1)}>
                <div>
                  <strong className="text-[var(--t-fg)]" style={{ fontWeight: 590 }}>
                    {data.name || '—'}
                  </strong>
                </div>
                <div>
                  {data.email || '—'}{data.phone ? ` · ${data.phone}` : ''}
                </div>
              </SummaryRow>
              <Divider />
              <SummaryRow label="Identité" onEdit={() => setStep(2)}>
                <div>
                  {GENDER_OPTIONS.find((g) => g.value === data.gender)?.label || '—'}
                  {data.dob ? ` · né(e) le ${data.dob}` : ''}
                </div>
                <div>{data.city || '—'}</div>
              </SummaryRow>
              <Divider />
              <SummaryRow label="Langues" onEdit={() => setStep(3)}>
                {Object.entries(data.langs).length === 0 ? (
                  <div>—</div>
                ) : (
                  Object.entries(data.langs).map(([code, ds]) => (
                    <div key={code}>
                      <strong className="text-[var(--t-fg)]" style={{ fontWeight: 590 }}>
                        {LANGUAGES[code]?.label ?? code}
                      </strong>
                      {ds.length > 0 && (
                        <span className="text-[var(--t-fg-3)]"> — {ds.join(', ')}</span>
                      )}
                    </div>
                  ))
                )}
              </SummaryRow>
              <Divider />
              <SummaryRow label="Bio" onEdit={() => setStep(4)}>
                <div
                  className={data.bio ? 'text-[var(--t-fg-2)]' : 'text-[var(--t-fg-4)] italic'}
                >
                  {data.bio || 'Non renseignée.'}
                </div>
              </SummaryRow>
            </div>
          </>
        )}

        {/* Footer actions */}
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
          ) : (
            <span />
          )}
          {step < 5 ? (
            <Button
              variant="primary"
              size="lg"
              iconRight={<ArrowRight className="w-4 h-4" strokeWidth={1.75} />}
              disabled={!canNext[step]}
              onClick={goNext}
            >
              Continuer
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              iconRight={<Check className="w-4 h-4" strokeWidth={2.5} />}
              loading={submitting}
              onClick={submit}
            >
              Créer mon compte locuteur
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
        className="text-[24px] sm:text-[28px] text-[var(--t-fg)] m-0"
        style={{
          fontFamily: 'var(--font-body)',
          fontFeatureSettings: "'cv01','ss03'",
          fontWeight: 510,
          lineHeight: 1.1,
          letterSpacing: '-0.5px',
        }}
      >
        {title}
      </h1>
      <p
        className="text-[14px] text-[var(--t-fg-3)] mt-2"
        style={{ fontFamily: 'var(--font-body)', fontFeatureSettings: "'cv01','ss03'" }}
      >
        {subtitle}
      </p>
    </>
  )
}

function SummaryRow({
  label, onEdit, children,
}: {
  label: string
  onEdit: () => void
  children: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-[110px_1fr_auto] gap-4 items-start">
      <div
        className="text-[11px] text-[var(--t-fg-4)] uppercase pt-0.5"
        style={{
          fontFamily: 'var(--font-body)',
          fontFeatureSettings: "'cv01','ss03'",
          fontWeight: 510,
          letterSpacing: '0.04em',
        }}
      >
        {label}
      </div>
      <div
        className="text-[13px] text-[var(--t-fg-2)]"
        style={{
          fontFamily: 'var(--font-body)',
          fontFeatureSettings: "'cv01','ss03'",
          lineHeight: 1.6,
        }}
      >
        {children}
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex items-center gap-1 text-[12px] text-[var(--t-fg-3)] hover:text-[var(--t-fg)] transition-colors bg-transparent border-0 cursor-pointer"
        style={{ fontFamily: 'var(--font-body)', fontFeatureSettings: "'cv01','ss03'" }}
      >
        <Pencil className="w-[11px] h-[11px]" strokeWidth={1.75} />
        Modifier
      </button>
    </div>
  )
}

function Divider() {
  return <div className="h-px" style={{ background: 'var(--t-surface-active)' }} />
}
