import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/use-auth'
import {
  Loader2, Mic, AlertCircle, User, Mail, Lock, Building2,
  FolderOpen, ChevronRight, ArrowLeft,
} from 'lucide-react'

type Step = 'choose' | 'client-form'

export function RegisterPage() {
  const { signUp, user, loading: authLoading, role } = useAuth()
  const [step, setStep] = useState<Step>('choose')

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

  if (user && role) {
    if (role === 'speaker') return <Navigate to="/speaker/dashboard" replace />
    if (role === 'admin') return <Navigate to="/admin/withdrawals" replace />
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
      setLoading(false)
      return
    }
    setLoading(false)
  }

  // ── Étape 1 : choix du rôle ──────────────────────────────────────────────

  if (step === 'choose') {
    return (
      <div className="w-full">
        <div className="text-center mb-8">
          <div className="relative inline-flex items-center justify-center mb-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/30">
              <Mic className="w-8 h-8 text-white" />
            </div>
            <div className="absolute inset-0 rounded-2xl bg-primary-500/20 blur-md scale-110 pointer-events-none" />
          </div>
          <h1
            className="text-3xl font-extrabold text-sand-900 leading-none"
            style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.03em' }}
          >
            Rejoindre Baat-IA
          </h1>
          <p className="text-sand-500 mt-2 text-sm">Choisissez votre profil pour commencer</p>
        </div>

        <div className="space-y-3">
          {/* Carte client */}
          <button
            onClick={() => setStep('client-form')}
            className="w-full group bg-white rounded-2xl border-2 border-sand-200 hover:border-primary-400 p-5 text-left transition-all duration-200 hover:shadow-lg hover:shadow-primary-500/10 hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center group-hover:bg-primary-500 transition-colors duration-200">
                  <FolderOpen className="w-6 h-6 text-primary-600 group-hover:text-white transition-colors duration-200" />
                </div>
                <div>
                  <p
                    className="font-extrabold text-sand-900 text-base leading-none mb-1"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    Je crée des datasets
                  </p>
                  <p className="text-sm text-sand-500 leading-snug">
                    Entreprise, chercheur, labo — je collecte des voix pour mes projets IA
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-sand-300 group-hover:text-primary-500 shrink-0 transition-colors duration-200" />
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3 ml-16">
              {['Projets vocaux', 'Recrutement locuteurs', 'Export dataset', 'Contrôle qualité'].map(tag => (
                <span key={tag} className="text-[11px] font-semibold text-primary-700 bg-primary-50 px-2.5 py-0.5 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          </button>

          {/* Carte locuteur */}
          <Link
            to="/speaker/register"
            className="w-full group bg-white rounded-2xl border-2 border-sand-200 hover:border-secondary-400 p-5 text-left transition-all duration-200 hover:shadow-lg hover:shadow-secondary-500/10 hover:-translate-y-0.5 block"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-secondary-100 flex items-center justify-center group-hover:bg-secondary-500 transition-colors duration-200">
                  <Mic className="w-6 h-6 text-secondary-600 group-hover:text-white transition-colors duration-200" />
                </div>
                <div>
                  <p
                    className="font-extrabold text-sand-900 text-base leading-none mb-1"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    J'enregistre ma voix
                  </p>
                  <p className="text-sm text-sand-500 leading-snug">
                    Locuteur — je participe à des projets et je gagne de l'argent
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-sand-300 group-hover:text-secondary-500 shrink-0 transition-colors duration-200" />
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3 ml-16">
              {['Projets rémunérés', 'Wave / Orange Money', 'Depuis son téléphone', 'Wolof, Pulaar…'].map(tag => (
                <span key={tag} className="text-[11px] font-semibold text-secondary-700 bg-secondary-50 px-2.5 py-0.5 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          </Link>
        </div>

        <p className="text-center mt-6 text-sand-500 text-sm">
          Déjà un compte ?{' '}
          <Link to="/login" className="text-primary-600 font-semibold hover:text-primary-700 transition-colors underline underline-offset-2 decoration-primary-300">
            Se connecter
          </Link>
        </p>
      </div>
    )
  }

  // ── Étape 2 : formulaire client ──────────────────────────────────────────

  return (
    <div className="w-full">
      <div className="text-center mb-7">
        <div className="relative inline-flex items-center justify-center mb-4">
          <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
            <FolderOpen className="w-6 h-6 text-primary-600" />
          </div>
        </div>
        <h1
          className="text-2xl font-extrabold text-sand-900 leading-none"
          style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.03em' }}
        >
          Compte client
        </h1>
        <p className="text-sand-500 mt-1.5 text-sm">Créez vos projets de datasets vocaux</p>
      </div>

      <div className="bg-white rounded-2xl shadow-xl shadow-sand-900/8 border border-sand-200/60 p-7">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label htmlFor="fullName" className="block text-sm font-semibold text-sand-700 mb-1.5">Nom complet</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400 pointer-events-none" />
              <input
                id="fullName"
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-sand-200 bg-sand-50 text-sand-900 placeholder-sand-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent focus:bg-white"
                placeholder="Amadou Diallo"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-sand-700 mb-1.5">Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400 pointer-events-none" />
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-sand-200 bg-sand-50 text-sand-900 placeholder-sand-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent focus:bg-white"
                placeholder="votre@email.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-sand-700 mb-1.5">Mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400 pointer-events-none" />
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-sand-200 bg-sand-50 text-sand-900 placeholder-sand-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent focus:bg-white"
                placeholder="Min. 6 caractères"
              />
            </div>
          </div>

          <div>
            <label htmlFor="organization" className="block text-sm font-semibold text-sand-700 mb-1.5">
              Organisation <span className="text-sand-400 font-normal text-xs">(optionnel)</span>
            </label>
            <div className="relative">
              <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400 pointer-events-none" />
              <input
                id="organization"
                type="text"
                value={organization}
                onChange={e => setOrganization(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-sand-200 bg-sand-50 text-sand-900 placeholder-sand-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent focus:bg-white"
                placeholder="Université, labo, entreprise..."
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold shadow-lg shadow-primary-500/25 transition-all duration-200 hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 mt-1"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
                Création...
              </span>
            ) : 'Créer mon compte client'}
          </button>
        </form>
      </div>

      <button
        onClick={() => setStep('choose')}
        className="flex items-center gap-1.5 mx-auto mt-5 text-sand-500 text-sm hover:text-sand-700 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Changer de type de compte
      </button>

      <p className="text-center mt-3 text-sand-500 text-sm">
        Déjà un compte ?{' '}
        <Link to="/login" className="text-primary-600 font-semibold hover:text-primary-700 transition-colors underline underline-offset-2 decoration-primary-300">
          Se connecter
        </Link>
      </p>
    </div>
  )
}
