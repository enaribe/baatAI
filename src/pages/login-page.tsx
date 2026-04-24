import { useState, useMemo } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/use-auth'
import {
  Loader2, AlertCircle, Mail, Lock, ArrowRight, ShieldCheck, Info,
} from 'lucide-react'
import { PublicLayout } from '../components/layout/public-layout'
import { Field } from '../components/ui/field'
import { Button } from '../components/ui/button'
import { ThemeToggle } from '../components/ui/theme-toggle'

export function LoginPage() {
  const { signIn, user, loading: authLoading, role } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [searchParams] = useSearchParams()

  const accountNotice = useMemo(() => {
    const reason = searchParams.get('account')
    if (reason === 'revoked') {
      return 'Votre compte n\'existe plus. Contactez le support si c\'est une erreur.'
    }
    if (reason === 'suspended') {
      return 'Votre compte a été suspendu. Contactez le support pour plus d\'informations.'
    }
    return null
  }, [searchParams])

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: signInError } = await signIn(email, password)
    if (signInError) {
      setError(
        signInError.message === 'Invalid login credentials'
          ? 'Email ou mot de passe incorrect'
          : signInError.message,
      )
    }
    setLoading(false)
  }

  return (
    <PublicLayout
      brandTitle={<>Reprenez<br />là où vous<br />vous étiez.</>}
      brandSubtitle="Vos projets, vos datasets et vos paiements — au même endroit."
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
          /login
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
          Pas encore de compte ?
        </span>
        <Link
          to="/register"
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
          Créer un compte
        </Link>
        <ThemeToggle size={28} />
      </div>

      {/* Formulaire centré */}
      <div className="flex-1 flex flex-col justify-center max-w-[420px] w-full mx-auto">
        <h1
          className="text-[28px] sm:text-[32px] text-[#f7f8f8] m-0"
          style={{
            fontFamily: 'var(--font-body)',
            fontFeatureSettings: "'cv01','ss03'",
            fontWeight: 510,
            lineHeight: 1.1,
            letterSpacing: '-0.7px',
          }}
        >
          Content de vous revoir.
        </h1>
        <p
          className="text-[15px] text-[#8a8f98] mt-2.5"
          style={{
            fontFamily: 'var(--font-body)',
            fontFeatureSettings: "'cv01','ss03'",
            lineHeight: 1.55,
          }}
        >
          Connectez-vous pour reprendre vos projets.
        </p>

        {accountNotice && (
          <div
            className="mt-5 flex items-start gap-2 px-3 py-2.5 rounded-md text-[12px]"
            style={{
              fontFamily: 'var(--font-body)',
              fontFeatureSettings: "'cv01','ss03'",
              color: 'var(--t-warning)',
              background: 'var(--t-warning-muted-bg)',
              border: '1px solid var(--t-warning-muted-border)',
            }}
          >
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{accountNotice}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-3.5">
          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-md text-[12px] text-[#fca5a5] border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)]" style={{ fontFeatureSettings: "'cv01','ss03'" }}>
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <Field
            label="Email"
            type="email"
            icon={<Mail className="w-3.5 h-3.5" strokeWidth={1.75} />}
            placeholder="vous@exemple.com"
            value={email}
            onChange={setEmail}
          />
          <Field
            label="Mot de passe"
            type="password"
            icon={<Lock className="w-3.5 h-3.5" strokeWidth={1.75} />}
            placeholder="••••••••"
            value={password}
            onChange={setPassword}
            rightSlot={
              <a
                className="text-[11px] text-[#8a8f98] whitespace-nowrap cursor-pointer hover:text-[#f7f8f8] transition-colors"
                style={{ fontFamily: 'var(--font-body)', fontFeatureSettings: "'cv01','ss03'" }}
              >
                Oublié ?
              </a>
            }
          />

          <div className="mt-[14px]">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              iconRight={!loading ? <ArrowRight className="w-4 h-4" strokeWidth={1.75} /> : undefined}
              className="w-full justify-center"
            >
              Se connecter
            </Button>
          </div>
        </form>

        <div
          className="flex items-center justify-center gap-2 mt-6 text-[12px] text-[#62666d]"
          style={{ fontFamily: 'var(--font-body)', fontFeatureSettings: "'cv01','ss03'" }}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-[#62666d]" strokeWidth={1.75} />
          <span>Connexion chiffrée · 2FA recommandé</span>
        </div>
      </div>
    </PublicLayout>
  )
}
