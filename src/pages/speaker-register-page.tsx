import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import {
  Loader2, Mic, AlertCircle, Mail, Lock, User, Phone, MapPin, Calendar,
  ChevronRight, ChevronLeft, Check, Sparkles, Globe, Heart,
} from 'lucide-react'
import { useAuth } from '../hooks/use-auth'
import { supabase } from '../lib/supabase'
import { LANGUAGES } from '../lib/languages'
import type { Gender } from '../types/database'

type Step = 1 | 2 | 3 | 4 | 5

interface SpeakerForm {
  fullName: string
  email: string
  password: string
  phone: string
  gender: Gender | ''
  dateOfBirth: string
  city: string
  languages: string[]
  dialects: Record<string, string[]>
  bio: string
}

const INITIAL: SpeakerForm = {
  fullName: '',
  email: '',
  password: '',
  phone: '',
  gender: '',
  dateOfBirth: '',
  city: '',
  languages: [],
  dialects: {},
  bio: '',
}

const STEPS: { id: Step; label: string; hint: string }[] = [
  { id: 1, label: 'Compte', hint: 'Email & mot de passe' },
  { id: 2, label: 'Identité', hint: 'Genre, âge, ville' },
  { id: 3, label: 'Langues', hint: 'Ce que vous parlez' },
  { id: 4, label: 'Voix', hint: 'Présentez-vous' },
  { id: 5, label: 'C\'est parti', hint: 'Créer le compte' },
]

export function SpeakerRegisterPage() {
  const { signUp, user, loading: authLoading, role, roleStatus } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>(1)
  const [form, setForm] = useState<SpeakerForm>(INITIAL)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const waitingForRole = user !== null && roleStatus !== 'loaded' && roleStatus !== 'error'

  if (authLoading || waitingForRole) {
    return <FullscreenLoader />
  }

  if (user && role && !submitted) {
    if (role === 'speaker') return <Navigate to="/speaker/dashboard" replace />
    if (role === 'admin') return <Navigate to="/admin/withdrawals" replace />
    return <Navigate to="/dashboard" replace />
  }

  const toggleLanguage = (code: string) => {
    setForm(f => {
      const has = f.languages.includes(code)
      const languages = has ? f.languages.filter(l => l !== code) : [...f.languages, code]
      const dialects = { ...f.dialects }
      if (has) delete dialects[code]
      else dialects[code] = []
      return { ...f, languages, dialects }
    })
  }

  const toggleDialect = (lang: string, dialect: string) => {
    setForm(f => {
      const current = f.dialects[lang] ?? []
      const updated = current.includes(dialect)
        ? current.filter(d => d !== dialect)
        : [...current, dialect]
      return { ...f, dialects: { ...f.dialects, [lang]: updated } }
    })
  }

  const canProceed = (): boolean => {
    if (step === 1) {
      return form.fullName.trim().length >= 2
        && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
        && form.password.length >= 8
        && form.phone.trim().length >= 8
    }
    if (step === 2) return form.gender !== '' && form.city.trim().length >= 2
    if (step === 3) return form.languages.length > 0
    return true
  }

  const goNext = () => {
    setError('')
    if (!canProceed()) return
    if (step < 5) setStep((s) => (s + 1) as Step)
  }

  const goBack = () => {
    setError('')
    if (step > 1) setStep((s) => (s - 1) as Step)
  }

  const submit = async () => {
    setError('')
    setLoading(true)
    setSubmitted(true)

    const { error: signUpError } = await signUp(
      form.email.trim(),
      form.password,
      form.fullName.trim(),
      'speaker',
    )

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      setSubmitted(false)
      return
    }

    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) {
      setError('Session introuvable après inscription. Réessayez.')
      setLoading(false)
      setSubmitted(false)
      return
    }

    const { error: profileError } = await (supabase
      .from('speaker_profiles')
      .upsert({
        id: u.id,
        phone: form.phone.trim() || null,
        gender: form.gender || null,
        date_of_birth: form.dateOfBirth || null,
        city: form.city.trim() || null,
        languages: form.languages,
        dialects: form.dialects,
        bio: form.bio.trim() || null,
        verification_status: 'approved',
        is_available: true,
      } as unknown as never) as unknown as Promise<{ error: { message: string } | null }>)

    if (profileError) {
      setError(profileError.message)
      setLoading(false)
      setSubmitted(false)
      return
    }

    navigate('/speaker/dashboard', { replace: true })
  }

  return (
    <div className="min-h-[100dvh] bg-[#FEF9F3] relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute top-[-15%] right-[-10%] w-[520px] h-[520px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.14) 0%, transparent 65%)' }}
        />
        <div
          className="absolute bottom-[-20%] left-[-15%] w-[560px] h-[560px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.10) 0%, transparent 65%)' }}
        />
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.04] mix-blend-multiply"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <defs>
            <pattern id="wax-pattern" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 0 30 Q 15 0 30 30 T 60 30" stroke="currentColor" fill="none" strokeWidth="1.5" className="text-primary-900" />
              <path d="M 0 45 Q 15 15 30 45 T 60 45" stroke="currentColor" fill="none" strokeWidth="1.5" className="text-primary-900" />
              <circle cx="15" cy="15" r="1.5" fill="currentColor" className="text-primary-900" />
              <circle cx="45" cy="45" r="1.5" fill="currentColor" className="text-primary-900" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#wax-pattern)" />
        </svg>
      </div>

      <div className="relative z-10 w-full max-w-[560px] mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* En-tête */}
        <header className="mb-6 sm:mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-6 group">
            <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/30 group-hover:scale-105 transition-transform">
              <Mic className="w-5 h-5 text-white" />
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-secondary-500 border-2 border-[#FEF9F3]" />
            </div>
            <span
              className="text-xl font-extrabold text-sand-900 leading-none"
              style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.03em' }}
            >
              Baat-IA
            </span>
          </Link>

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-primary-600 uppercase tracking-[0.18em] mb-1.5">
                {String(step).padStart(2, '0')} / 05
              </p>
              <h1
                className="text-[28px] sm:text-[34px] font-extrabold text-sand-900 leading-[1.05]"
                style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.035em' }}
              >
                {step === 1 && <>Prêtez votre <span className="text-primary-600">voix</span>, gagnez de l'argent.</>}
                {step === 2 && <>Parlez-nous de <span className="text-primary-600">vous</span>.</>}
                {step === 3 && <>Quelles <span className="text-secondary-600">langues</span> parlez-vous ?</>}
                {step === 4 && <>Votre <span className="text-accent-600">voix</span> en quelques mots.</>}
                {step === 5 && <>Tout est <span className="text-secondary-600">prêt</span>.</>}
              </h1>
              <p className="text-sand-500 text-sm mt-2 leading-relaxed">
                {step === 1 && 'Créez votre compte pour rejoindre la communauté des locuteurs Baat-IA.'}
                {step === 2 && 'Ces informations permettent aux clients de vous proposer des projets adaptés.'}
                {step === 3 && 'Sélectionnez toutes les langues que vous parlez couramment.'}
                {step === 4 && 'Un petit texte de présentation (optionnel mais conseillé).'}
                {step === 5 && 'Validez pour créer votre compte et accéder à votre espace locuteur.'}
              </p>
            </div>
          </div>
        </header>

        {/* Stepper */}
        <nav className="mb-6 sm:mb-8" aria-label="Progression">
          <ol className="flex items-center gap-1.5">
            {STEPS.map((s) => {
              const done = s.id < step
              const active = s.id === step
              return (
                <li key={s.id} className="flex-1 flex flex-col gap-1.5">
                  <div
                    className={[
                      'h-1.5 rounded-full transition-all duration-500',
                      done
                        ? 'bg-gradient-to-r from-primary-500 to-primary-600'
                        : active
                          ? 'bg-gradient-to-r from-primary-500 to-primary-300'
                          : 'bg-sand-200',
                    ].join(' ')}
                  />
                  <span
                    className={[
                      'text-[10px] font-bold uppercase tracking-wider hidden sm:block',
                      active ? 'text-primary-700' : done ? 'text-sand-600' : 'text-sand-400',
                    ].join(' ')}
                  >
                    {s.label}
                  </span>
                </li>
              )
            })}
          </ol>
        </nav>

        {/* Card principale */}
        <div className="bg-white rounded-[28px] shadow-[0_12px_40px_-12px_rgba(28,25,23,0.12)] border border-sand-200/70 p-6 sm:p-8 relative">
          {/* Décoration coin */}
          <div className="absolute top-0 right-0 w-24 h-24 pointer-events-none overflow-hidden rounded-tr-[28px]">
            <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full bg-gradient-to-br from-primary-100 to-transparent" />
          </div>

          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200/70 text-red-700 px-4 py-3 rounded-xl text-sm mb-5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* Étape 1 — Compte */}
          {step === 1 && (
            <div className="space-y-4">
              <FormField label="Nom complet" required icon={<User className="w-4 h-4" />}>
                <input
                  type="text"
                  required
                  autoFocus
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  className="peer-input"
                  placeholder="Moussa Diallo"
                />
              </FormField>

              <FormField label="Email" required icon={<Mail className="w-4 h-4" />}>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="peer-input"
                  placeholder="moussa@email.com"
                />
              </FormField>

              <FormField
                label="Téléphone"
                required
                icon={<Phone className="w-4 h-4" />}
                helper="Pour recevoir vos paiements via Wave ou Orange Money"
              >
                <input
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="peer-input"
                  placeholder="+221 77 000 00 00"
                />
              </FormField>

              <FormField
                label="Mot de passe"
                required
                icon={<Lock className="w-4 h-4" />}
                helper="8 caractères minimum"
              >
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="peer-input"
                  placeholder="••••••••"
                />
              </FormField>
            </div>
          )}

          {/* Étape 2 — Identité */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-sand-800 mb-2.5">
                  Genre <span className="text-primary-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ['male', 'Homme'],
                    ['female', 'Femme'],
                    ['other', 'Autre'],
                    ['prefer_not_to_say', 'Non précisé'],
                  ] as const).map(([val, lbl]) => {
                    const selected = form.gender === val
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, gender: val }))}
                        className={[
                          'relative py-3 rounded-2xl border-2 text-sm font-bold transition-all duration-200',
                          selected
                            ? 'bg-primary-50 border-primary-500 text-primary-700 shadow-md shadow-primary-500/10'
                            : 'border-sand-200 text-sand-600 hover:border-sand-300 hover:bg-sand-50',
                        ].join(' ')}
                      >
                        {selected && (
                          <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary-500 flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                          </span>
                        )}
                        {lbl}
                      </button>
                    )
                  })}
                </div>
              </div>

              <FormField
                label="Date de naissance"
                icon={<Calendar className="w-4 h-4" />}
                helper="Optionnel — améliore le matching avec les projets"
              >
                <input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
                  className="peer-input"
                />
              </FormField>

              <FormField label="Ville" required icon={<MapPin className="w-4 h-4" />}>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  className="peer-input"
                  placeholder="Dakar, Thiès, Bamako…"
                />
              </FormField>
            </div>
          )}

          {/* Étape 3 — Langues */}
          {step === 3 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-sand-500 bg-sand-50 px-3 py-2 rounded-xl mb-1">
                <Globe className="w-3.5 h-3.5 text-primary-500" />
                Choisissez au moins une langue. Ajoutez vos dialectes si vous en avez.
              </div>

              {Object.entries(LANGUAGES).map(([code, lang]) => {
                const selected = form.languages.includes(code)
                return (
                  <div key={code}>
                    <button
                      type="button"
                      onClick={() => toggleLanguage(code)}
                      className={[
                        'w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border-2 text-sm font-bold transition-all duration-200',
                        selected
                          ? 'bg-secondary-50 border-secondary-500 text-secondary-700 shadow-md shadow-secondary-500/10'
                          : 'border-sand-200 text-sand-700 hover:border-sand-300 hover:bg-sand-50',
                      ].join(' ')}
                    >
                      <span className="flex items-center gap-2.5">
                        <span
                          className={[
                            'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors',
                            selected ? 'bg-secondary-500 border-secondary-500' : 'border-sand-300',
                          ].join(' ')}
                        >
                          {selected && <Check className="w-3 h-3 text-white" strokeWidth={3.5} />}
                        </span>
                        {lang.label}
                      </span>
                      <span className="text-xs text-sand-400 font-semibold">
                        {lang.dialects.length} variantes
                      </span>
                    </button>

                    {selected && lang.dialects.length > 0 && (
                      <div className="mt-2 ml-2 pl-4 border-l-2 border-secondary-200 flex flex-wrap gap-1.5 py-1">
                        {lang.dialects.map((d) => {
                          const active = (form.dialects[code] ?? []).includes(d)
                          return (
                            <button
                              key={d}
                              type="button"
                              onClick={() => toggleDialect(code, d)}
                              className={[
                                'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
                                active
                                  ? 'bg-accent-500 border-accent-500 text-white shadow-sm'
                                  : 'border-sand-200 text-sand-500 hover:border-sand-300 bg-white',
                              ].join(' ')}
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
          )}

          {/* Étape 4 — Bio */}
          {step === 4 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-sand-500 bg-sand-50 px-3 py-2 rounded-xl mb-1">
                <Heart className="w-3.5 h-3.5 text-accent-500" />
                Optionnel — mais ça augmente vos chances d'être sélectionné.
              </div>
              <textarea
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                rows={6}
                maxLength={400}
                className="w-full px-4 py-3.5 rounded-2xl border-2 border-sand-200 bg-sand-50/60 text-sand-900 placeholder-sand-400 text-sm leading-relaxed focus:outline-none focus:border-primary-400 focus:bg-white transition-all resize-none"
                placeholder="Ex : Locuteur Wolof natif de Dakar, je parle également le Pulaar. Voix claire et articulée, expérience en narration et doublage…"
              />
              <p className="text-xs text-sand-400 text-right tabular-nums">{form.bio.length}/400</p>
            </div>
          )}

          {/* Étape 5 — Récap */}
          {step === 5 && (
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-secondary-50 to-primary-50 border border-secondary-200/60 rounded-full px-3 py-1.5">
                <Sparkles className="w-3.5 h-3.5 text-secondary-600" />
                <span className="text-xs font-bold text-secondary-700">Profil prêt à être validé</span>
              </div>

              <RecapRow label="Nom" value={form.fullName} />
              <RecapRow label="Email" value={form.email} />
              <RecapRow label="Téléphone" value={form.phone} />
              <RecapRow
                label="Genre"
                value={
                  form.gender === 'male' ? 'Homme'
                    : form.gender === 'female' ? 'Femme'
                    : form.gender === 'other' ? 'Autre'
                    : form.gender ? 'Non précisé' : '—'
                }
              />
              <RecapRow label="Ville" value={form.city} />
              <RecapRow
                label="Langues"
                value={form.languages.length
                  ? form.languages.map((c) => LANGUAGES[c]?.label ?? c).join(', ')
                  : '—'}
              />

              <div className="bg-gradient-to-br from-primary-50 via-white to-secondary-50 border border-primary-200/50 rounded-2xl p-4">
                <p className="text-sm font-bold text-sand-800 mb-1">
                  Et ensuite ?
                </p>
                <p className="text-xs text-sand-600 leading-relaxed">
                  Vous accéderez à votre espace locuteur pour parcourir les projets disponibles,
                  enregistrer vos voix et suivre vos gains en temps réel.
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center gap-2.5 mt-7 pt-5 border-t border-sand-100">
            {step > 1 && !loading && (
              <button
                type="button"
                onClick={goBack}
                className="flex items-center gap-1.5 px-4 py-3 rounded-2xl text-sand-600 text-sm font-bold hover:bg-sand-100 active:scale-[0.97] transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                Retour
              </button>
            )}
            {step < 5 ? (
              <button
                type="button"
                onClick={goNext}
                disabled={!canProceed()}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-extrabold text-[15px] shadow-lg shadow-primary-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-primary-500/30 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100 disabled:shadow-md"
              >
                Continuer
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-secondary-500 to-secondary-600 text-white font-extrabold text-[15px] shadow-lg shadow-secondary-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-secondary-500/30 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Création en cours…
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" strokeWidth={3} />
                    Créer mon compte locuteur
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-sand-500">
          <Link to="/login" className="hover:text-primary-600 transition-colors">
            Déjà inscrit ? <span className="font-bold text-primary-600">Se connecter</span>
          </Link>
          <Link to="/register" className="hover:text-primary-600 transition-colors">
            Vous êtes une entreprise ? <span className="font-bold text-primary-600">Compte client</span>
          </Link>
        </div>
      </div>

      <style>{`
        .peer-input {
          width: 100%;
          padding: 0.875rem 1rem 0.875rem 2.75rem;
          border-radius: 1rem;
          border: 2px solid rgb(231 225 217 / 1);
          background-color: rgb(250 247 242 / 0.6);
          color: rgb(28 25 23 / 1);
          font-size: 0.9375rem;
          font-weight: 500;
          transition: all 200ms ease-out;
        }
        .peer-input::placeholder { color: rgb(180 173 162 / 1); font-weight: 400; }
        .peer-input:focus {
          outline: none;
          border-color: rgb(249 115 22 / 1);
          background-color: white;
          box-shadow: 0 0 0 4px rgb(249 115 22 / 0.08);
        }
      `}</style>
    </div>
  )
}

// ─── Composants auxiliaires ─────────────────────────────────────────────────

interface FormFieldProps {
  label: string
  required?: boolean
  icon: React.ReactNode
  helper?: string
  children: React.ReactNode
}

function FormField({ label, required, icon, helper, children }: FormFieldProps) {
  return (
    <div>
      <label className="block text-sm font-bold text-sand-800 mb-1.5">
        {label}
        {required && <span className="text-primary-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sand-400 pointer-events-none">
          {icon}
        </span>
        {children}
      </div>
      {helper && <p className="text-xs text-sand-400 mt-1.5 pl-1">{helper}</p>}
    </div>
  )
}

interface RecapRowProps {
  label: string
  value: string
}

function RecapRow({ label, value }: RecapRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-sand-100 last:border-b-0">
      <span className="text-xs font-bold text-sand-500 uppercase tracking-wider">{label}</span>
      <span className="text-sm font-semibold text-sand-800 text-right truncate max-w-[60%]">
        {value || '—'}
      </span>
    </div>
  )
}

function FullscreenLoader() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-sand-50">
      <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
    </div>
  )
}
