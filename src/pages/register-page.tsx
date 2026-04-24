import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/use-auth'
import {
  Loader2, AlertCircle, User, Mail, Lock, Building2,
  Database, Mic, ArrowRight,
} from 'lucide-react'
import { PublicLayout } from '../components/layout/public-layout'
import { Field } from '../components/ui/field'
import { Button } from '../components/ui/button'
import { ThemeToggle } from '../components/ui/theme-toggle'
import { parseAuthError, precheckWhitelist } from '../lib/auth-errors'

type Role = 'client' | 'speaker' | null

export function RegisterPage() {
  const { signUp, user, loading: authLoading, role } = useAuth()
  const navigate = useNavigate()

  const [selectedRole, setSelectedRole] = useState<Role>(null)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [organization, setOrganization] = useState('')
  const [error, setError] = useState('')
  const [accessDenied, setAccessDenied] = useState(false)
  const [loading, setLoading] = useState(false)

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#08090a]">
        <Loader2 className="w-6 h-6 animate-spin text-[#d0d6e0]" />
      </div>
    )
  }

  if (user && role) {
    if (role === 'speaker') return <Navigate to="/speaker/dashboard" replace />
    if (role === 'admin') return <Navigate to="/admin" replace />
    return <Navigate to="/dashboard" replace />
  }

  const canSubmit =
    fullName.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    password.length >= 6

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setAccessDenied(false)
    if (!canSubmit) return
    setLoading(true)

    // Pré-check whitelist : court-circuite l'erreur DB cryptique côté Supabase Auth
    const allowed = await precheckWhitelist(email.trim())
    if (allowed === false) {
      setError("Cet email n'est pas encore autorisé. Daandé est en beta privée — demandez un accès.")
      setAccessDenied(true)
      setLoading(false)
      return
    }

    const { error: signUpError } = await signUp(
      email.trim(), password, fullName.trim(), 'client', organization || undefined,
    )
    if (signUpError) {
      const parsed = parseAuthError(signUpError)
      setError(parsed.message)
      setAccessDenied(parsed.isAccessDenied)
      setLoading(false)
    }
  }

  return (
    <PublicLayout
      brandTitle={<>Les voix de<br />l'Afrique, prêtes<br />pour l'IA.</>}
      brandSubtitle="Rejoignez Daandé pour construire ou alimenter des datasets vocaux en 34 langues africaines."
    >
      {/* En-tête top bar */}
      <div className="flex items-center gap-3 h-[32px]">
        <span
          className="inline-flex items-center h-[22px] px-2 rounded-[5px] text-[11px]"
          style={{
            fontFamily: 'var(--font-mono)',
            color: 'var(--t-fg-3)',
            background: 'var(--t-surface)',
            border: '1px solid var(--t-border-subtle)',
          }}
        >
          /register
        </span>
        <div className="flex-1" />
        <span
          className="hidden sm:inline text-[12px]"
          style={{
            fontFamily: 'var(--font-body)',
            fontFeatureSettings: "'cv01','ss03'",
            color: 'var(--t-fg-3)',
          }}
        >
          Déjà un compte ?
        </span>
        <Link
          to="/login"
          className="inline-flex items-center h-[28px] px-2.5 text-[12px] rounded-md transition-colors"
          style={{
            fontFamily: 'var(--font-body)',
            fontFeatureSettings: "'cv01','ss03'",
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

      {/* Contenu */}
      <div className="flex-1 flex flex-col justify-center max-w-[580px] w-full mx-auto mt-8">
        <h1
          className="text-[28px] sm:text-[32px] m-0"
          style={{
            fontFamily: 'var(--font-body)',
            fontFeatureSettings: "'cv01','ss03'",
            fontWeight: 510,
            lineHeight: 1.1,
            letterSpacing: '-0.7px',
            color: 'var(--t-fg)',
          }}
        >
          Rejoindre Daandé
        </h1>
        <p
          className="text-[15px] mt-2.5"
          style={{
            fontFamily: 'var(--font-body)',
            fontFeatureSettings: "'cv01','ss03'",
            lineHeight: 1.55,
            color: 'var(--t-fg-3)',
          }}
        >
          Choisissez votre profil pour commencer.
        </p>

        {/* Cartes profil */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
          <ProfileCard
            icon={<Database className="w-[18px] h-[18px]" strokeWidth={1.75} />}
            title="Je crée des datasets"
            subtitle="Entreprise, chercheur, labo — je collecte des voix pour mes projets IA."
            chips={['Projets vocaux', 'Recrutement locuteurs', 'Export dataset', 'Contrôle qualité']}
            selected={selectedRole === 'client'}
            onClick={() => setSelectedRole('client')}
          />
          <ProfileCard
            icon={<Mic className="w-[18px] h-[18px]" strokeWidth={1.75} />}
            title="J'enregistre ma voix"
            subtitle="Locuteur — je participe à des projets et je gagne de l'argent."
            chips={['Projets rémunérés', 'Wave / Orange Money', 'Depuis son téléphone', 'Wolof, Pulaar…']}
            selected={selectedRole === 'speaker'}
            onClick={() => setSelectedRole('speaker')}
          />
        </div>

        {/* Formulaire client inline */}
        {selectedRole === 'client' && (
          <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-3.5 animate-fade-in">
            <div
              className="text-[13px]"
              style={{
                fontFamily: 'var(--font-body)',
                fontFeatureSettings: "'cv01','ss03'",
                fontWeight: 590,
                color: 'var(--t-fg)',
              }}
            >
              Créer votre compte client
            </div>

            {error && (
              <div
                className="flex flex-col gap-2 px-3 py-2.5 rounded-md text-[12px]"
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
              label="Mot de passe"
              type="password"
              icon={<Lock className="w-3.5 h-3.5" strokeWidth={1.75} />}
              placeholder="6 caractères minimum"
              required
              value={password}
              onChange={setPassword}
              hint={
                password.length > 0 && password.length < 6
                  ? `${password.length}/6`
                  : '6 caractères minimum.'
              }
            />
            <Field
              label="Organisation"
              icon={<Building2 className="w-3.5 h-3.5" strokeWidth={1.75} />}
              placeholder="Optionnel"
              value={organization}
              onChange={setOrganization}
            />

            <div className="mt-2.5">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                disabled={!canSubmit}
                iconRight={!loading ? <ArrowRight className="w-4 h-4" strokeWidth={1.75} /> : undefined}
                className="w-full justify-center"
              >
                Créer mon compte client
              </Button>
            </div>
            <div
              className="text-[11px] text-center"
              style={{ fontFamily: 'var(--font-body)', fontFeatureSettings: "'cv01','ss03'", color: 'var(--t-fg-4)' }}
            >
              Vous arriverez sur votre espace client.
            </div>
          </form>
        )}

        {/* Redirect speaker */}
        {selectedRole === 'speaker' && (
          <div
            className="mt-7 flex items-center gap-4 p-5 rounded-[10px]"
            style={{
              background: 'var(--t-surface)',
              border: '1px solid var(--t-border)',
            }}
          >
            <div
              className="w-9 h-9 flex items-center justify-center rounded-md shrink-0"
              style={{
                background: 'var(--t-surface-active)',
                border: '1px solid var(--t-border)',
                color: 'var(--t-fg)',
              }}
            >
              <Mic className="w-4 h-4" strokeWidth={1.75} />
            </div>
            <div className="flex-1 min-w-0">
              <div
                className="text-[14px]"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontFeatureSettings: "'cv01','ss03'",
                  fontWeight: 590,
                  color: 'var(--t-fg)',
                }}
              >
                Inscription locuteur en 5 étapes
              </div>
              <div
                className="text-[12px] mt-0.5"
                style={{ fontFamily: 'var(--font-body)', fontFeatureSettings: "'cv01','ss03'", color: 'var(--t-fg-3)' }}
              >
                Compte, identité, langues, présentation, récap.
              </div>
            </div>
            <Button
              variant="primary"
              size="md"
              iconRight={<ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />}
              onClick={() => navigate('/speaker/register')}
            >
              Continuer
            </Button>
          </div>
        )}

        {!selectedRole && (
          <div
            className="mt-6 text-[12px] text-center"
            style={{ fontFamily: 'var(--font-body)', fontFeatureSettings: "'cv01','ss03'", color: 'var(--t-fg-4)' }}
          >
            Sélectionnez un profil pour continuer.
          </div>
        )}
      </div>
    </PublicLayout>
  )
}

/* ---------- ProfileCard ---------- */
interface ProfileCardProps {
  icon: ReactNode
  title: string
  subtitle: string
  chips: string[]
  selected: boolean
  onClick: () => void
}

function ProfileCard({ icon, title, subtitle, chips, selected, onClick }: ProfileCardProps) {
  const [hover, setHover] = useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="relative flex flex-col gap-3 p-5 rounded-[12px] text-left cursor-pointer min-h-[200px]"
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
          className="text-[17px]"
          style={{
            fontFamily: 'var(--font-body)',
            fontFeatureSettings: "'cv01','ss03'",
            fontWeight: 590,
            letterSpacing: '-0.2px',
            color: 'var(--t-fg)',
          }}
        >
          {title}
        </div>
        <div
          className="text-[13px] mt-1.5"
          style={{
            fontFamily: 'var(--font-body)',
            fontFeatureSettings: "'cv01','ss03'",
            lineHeight: 1.5,
            color: 'var(--t-fg-3)',
          }}
        >
          {subtitle}
        </div>
      </div>
      <div className="flex gap-1.5 flex-wrap mt-auto">
        {chips.map((c) => (
          <span
            key={c}
            className="text-[11px] px-2.5 py-[3px] rounded-full"
            style={{
              fontFamily: 'var(--font-body)',
              fontFeatureSettings: "'cv01','ss03'",
              fontWeight: 510,
              color: 'var(--t-fg-2)',
              background: 'var(--t-surface-2)',
              border: '1px solid var(--t-border-subtle)',
            }}
          >
            {c}
          </span>
        ))}
      </div>
      {/* Radio */}
      <div
        className="absolute top-4 right-4 w-[18px] h-[18px] rounded-full flex items-center justify-center"
        style={{
          border: `1.5px solid ${selected ? 'var(--t-fg)' : 'var(--t-border-strong)'}`,
        }}
      >
        {selected && (
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: 'var(--t-fg)' }}
          />
        )}
      </div>
    </button>
  )
}
