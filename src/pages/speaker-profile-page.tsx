import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/use-auth'
import { useSpeakerProfile } from '../hooks/use-speaker-profile'
import { LANGUAGES } from '../lib/languages'
import { Loader2, Save, Check, AlertCircle, Star, Shield } from 'lucide-react'
import type { Gender } from '../types/database'

export function SpeakerProfilePage() {
  const { user } = useAuth()
  const { profile, loading, update } = useSpeakerProfile(user?.id)

  const [bio, setBio] = useState('')
  const [city, setCity] = useState('')
  const [phone, setPhone] = useState('')
  const [gender, setGender] = useState<Gender | ''>('')
  const [languages, setLanguages] = useState<string[]>([])
  const [dialects, setDialects] = useState<Record<string, string[]>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!profile) return
    setBio(profile.bio ?? '')
    setCity(profile.city ?? '')
    setPhone(profile.phone ?? '')
    setGender(profile.gender ?? '')
    setLanguages(profile.languages)
    setDialects(profile.dialects)
  }, [profile])

  const toggleLanguage = (code: string) => {
    setLanguages(prev => {
      const has = prev.includes(code)
      if (has) {
        setDialects(d => { const nd = { ...d }; delete nd[code]; return nd })
        return prev.filter(l => l !== code)
      }
      return [...prev, code]
    })
  }

  const toggleDialect = (lang: string, dialect: string) => {
    setDialects(prev => {
      const current = prev[lang] ?? []
      return {
        ...prev,
        [lang]: current.includes(dialect)
          ? current.filter(d => d !== dialect)
          : [...current, dialect],
      }
    })
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    const { error: err } = await update({ bio, city, phone, gender: gender || null, languages, dialects })
    setSaving(false)
    if (err) { setError(err); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1
          className="text-2xl font-extrabold text-sand-900 dark:text-sand-100"
          style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}
        >
          Mon profil
        </h1>
        {profile?.is_certified && (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-accent-100 text-accent-700 rounded-full text-xs font-bold">
            <Shield className="w-3.5 h-3.5" />
            Certifié
          </span>
        )}
      </div>

      {/* Stats publiques */}
      {profile && (
        <div className="grid grid-cols-3 gap-3 mb-7">
          <div className="bg-white dark:bg-sand-900 rounded-xl border border-sand-200/70 dark:border-sand-800/70 p-3 text-center">
            <p className="text-lg font-extrabold text-sand-900 dark:text-sand-100 tabular-nums" style={{ fontFamily: 'var(--font-heading)' }}>
              {profile.total_recordings}
            </p>
            <p className="text-[10px] text-sand-400 font-semibold mt-0.5">Enregistrements</p>
          </div>
          <div className="bg-white dark:bg-sand-900 rounded-xl border border-sand-200/70 dark:border-sand-800/70 p-3 text-center">
            <p className="text-lg font-extrabold text-sand-900 dark:text-sand-100 tabular-nums" style={{ fontFamily: 'var(--font-heading)' }}>
              {profile.total_validated}
            </p>
            <p className="text-[10px] text-sand-400 font-semibold mt-0.5">Validés</p>
          </div>
          <div className="bg-white dark:bg-sand-900 rounded-xl border border-sand-200/70 dark:border-sand-800/70 p-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <p className="text-lg font-extrabold text-sand-900 dark:text-sand-100 tabular-nums" style={{ fontFamily: 'var(--font-heading)' }}>
                {Math.round((profile.reliability_score ?? 1) * 100)}%
              </p>
            </div>
            <p className="text-[10px] text-sand-400 font-semibold mt-0.5">Fiabilité</p>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-sand-900 rounded-2xl border border-sand-200/70 dark:border-sand-800/70 p-6 space-y-5">
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-xl text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Genre */}
        <div>
          <label className="block text-sm font-semibold text-sand-700 dark:text-sand-300 mb-2">Genre</label>
          <div className="grid grid-cols-2 gap-2">
            {([['male', 'Homme'], ['female', 'Femme'], ['other', 'Autre'], ['prefer_not_to_say', 'Non précisé']] as const).map(([val, lbl]) => (
              <button key={val} type="button" onClick={() => setGender(val)}
                className={['py-2 rounded-xl border text-sm font-semibold transition-all', gender === val ? 'bg-primary-50 border-primary-400 text-primary-700' : 'border-sand-200 text-sand-600 hover:border-sand-300 dark:border-sand-700 dark:text-sand-400'].join(' ')}>
                {lbl}
              </button>
            ))}
          </div>
        </div>

        {/* Ville */}
        <div>
          <label className="block text-sm font-semibold text-sand-700 dark:text-sand-300 mb-1.5">Ville</label>
          <input type="text" value={city} onChange={e => setCity(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-sand-200 dark:border-sand-700 bg-sand-50 dark:bg-sand-800 text-sand-900 dark:text-sand-100 focus:outline-none focus:ring-2 focus:ring-primary-400"
            placeholder="Dakar" />
        </div>

        {/* Téléphone */}
        <div>
          <label className="block text-sm font-semibold text-sand-700 dark:text-sand-300 mb-1.5">Téléphone</label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-sand-200 dark:border-sand-700 bg-sand-50 dark:bg-sand-800 text-sand-900 dark:text-sand-100 focus:outline-none focus:ring-2 focus:ring-primary-400"
            placeholder="+221 77 000 00 00" />
        </div>

        {/* Langues */}
        <div>
          <label className="block text-sm font-semibold text-sand-700 dark:text-sand-300 mb-2">Langues parlées</label>
          <div className="space-y-2">
            {Object.entries(LANGUAGES).map(([code, lang]) => (
              <div key={code}>
                <button type="button" onClick={() => toggleLanguage(code)}
                  className={['w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all', languages.includes(code) ? 'bg-primary-50 border-primary-400 text-primary-700' : 'border-sand-200 text-sand-700 hover:border-sand-300 dark:border-sand-700 dark:text-sand-300'].join(' ')}>
                  {lang.label}
                  {languages.includes(code) && <Check className="w-4 h-4" />}
                </button>
                {languages.includes(code) && lang.dialects.length > 0 && (
                  <div className="mt-1.5 ml-4 flex flex-wrap gap-1.5">
                    {lang.dialects.map(d => (
                      <button key={d} type="button" onClick={() => toggleDialect(code, d)}
                        className={['px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-all', (dialects[code] ?? []).includes(d) ? 'bg-accent-100 border-accent-400 text-accent-700' : 'border-sand-200 text-sand-500 hover:border-sand-300 dark:border-sand-700 dark:text-sand-400'].join(' ')}>
                        {d}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-semibold text-sand-700 dark:text-sand-300 mb-1.5">Présentation</label>
          <textarea value={bio} onChange={e => setBio(e.target.value)} rows={4} maxLength={400}
            className="w-full px-4 py-3 rounded-xl border border-sand-200 dark:border-sand-700 bg-sand-50 dark:bg-sand-800 text-sand-900 dark:text-sand-100 focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
            placeholder="Locuteur natif Wolof de Dakar…" />
          <p className="text-xs text-sand-400 text-right mt-1">{bio.length}/400</p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold shadow-md shadow-primary-500/20 hover:scale-[1.02] transition-all disabled:opacity-40"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Sauvegardé !' : 'Enregistrer les modifications'}
        </button>
      </div>
    </div>
  )
}
