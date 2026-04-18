import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, ChevronLeft, Check, Loader2, AlertCircle } from 'lucide-react'
import { useAuth } from '../hooks/use-auth'
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
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>(1)
  const [form, setForm] = useState<FormData>(INITIAL)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
        verification_status: 'pending',
      } as unknown as never) as unknown as Promise<{ error: { message: string } | null }>)

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }
    navigate('/speaker/pending')
  }

  const canNext = () => {
    if (step === 1) return form.gender !== '' && form.city.trim() !== ''
    if (step === 2) return form.languages.length > 0
    return true
  }

  const stepLabels = ['Identité', 'Langues', 'Présentation', 'Finaliser']

  return (
    <div className="min-h-screen bg-sand-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        {/* Titre */}
        <div className="text-center mb-8">
          <h1
            className="text-2xl font-extrabold text-sand-900"
            style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}
          >
            Créer votre profil locuteur
          </h1>
          <p className="text-sand-500 text-sm mt-1">Étape {step} sur 4</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-0 mb-8">
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
        <div className="bg-white rounded-2xl shadow-xl shadow-sand-900/8 border border-sand-200/60 p-7">
          {error && (
            <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Étape 1 — Identité */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-base font-bold text-sand-800" style={{ fontFamily: 'var(--font-heading)' }}>
                Informations personnelles
              </h2>
              <div>
                <label className="block text-sm font-semibold text-sand-700 mb-2">Genre <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 gap-2">
                  {([['male', 'Homme'], ['female', 'Femme'], ['other', 'Autre'], ['prefer_not_to_say', 'Non précisé']] as const).map(([val, lbl]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, gender: val }))}
                      className={[
                        'py-2.5 rounded-xl border text-sm font-semibold transition-all',
                        form.gender === val
                          ? 'bg-primary-50 border-primary-400 text-primary-700'
                          : 'border-sand-200 text-sand-600 hover:border-sand-300',
                      ].join(' ')}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="dob" className="block text-sm font-semibold text-sand-700 mb-1.5">Date de naissance</label>
                <input
                  id="dob"
                  type="date"
                  value={form.date_of_birth}
                  onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-sand-200 bg-sand-50 text-sand-900 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:bg-white"
                />
              </div>
              <div>
                <label htmlFor="city" className="block text-sm font-semibold text-sand-700 mb-1.5">Ville <span className="text-red-500">*</span></label>
                <input
                  id="city"
                  type="text"
                  value={form.city}
                  onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-sand-200 bg-sand-50 text-sand-900 placeholder-sand-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:bg-white"
                  placeholder="Dakar, Thiès, Bamako…"
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-semibold text-sand-700 mb-1.5">Téléphone (pour les paiements)</label>
                <input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-sand-200 bg-sand-50 text-sand-900 placeholder-sand-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:bg-white"
                  placeholder="+221 77 000 00 00"
                />
              </div>
            </div>
          )}

          {/* Étape 2 — Langues */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-base font-bold text-sand-800" style={{ fontFamily: 'var(--font-heading)' }}>
                Langues parlées <span className="text-red-500">*</span>
              </h2>
              <p className="text-sm text-sand-500">Sélectionnez toutes les langues que vous parlez couramment.</p>

              {Object.entries(LANGUAGES).map(([code, lang]) => (
                <div key={code}>
                  <button
                    type="button"
                    onClick={() => toggleLanguage(code)}
                    className={[
                      'w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-semibold transition-all',
                      form.languages.includes(code)
                        ? 'bg-primary-50 border-primary-400 text-primary-700'
                        : 'border-sand-200 text-sand-700 hover:border-sand-300',
                    ].join(' ')}
                  >
                    <span>{lang.label}</span>
                    {form.languages.includes(code) && <Check className="w-4 h-4 text-primary-600" />}
                  </button>

                  {form.languages.includes(code) && lang.dialects.length > 0 && (
                    <div className="mt-2 ml-4 flex flex-wrap gap-2">
                      {lang.dialects.map(d => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => toggleDialect(code, d)}
                          className={[
                            'px-3 py-1 rounded-full text-xs font-semibold border transition-all',
                            (form.dialects[code] ?? []).includes(d)
                              ? 'bg-accent-100 border-accent-400 text-accent-700'
                              : 'border-sand-200 text-sand-500 hover:border-sand-300',
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
          )}

          {/* Étape 3 — Présentation */}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-base font-bold text-sand-800" style={{ fontFamily: 'var(--font-heading)' }}>
                Présentez-vous (optionnel)
              </h2>
              <p className="text-sm text-sand-500">
                Un texte court visible par les clients qui recherchent des locuteurs.
              </p>
              <textarea
                value={form.bio}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                rows={5}
                maxLength={400}
                className="w-full px-4 py-3 rounded-xl border border-sand-200 bg-sand-50 text-sand-900 placeholder-sand-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:bg-white resize-none"
                placeholder="Ex : Locuteur Wolof natif de Dakar, je parle également le Pulaar. Voix claire et articulée…"
              />
              <p className="text-xs text-sand-400 text-right">{form.bio.length}/400</p>
            </div>
          )}

          {/* Étape 4 — Récap */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-sand-800" style={{ fontFamily: 'var(--font-heading)' }}>
                Résumé de votre profil
              </h2>
              <div className="space-y-3 text-sm text-sand-700">
                <div className="flex justify-between py-2 border-b border-sand-100">
                  <span className="text-sand-500">Genre</span>
                  <span className="font-semibold">{form.gender || '—'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-sand-100">
                  <span className="text-sand-500">Ville</span>
                  <span className="font-semibold">{form.city || '—'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-sand-100">
                  <span className="text-sand-500">Langues</span>
                  <span className="font-semibold">{form.languages.map(c => LANGUAGES[c]?.label ?? c).join(', ') || '—'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-sand-100">
                  <span className="text-sand-500">Téléphone</span>
                  <span className="font-semibold">{form.phone || '—'}</span>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                <p className="font-bold mb-1">Validation requise</p>
                <p className="text-amber-700 text-xs leading-relaxed">
                  Votre profil sera examiné par notre équipe dans les 48 heures. Vous recevrez un email à la validation.
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-7">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(s => (s - 1) as Step)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-sand-200 text-sand-700 text-sm font-semibold hover:bg-sand-50 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                Précédent
              </button>
            )}
            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep(s => (s + 1) as Step)}
                disabled={!canNext()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold shadow-md shadow-primary-500/20 transition-all hover:scale-[1.02] disabled:opacity-40 disabled:hover:scale-100"
              >
                Suivant
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold shadow-md shadow-primary-500/20 transition-all hover:scale-[1.02] disabled:opacity-40 disabled:hover:scale-100"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Soumettre mon profil
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
