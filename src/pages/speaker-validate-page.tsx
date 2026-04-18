import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../hooks/use-auth'
import { usePeerValidation } from '../hooks/use-peer-validation'
import { useSpeakerProfile } from '../hooks/use-speaker-profile'
import { CheckCircle2, XCircle, Loader2, Volume2, AlertCircle, CheckSquare } from 'lucide-react'

export function SpeakerValidatePage() {
  const { user } = useAuth()
  const { profile } = useSpeakerProfile(user?.id)
  const { item, loading, submitting, error, loadNext, submit } = usePeerValidation()
  const [sessionCount, setSessionCount] = useState(0)
  const [done, setDone] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (user?.id) loadNext(user.id)
  }, [user?.id, loadNext])

  const handleVote = async (vote: boolean) => {
    const { error: err } = await submit(vote, 'certain')
    if (!err) {
      setSessionCount(n => n + 1)
      if (user?.id) {
        await loadNext(user.id)
        if (!item) setDone(true)
      }
    }
  }

  const playAudio = () => {
    if (!audioRef.current || !item?.audio_url) return
    if (playing) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setPlaying(false)
    } else {
      audioRef.current.play()
      setPlaying(true)
    }
  }

  if (!profile || profile.verification_status !== 'approved') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sand-50 px-6">
        <p className="text-sand-500 text-center">Profil non approuvé.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sand-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
      </div>
    )
  }

  if (done || (!loading && !item)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-sand-50 px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-secondary-100 flex items-center justify-center mb-5">
          <CheckSquare className="w-10 h-10 text-secondary-600" />
        </div>
        <h1
          className="text-2xl font-extrabold text-sand-900 mb-2"
          style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}
        >
          Session terminée
        </h1>
        <p className="text-sand-500 text-sm mb-1">
          Vous avez validé <strong className="text-sand-700">{sessionCount}</strong> enregistrement{sessionCount > 1 ? 's' : ''} aujourd'hui.
        </p>
        <p className="text-secondary-600 font-bold text-sm">
          +{sessionCount * 10} FCFA ajoutés à votre solde
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-sand-50 select-none">
      {/* En-tête */}
      <div className="px-4 pt-6 pb-4 text-center">
        <p className="text-xs font-bold text-sand-400 uppercase tracking-widest mb-1">Validation croisée</p>
        <p className="text-sm font-semibold text-sand-600">
          {sessionCount} validé{sessionCount > 1 ? 's' : ''} · +{sessionCount * 10} FCFA
        </p>
      </div>

      {/* Phrase attendue */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-[24rem]">
          <p className="text-[11px] font-bold text-sand-400 uppercase tracking-widest text-center mb-4">
            L'orateur devait lire :
          </p>
          <div className="bg-white rounded-2xl border border-sand-200 shadow-md shadow-sand-900/6 p-6 mb-6 text-center">
            <p
              className="text-sand-900 leading-snug"
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'clamp(18px, 4.5vw, 26px)',
                fontWeight: 600,
              }}
            >
              {item?.phrase_content}
            </p>
          </div>

          {/* Lecteur audio */}
          {item?.audio_url && (
            <>
              <audio
                ref={audioRef}
                src={item.audio_url}
                onEnded={() => setPlaying(false)}
              />
              <button
                onClick={playAudio}
                className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 font-bold text-sm hover:bg-accent-200 transition-all mb-8"
              >
                <Volume2 className="w-5 h-5" />
                {playing ? 'Arrêter' : 'Écouter l\'enregistrement'}
              </button>
            </>
          )}

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-xl text-sm mb-4">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Question + boutons vote */}
          <p className="text-center text-sm font-semibold text-sand-700 mb-4">
            La phrase a-t-elle été lue correctement ?
          </p>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleVote(false)}
              disabled={submitting}
              className="flex flex-col items-center gap-2 py-5 rounded-2xl bg-red-50 border-2 border-red-200 text-red-600 font-bold hover:bg-red-100 hover:border-red-300 transition-all active:scale-95 disabled:opacity-40"
              style={{ touchAction: 'manipulation' }}
            >
              {submitting
                ? <Loader2 className="w-8 h-8 animate-spin" />
                : <XCircle className="w-8 h-8" />}
              <span className="text-sm">Mal lue</span>
            </button>
            <button
              onClick={() => handleVote(true)}
              disabled={submitting}
              className="flex flex-col items-center gap-2 py-5 rounded-2xl bg-secondary-50 border-2 border-secondary-200 text-secondary-700 font-bold hover:bg-secondary-100 hover:border-secondary-300 transition-all active:scale-95 disabled:opacity-40"
              style={{ touchAction: 'manipulation' }}
            >
              {submitting
                ? <Loader2 className="w-8 h-8 animate-spin" />
                : <CheckCircle2 className="w-8 h-8" />}
              <span className="text-sm">Bien lue</span>
            </button>
          </div>
        </div>
      </div>

      {/* Rémunération */}
      <div className="px-6 pb-6 text-center">
        <p className="text-xs text-sand-400">+10 FCFA par validation · Résultats crédités immédiatement</p>
      </div>
    </div>
  )
}
