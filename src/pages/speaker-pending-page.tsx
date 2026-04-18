import { Clock, Mic, Mail } from 'lucide-react'
import { useAuth } from '../hooks/use-auth'

export function SpeakerPendingPage() {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-sand-50 flex items-center justify-center px-6">
      <div className="w-full max-w-[28rem] text-center">
        <div className="relative inline-flex mb-6">
          <div className="w-20 h-20 rounded-2xl bg-amber-100 flex items-center justify-center">
            <Clock className="w-10 h-10 text-amber-500" />
          </div>
        </div>

        <h1
          className="text-2xl font-extrabold text-sand-900 mb-3"
          style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}
        >
          Profil en cours de validation
        </h1>
        <p className="text-sand-500 text-sm leading-relaxed mb-6 max-w-[24rem] mx-auto">
          Votre profil a bien été reçu. Notre équipe le vérifie dans les <strong className="text-sand-700">48 heures</strong>.
          Vous recevrez un email dès l'approbation.
        </p>

        <div className="bg-white rounded-2xl border border-sand-200 shadow-md shadow-sand-900/6 p-5 mb-6 text-left space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
              <Mic className="w-4 h-4 text-primary-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-sand-800">Compte créé</p>
              <p className="text-xs text-sand-500">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-sand-800">Vérification en cours</p>
              <p className="text-xs text-sand-500">Délai habituel : 24–48 heures</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-sand-100 flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4 text-sand-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-sand-500">Email de confirmation</p>
              <p className="text-xs text-sand-400">À venir après validation</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => signOut()}
          className="text-sm text-sand-400 hover:text-sand-600 transition-colors"
        >
          Se déconnecter
        </button>
      </div>
    </div>
  )
}
