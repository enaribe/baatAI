import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/use-auth'
import { Loader2, Mic, AlertCircle, User, Mail, Lock, Building2 } from 'lucide-react'

export function RegisterPage() {
  const { signUp, user, loading: authLoading } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [organization, setOrganization] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sand-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères')
      return
    }

    setLoading(true)
    const { error: signUpError } = await signUp(email, password, fullName, 'client', organization || undefined)
    if (signUpError) {
      setError(signUpError.message)
    }
    setLoading(false)
  }

  return (
    <div className="w-full">
      {/* Logo + titre */}
      <div className="text-center mb-7">
        <div className="relative inline-flex items-center justify-center mb-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/30">
            <Mic className="w-7 h-7 text-white" />
          </div>
          <div className="absolute inset-0 rounded-2xl bg-primary-500/20 blur-md scale-110 pointer-events-none" />
        </div>
        <h1
          className="text-2xl font-extrabold text-sand-900 leading-none"
          style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.03em' }}
        >
          Rejoindre Baat-IA
        </h1>
        <p className="text-sand-500 mt-1.5 text-sm">Créez votre espace de datasets vocaux</p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-xl shadow-sand-900/8 border border-sand-200/60 p-7">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label htmlFor="fullName" className="block text-sm font-semibold text-sand-700 mb-1.5">
              Nom complet
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400 pointer-events-none" />
              <input
                id="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-sand-200 bg-sand-50 text-sand-900 placeholder-sand-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent focus:bg-white"
                placeholder="Amadou Diallo"
              />
            </div>
          </div>

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
                placeholder="Min. 6 caractères"
              />
            </div>
          </div>

          <div>
            <label htmlFor="organization" className="block text-sm font-semibold text-sand-700 mb-1.5">
              Organisation{' '}
              <span className="text-sand-400 font-normal text-xs">(optionnel)</span>
            </label>
            <div className="relative">
              <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400 pointer-events-none" />
              <input
                id="organization"
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-sand-200 bg-sand-50 text-sand-900 placeholder-sand-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent focus:bg-white"
                placeholder="Université, labo, entreprise..."
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold shadow-lg shadow-primary-500/25 transition-all duration-200 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary-500/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 mt-1"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
                Création...
              </span>
            ) : (
              'Créer mon compte'
            )}
          </button>
        </form>
      </div>

      <p className="text-center mt-5 text-sand-500 text-sm">
        Déjà un compte ?{' '}
        <Link
          to="/login"
          className="text-primary-600 font-semibold hover:text-primary-700 transition-colors underline underline-offset-2 decoration-primary-300"
        >
          Se connecter
        </Link>
      </p>
    </div>
  )
}
