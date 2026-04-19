import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/use-auth'
import { Loader2, Mic, AlertCircle, Mail, Lock } from 'lucide-react'

export function LoginPage() {
  const { signIn, user, loading: authLoading, role, roleStatus } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const waitingForRole = user !== null && roleStatus !== 'loaded' && roleStatus !== 'error'

  if (authLoading || waitingForRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sand-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  if (user && role) {
    if (role === 'speaker') return <Navigate to="/speaker/dashboard" replace />
    if (role === 'admin') return <Navigate to="/admin/withdrawals" replace />
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
    <div className="w-full">
      {/* Logo + titre */}
      <div className="text-center mb-8">
        <div className="relative inline-flex items-center justify-center mb-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/30 animate-pulse-soft">
            <Mic className="w-8 h-8 text-white" />
          </div>
          {/* Glow ring */}
          <div className="absolute inset-0 rounded-2xl bg-primary-500/20 blur-md scale-110 pointer-events-none" />
        </div>
        <h1
          className="text-3xl font-extrabold text-sand-900 leading-none"
          style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.03em' }}
        >
          Baat-IA
        </h1>
        <p className="text-sand-500 mt-2 text-sm">Connectez-vous à votre espace</p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-xl shadow-sand-900/8 border border-sand-200/60 p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-sand-700 mb-1.5">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400 pointer-events-none" />
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-sand-200 bg-sand-50 text-sand-900 placeholder-sand-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent focus:bg-white"
                placeholder="votre@email.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-sand-700 mb-1.5">
              Mot de passe
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400 pointer-events-none" />
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-sand-200 bg-sand-50 text-sand-900 placeholder-sand-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent focus:bg-white"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold shadow-lg shadow-primary-500/25 transition-all duration-200 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary-500/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
                Connexion...
              </span>
            ) : (
              'Se connecter'
            )}
          </button>
        </form>
      </div>

      <p className="text-center mt-5 text-sand-500 text-sm">
        Pas encore de compte ?{' '}
        <Link
          to="/register"
          className="text-primary-600 font-semibold hover:text-primary-700 transition-colors underline underline-offset-2 decoration-primary-300"
        >
          Compte client
        </Link>
        {' '}·{' '}
        <Link
          to="/speaker/register"
          className="text-primary-600 font-semibold hover:text-primary-700 transition-colors underline underline-offset-2 decoration-primary-300"
        >
          Devenir locuteur
        </Link>
      </p>
    </div>
  )
}
