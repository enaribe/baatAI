import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/use-auth'
import { useSpeakerProfile } from '../hooks/use-speaker-profile'
import { LANGUAGES } from '../lib/languages'
import {
  Loader2, Save, Check, AlertCircle, Star, Shield, User, AlertTriangle,
} from 'lucide-react'
import type { Gender } from '../types/database'
import { DeleteAccountModal } from '../components/delete-account-modal'
import { VoiceSampleSection } from '../components/voice-sample-section'

const sans = { fontFamily: 'var(--font-body)', fontFeatureSettings: "'cv01','ss03'" }
const mono = { fontFamily: 'var(--font-mono)' }

export function SpeakerProfilePage() {
  const { user } = useAuth()
  const { profile, loading, update, refetch } = useSpeakerProfile(user?.id)

  const [bio, setBio] = useState('')
  const [city, setCity] = useState('')
  const [phone, setPhone] = useState('')
  const [gender, setGender] = useState<Gender | ''>('')
  const [languages, setLanguages] = useState<string[]>([])
  const [dialects, setDialects] = useState<Record<string, string[]>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)

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
    setLanguages((prev) => {
      const has = prev.includes(code)
      if (has) {
        setDialects((d) => { const nd = { ...d }; delete nd[code]; return nd })
        return prev.filter((l) => l !== code)
      }
      return [...prev, code]
    })
  }

  const toggleDialect = (lang: string, dialect: string) => {
    setDialects((prev) => {
      const current = prev[lang] ?? []
      return {
        ...prev,
        [lang]: current.includes(dialect) ? current.filter((d) => d !== dialect) : [...current, dialect],
      }
    })
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    const { error: err } = await update({
      bio, city, phone, gender: gender || null, languages, dialects,
    })
    setSaving(false)
    if (err) { setError(err); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 animate-spin text-[#8a8f98]" />
      </div>
    )
  }

  const fullName = (user?.user_metadata?.full_name as string | undefined) ?? 'Locuteur'
  const initials = fullName.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase() || '?'

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-10 flex items-center gap-3 px-5 lg:px-8 h-[52px] border-b border-[rgba(255,255,255,0.05)] bg-[rgba(8,9,10,0.9)] backdrop-blur-md">
        <User className="w-[13px] h-[13px] text-[#8a8f98]" strokeWidth={1.75} />
        <span className="text-[13px] text-[#f7f8f8]" style={{ ...sans, fontWeight: 510 }}>
          Mon profil
        </span>
        {profile?.is_certified && (
          <span
            className="inline-flex items-center gap-1 px-2 h-[22px] rounded-full text-[11px]"
            style={{
              ...sans,
              fontWeight: 510,
              color: '#10b981',
              background: 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.22)',
            }}
          >
            <Shield className="w-3 h-3" strokeWidth={2} />
            Certifié
          </span>
        )}
      </header>

      <div className="max-w-[920px] mx-auto px-5 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
          {/* Main */}
          <div className="flex flex-col gap-8 min-w-0">
            {error && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-md text-[12px] text-[#fca5a5] border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.06)]" style={sans}>
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Identité */}
            <Section title="Identité">
              <FieldBlock label="Genre">
                <div className="flex gap-1.5 flex-wrap">
                  {(
                    [
                      ['male', 'Homme'],
                      ['female', 'Femme'],
                      ['other', 'Autre'],
                      ['prefer_not_to_say', 'Non précisé'],
                    ] as [Gender, string][]
                  ).map(([val, lbl]) => {
                    const on = gender === val
                    return (
                      <button
                        key={val}
                        onClick={() => setGender(val)}
                        className="h-[30px] px-3 text-[12px] rounded-md transition-colors"
                        style={{
                          ...sans,
                          fontWeight: 510,
                          color: on ? '#f7f8f8' : '#d0d6e0',
                          background: on ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                          border: `1px solid ${on ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)'}`,
                        }}
                      >
                        {lbl}
                      </button>
                    )
                  })}
                </div>
              </FieldBlock>

              <FieldBlock label="Ville">
                <TextInput value={city} onChange={setCity} placeholder="Dakar" />
              </FieldBlock>

              <FieldBlock label="Téléphone">
                <TextInput value={phone} onChange={setPhone} placeholder="+221 77 000 00 00" />
              </FieldBlock>
            </Section>

            {/* Langues */}
            <Section title="Langues parlées">
              <div className="flex flex-col gap-2">
                {Object.entries(LANGUAGES).map(([code, lang]) => {
                  const on = languages.includes(code)
                  const dialectsForLang = dialects[code] ?? []
                  return (
                    <div
                      key={code}
                      className="rounded-md p-3"
                      style={{
                        background: on ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${on ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)'}`,
                      }}
                    >
                      <button
                        onClick={() => toggleLanguage(code)}
                        className="w-full flex items-center gap-2.5"
                      >
                        <span
                          className="w-4 h-4 rounded-sm flex items-center justify-center shrink-0"
                          style={{
                            border: `1.5px solid ${on ? '#f7f8f8' : 'rgba(255,255,255,0.2)'}`,
                            background: on ? '#f7f8f8' : 'transparent',
                          }}
                        >
                          {on && <Check className="w-2.5 h-2.5" strokeWidth={3} style={{ color: '#08090a' }} />}
                        </span>
                        <span
                          className="text-[13px] text-[#f7f8f8]"
                          style={{ ...sans, fontWeight: 510 }}
                        >
                          {lang.label}
                        </span>
                        <span className="ml-auto text-[10px] text-[#62666d]" style={mono}>
                          {on ? `${dialectsForLang.length}/${lang.dialects.length}` : ''}
                        </span>
                      </button>
                      {on && lang.dialects.length > 0 && (
                        <div className="flex gap-1.5 flex-wrap mt-2.5 pl-6">
                          {lang.dialects.map((d) => {
                            const activeD = dialectsForLang.includes(d)
                            return (
                              <button
                                key={d}
                                onClick={() => toggleDialect(code, d)}
                                className="px-2.5 h-[22px] text-[11px] rounded-full transition-colors"
                                style={{
                                  ...sans,
                                  fontWeight: 510,
                                  color: activeD ? '#f7f8f8' : '#d0d6e0',
                                  background: activeD ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
                                  border: `1px solid ${activeD ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)'}`,
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
            </Section>

            {/* Bio */}
            <Section title="Présentation">
              <div
                className="rounded-md px-3 py-2.5"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, 400))}
                  placeholder="Ex : Journaliste radio à Dakar, locuteur natif wolof, 12 ans d'expérience en voix-off."
                  className="w-full bg-transparent border-0 outline-none text-[#f7f8f8] text-[14px] resize-y"
                  style={{
                    ...sans,
                    lineHeight: 1.5,
                    minHeight: 100,
                  }}
                />
              </div>
              <p className="text-[11px] text-[#62666d] text-right mt-1.5 tabular-nums" style={mono}>
                {bio.length}/400
              </p>
            </Section>

            {/* Échantillon de voix */}
            {user?.id && (
              <VoiceSampleSection
                speakerId={user.id}
                samplePath={profile?.sample_storage_path ?? null}
                sampleDuration={profile?.sample_duration_seconds ?? null}
                sampleRecordedAt={profile?.sample_recorded_at ?? null}
                onUpdated={() => { void refetch() }}
              />
            )}

            {/* Save sticky */}
            <div
              className="sticky bottom-4 flex items-center justify-between gap-3 px-4 py-3 rounded-md backdrop-blur-md"
              style={{
                background: 'rgba(15,16,17,0.9)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <p className="text-[12px] text-[#8a8f98]" style={sans}>
                {saved ? 'Enregistré' : 'Modifications non enregistrées'}
              </p>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 h-[32px] px-3 text-[13px] rounded-md transition-colors disabled:opacity-40"
                style={{
                  ...sans,
                  fontWeight: 510,
                  color: '#f7f8f8',
                  background: saved ? 'rgba(16,185,129,0.22)' : '#5e6ad2',
                }}
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : saved ? (
                  <Check className="w-3.5 h-3.5" strokeWidth={2} />
                ) : (
                  <Save className="w-3.5 h-3.5" strokeWidth={1.75} />
                )}
                {saving ? 'Enregistrement…' : saved ? 'Enregistré' : 'Enregistrer'}
              </button>
            </div>
          </div>

          {/* Side panel */}
          <aside className="flex flex-col gap-6">
            {/* Profile card */}
            <div
              className="rounded-[10px] p-4"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-[#f7f8f8]"
                  style={{
                    background: '#3e3e44',
                    ...sans,
                    fontSize: 14,
                    fontWeight: 590,
                  }}
                >
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className="text-[13px] text-[#f7f8f8] truncate"
                    style={{ ...sans, fontWeight: 510 }}
                  >
                    {fullName}
                  </p>
                  <p className="text-[11px] text-[#62666d] truncate" style={mono}>
                    {user?.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div
              className="rounded-[10px]"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <StatRow label="Enregistrements" value={String(profile?.total_recordings ?? 0)} />
              <StatDivider />
              <StatRow label="Validés" value={String(profile?.total_validated ?? 0)} />
              <StatDivider />
              <StatRow
                label="Fiabilité"
                value={`${Math.round((profile?.reliability_score ?? 1) * 100)}%`}
                icon={<Star className="w-3 h-3 text-[#fbbf24]" strokeWidth={2} />}
              />
            </div>

            {/* Danger */}
            <div
              className="rounded-[10px] p-4"
              style={{
                background: 'rgba(239,68,68,0.04)',
                border: '1px solid rgba(239,68,68,0.18)',
              }}
            >
              <div className="flex items-start gap-2 mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-[#fca5a5] shrink-0 mt-0.5" strokeWidth={1.75} />
                <div>
                  <p className="text-[12px] text-[#f7f8f8]" style={{ ...sans, fontWeight: 510 }}>
                    Supprimer le compte
                  </p>
                  <p className="text-[11px] text-[#8a8f98] mt-1 leading-relaxed" style={sans}>
                    Cette action est irréversible.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDeleteOpen(true)}
                className="w-full inline-flex items-center justify-center h-[28px] text-[12px] rounded-md transition-colors"
                style={{
                  ...sans,
                  fontWeight: 510,
                  color: '#fca5a5',
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.22)',
                }}
              >
                Supprimer
              </button>
            </div>
          </aside>
        </div>
      </div>

      <DeleteAccountModal open={deleteOpen} onClose={() => setDeleteOpen(false)} />
    </div>
  )
}

/* ---------- Helpers ---------- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <div
        className="text-[11px] text-[#62666d] uppercase mb-3"
        style={{ ...sans, fontWeight: 510, letterSpacing: '0.04em' }}
      >
        {title}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  )
}

function FieldBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        className="block text-[12px] text-[#d0d6e0] mb-1.5"
        style={{ ...sans, fontWeight: 510 }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-[34px] px-3 text-[14px] text-[#f7f8f8] placeholder:text-[#62666d] rounded-md bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] focus:outline-none focus:border-[rgba(255,255,255,0.22)] transition-colors"
      style={sans}
    />
  )
}

function StatRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-[12px] text-[#8a8f98]" style={sans}>{label}</span>
      </div>
      <span className="text-[14px] text-[#f7f8f8] tabular-nums" style={{ ...sans, fontWeight: 590 }}>
        {value}
      </span>
    </div>
  )
}

function StatDivider() {
  return <div className="h-px mx-4" style={{ background: 'rgba(255,255,255,0.05)' }} />
}
