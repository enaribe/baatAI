import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { ChevronRight, ChevronLeft, Check, Loader2, AlertCircle } from 'lucide-react'
import { useAuth } from '../hooks/use-auth'
import { useSpeakerGuard } from '../hooks/use-speaker-guard'
import { supabase } from '../lib/supabase'
import { LANGUAGES } from '../lib/languages'
import type { Gender } from '../types/database'

type Step = 1 | 2 | 3 | 4

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
  gender: '',
  date_of_birth: '',
  city: '',
  phone: '',
  languages: [],
  dialects: {},
  bio: '',
}

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
      <div className="min-h-screen flex items-center justify-center bg-sand-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  if (guard.hasProfile) {
    return <Navigate to="/speaker/dashboard" replace />
  }

  const toggleLanguage = (code: string) => {
    setForm(f => {
      const has = f.languages.includes(code)
      const languages = has ? f.languages.filter(l => l !== code) : [...f.languages, code]
      const dialects = has ? { ...f.dialects } : { ...f.dialects, [code]: [] }
      if (has) delete dialects[code]
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

  const submit = async () => {
    if (!user) return
    setLoading(true)
    setError('')

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

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }
    navigate('/speaker/dashboard')
  }

  const canNext = () => {
    if (step === 1) return form.gender !== '' && form.city.trim() !== ''
    if (step === 2) return form.languages.length > 0
    return true
  }

  const stepLabels = ['Identité', 'Langues', 'Présentation', 'Finaliser']

  return (
    <div className="min-h-screen bg-sand-50 relative overflow-hidden">
      {/* Warm glow blob */}
      <div
        className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.08) 0%, transparent 70%)' }}
        aria-hidden="true"
      />
      <div
        className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)' }}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-4xl mx-auto px-4 py-8 sm:py-12 sm:px-6 lg:px-8">
        {/* Titre */}
        <div className="text-center mb-10">
          <h1
            className="text-3xl font-extrabold text-sand-900 md:text-4xl"
            style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}
          >
            Créer votre profil locuteur
          </h1>
          <p className="text-sand-500 text-base mt-2">Étape {step} sur 4</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-0 mb-10">
          {stepLabels.map((label, i) => {
            const n = (i + 1) as Step
            const done = n < step
            const active = n === step
            return (
              <div key={label} className="flex-1 flex flex-col items-center gap-1">
                <div className={[
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all',
                  done ? 'bg-secondary-500 text-white' : active ? 'bg-primary-500 text-white' : 'bg-sand-200 text-sand-400',
                ].join(' ')}>
                  {done ? <Check className="w-4 h-4" /> : n}
                </div>
                <span className={`text-[10px] font-semibold ${active ? 'text-primary-600' : 'text-sand-400'}`}>{label}</span>
                {i < stepLabels.length - 1 && (
                  <div className="absolute" />
                )}
              </div>
            )
          })}
        </div>

        {/* Card */}
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl shadow-sand-900/5 border border-sand-200/60 p-8 sm:p-10">
          {error && (
            <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Étape 1 — Identité */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-sand-800" style={{ fontFamily: 'var(--font-heading)' }}>
                Informations personnelles
              </h2>
              <div>
                <label className="block text-sm font-semibold text-sand-700 mb-3">Genre <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {([['male', 'Homme'], ['female', 'Femme'], ['other', 'Autre'], ['prefer_not_to_say', 'Non précisé']] as const).map(([val, lbl]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, gender: val }))}
                      className={[
                        'py-3 rounded-xl border text-sm font-semibold transition-all',
                        form.gender === val
                          ? 'bg-primary-50 border-primary-400 text-primary-700 shadow-sm'
                          : 'border-sand-200 text-sand-600 hover:border-sand-300 hover:bg-sand-50/50',
                      ].join(' ')}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="dob" className="block text-sm font-semibold text-sand-700 mb-1.5">Date de naissance</label>
                  <input
                    id="dob"
                    type="date"
                    value={form.date_of_birth}
                    onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-sand-200 bg-sand-50 text-sand-900 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:bg-white transition-colors"
                  />
                </div>
                <div>
                  <label htmlFor="city" className="block text-sm font-semibold text-sand-700 mb-1.5">Ville <span className="text-red-500">*</span></label>
                  <input
                    id="city"
                    type="text"
                    value={form.city}
                    onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-sand-200 bg-sand-50 text-sand-900 placeholder-sand-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:bg-white transition-colors"
                    placeholder="Dakar, Thiès, Bamako…"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-semibold text-sand-700 mb-1.5">Téléphone (pour les paiements)</label>
                <input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-sand-200 bg-sand-50 text-sand-900 placeholder-sand-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:bg-white transition-colors"
                  placeholder="+221 77 000 00 00"
                />
              </div>
            </div>
          )}

          {/* Étape 2 — Langues */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-sand-800" style={{ fontFamily: 'var(--font-heading)' }}>
                Langues parlées <span className="text-red-500">*</span>
              </h2>
              <p className="text-base text-sand-500">Sélectionnez toutes les langues que vous parlez couramment.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(LANGUAGES).map(([code, lang]) => (
                  <div key={code} className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => toggleLanguage(code)}
                      className={[
                        'w-full flex items-center justify-between px-4 py-3.5 rounded-xl border text-sm font-semibold transition-all',
                        form.languages.includes(code)
                          ? 'bg-primary-50 border-primary-400 text-primary-700 shadow-sm'
                          : 'border-sand-200 text-sand-700 hover:border-sand-300 hover:bg-sand-50/50',
                      ].join(' ')}
                    >
                      <span>{lang.label}</span>
                      {form.languages.includes(code) && <Check className="w-5 h-5 text-primary-600" />}
                    </button>

                    {form.languages.includes(code) && lang.dialects.length > 0 && (
                      <div className="pl-2 flex flex-wrap gap-2">
                        {lang.dialects.map(d => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => toggleDialect(code, d)}
                            className={[
                              'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
                              (form.dialects[code] ?? []).includes(d)
                                ? 'bg-accent-100 border-accent-400 text-accent-700 shadow-sm'
                                : 'border-sand-200 text-sand-500 hover:border-sand-300 hover:bg-sand-50/50',
                            ].join(' ')}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Étape 3 — Présentation */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-sand-800" style={{ fontFamily: 'var(--font-heading)' }}>
                Présentez-vous (optionnel)
              </h2>
              <p className="text-base text-sand-500">
                Un texte court visible par les clients qui recherchent des locuteurs.
              </p>
              <textarea
                value={form.bio}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                rows={6}
                maxLength={400}
                className="w-full px-4 py-4 rounded-xl border border-sand-200 bg-sand-50 text-sand-900 placeholder-sand-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:bg-white resize-none transition-colors"
                placeholder="Ex : Locuteur Wolof natif de Dakar, je parle également le Pulaar. Voix claire et articulée…"
              />
              <p className="text-xs text-sand-400 text-right">{form.bio.length}/400</p>
            </div>
          )}

          {/* Étape 4 — Récap */}
          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-sand-800" style={{ fontFamily: 'var(--font-heading)' }}>
                Résumé de votre profil
              </h2>
              <div className="space-y-4 text-base text-sand-700 bg-sand-50/50 p-6 rounded-2xl border border-sand-100">
                <div className="flex justify-between pb-3 border-b border-sand-200/60">
                  <span className="text-sand-500 font-medium">Genre</span>
                  <span className="font-semibold text-sand-900">{form.gender || '—'}</span>
                </div>
                <div className="flex justify-between pb-3 border-b border-sand-200/60">
                  <span className="text-sand-500 font-medium">Ville</span>
                  <span className="font-semibold text-sand-900">{form.city || '—'}</span>
                </div>
                <div className="flex justify-between pb-3 border-b border-sand-200/60">
                  <span className="text-sand-500 font-medium">Langues</span>
                  <span className="font-semibold text-sand-900 text-right">{form.languages.map(c => LANGUAGES[c]?.label ?? c).join(', ') || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sand-500 font-medium">Téléphone</span>
                  <span className="font-semibold text-sand-900">{form.phone || '—'}</span>
                </div>
              </div>

              <div className="bg-secondary-50 border border-secondary-200 rounded-2xl p-5 text-sm text-secondary-800 flex items-start gap-4">
                <div className="p-2 bg-secondary-100 rounded-full shrink-0">
                  <Check className="w-5 h-5 text-secondary-600" />
                </div>
                <div>
                  <p className="font-bold text-base mb-1">Vous y êtes presque !</p>
                  <p className="text-secondary-700 leading-relaxed">
                    Votre profil sera créé et vous pourrez commencer à enregistrer des projets dès maintenant.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-4 mt-10">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(s => (s - 1) as Step)}
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl border border-sand-200 text-sand-700 text-base font-semibold hover:bg-sand-50 transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
                Précédent
              </button>
            )}
            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep(s => (s + 1) as Step)}
                disabled={!canNext()}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold text-base shadow-lg shadow-primary-500/25 transition-all hover:scale-[1.02] hover:shadow-primary-500/40 disabled:opacity-40 disabled:hover:scale-100 disabled:hover:shadow-primary-500/25"
              >
                Suivant
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold text-base shadow-lg shadow-primary-500/25 transition-all hover:scale-[1.02] hover:shadow-primary-500/40 disabled:opacity-40 disabled:hover:scale-100 disabled:hover:shadow-primary-500/25"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                Soumettre mon profil
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
