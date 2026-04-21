import { useParams, useNavigate, Link } from 'react-router-dom'
import { useState } from 'react'
import {
  Loader2, ArrowLeft, Mic, Clock, Banknote, User, Globe,
  Check, X, AlertCircle, ChevronRight, FileText, Sparkles,
} from 'lucide-react'
import { useInvitationDetail } from '../hooks/use-invitation-detail'
import { supabase } from '../lib/supabase'
import { getLanguageLabel } from '../lib/languages'

function formatDuration(minutes: number | null): string {
  if (!minutes || minutes <= 0) return '—'
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h} h` : `${h} h ${m}`
}

function formatFcfa(n: number | null | undefined): string {
  if (!n) return '0'
  return new Intl.NumberFormat('fr-SN').format(n)
}

export function SpeakerInvitationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { invitation, loading, error, refetch } = useInvitationDetail(id)
  const [action, setAction] = useState<'idle' | 'accepting' | 'declining' | 'starting'>('idle')
  const [actionError, setActionError] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  if (error || !invitation) {
    return (
      <div className="max-w-[42rem] mx-auto px-4 py-8">
        <Link to="/speaker/invitations" className="inline-flex items-center gap-2 text-sm text-sand-500 hover:text-sand-700 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Retour aux invitations
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-900">Invitation introuvable</p>
            <p className="text-sm text-red-700 mt-1">{error ?? 'Cette invitation n\'existe pas ou vous n\'y avez pas accès.'}</p>
          </div>
        </div>
      </div>
    )
  }

  const { project, status, message, expires_at, rate_snapshot_fcfa, estimated_duration_minutes, phrase_count, preview_phrases, inviter_name } = invitation
  const rate = rate_snapshot_fcfa ?? project?.rate_per_hour_fcfa ?? 0
  const totalEstimated = estimated_duration_minutes && rate
    ? Math.round((estimated_duration_minutes / 60) * rate)
    : null

  const expiresDate = new Date(expires_at)
  const daysLeft = Math.ceil((expiresDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  const isExpiringSoon = daysLeft <= 3 && daysLeft > 0 && status === 'pending'
  const isExpired = status === 'expired' || (daysLeft <= 0 && status === 'pending')

  const decline = async () => {
    setAction('declining')
    setActionError(null)
    type DbResult = Promise<{ error: { message: string } | null }>
    const { error: err } = await (supabase
      .from('project_invitations')
      .update({ status: 'declined', responded_at: new Date().toISOString() } as unknown as never)
      .eq('id', invitation.id) as unknown as DbResult)
    if (err) {
      setActionError(err.message)
      setAction('idle')
      return
    }
    await refetch()
    setAction('idle')
  }

  const accept = async () => {
    setAction('accepting')
    setActionError(null)
    type DbResult = Promise<{ error: { message: string } | null }>
    const { error: err } = await (supabase
      .from('project_invitations')
      .update({ status: 'accepted', responded_at: new Date().toISOString() } as unknown as never)
      .eq('id', invitation.id) as unknown as DbResult)
    if (err) {
      setActionError(err.message)
      setAction('idle')
      return
    }
    await refetch()
    setAction('idle')
  }

  const start = async () => {
    setAction('starting')
    setActionError(null)
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setActionError('Session expirée')
      setAction('idle')
      return
    }

    const res = await fetch(`${supabaseUrl}/functions/v1/accept-project`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string },
      body: JSON.stringify({ project_id: invitation.project_id, invitation_id: invitation.id }),
    })
    const json = await res.json() as { data?: { session_id: string }; error?: string }
    if (json.error || !json.data?.session_id) {
      setActionError(json.error ?? 'Erreur lors du démarrage')
      setAction('idle')
      return
    }
    navigate(`/speaker/record/${json.data.session_id}`)
  }

  return (
    <div className="max-w-[42rem] mx-auto px-4 py-8">
      <Link to="/speaker/invitations" className="inline-flex items-center gap-2 text-sm text-sand-500 hover:text-sand-700 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Retour aux invitations
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shrink-0">
            <Mic className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1
              className="text-xl font-extrabold text-sand-900 dark:text-sand-100 leading-tight"
              style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}
            >
              {project?.name ?? 'Projet'}
            </h1>
            <p className="text-sm text-sand-500 mt-1">
              {project?.language_label ?? getLanguageLabel(project?.target_language ?? '')}
              {project?.funding_source && (
                <>
                  <span className="mx-1.5 text-sand-300">·</span>
                  <span className="font-semibold text-accent-600">{project.funding_source}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {inviter_name && (
          <p className="text-xs text-sand-500 flex items-center gap-1.5">
            <User className="w-3 h-3" />
            Invité par <span className="font-semibold text-sand-700">{inviter_name}</span>
          </p>
        )}
      </div>

      {/* Expiration alert */}
      {isExpiringSoon && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
          <Clock className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800 font-semibold">
            Expire dans {daysLeft} jour{daysLeft > 1 ? 's' : ''}
          </p>
        </div>
      )}

      {isExpired && (
        <div className="flex items-center gap-2 bg-sand-50 border border-sand-200 rounded-xl px-4 py-3 mb-4">
          <Clock className="w-4 h-4 text-sand-500 shrink-0" />
          <p className="text-sm text-sand-600 font-semibold">Cette invitation a expiré</p>
        </div>
      )}

      {/* Key stats */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-white dark:bg-sand-900 rounded-2xl border border-sand-200/70 dark:border-sand-800/70 p-4">
          <div className="flex items-center gap-1.5 text-xs text-sand-500 mb-1">
            <FileText className="w-3 h-3" />
            Phrases
          </div>
          <p className="text-xl font-extrabold text-sand-900 dark:text-sand-100 tabular-nums">
            {phrase_count}
          </p>
        </div>

        <div className="bg-white dark:bg-sand-900 rounded-2xl border border-sand-200/70 dark:border-sand-800/70 p-4">
          <div className="flex items-center gap-1.5 text-xs text-sand-500 mb-1">
            <Clock className="w-3 h-3" />
            Durée estimée
          </div>
          <p className="text-xl font-extrabold text-sand-900 dark:text-sand-100 tabular-nums">
            {formatDuration(estimated_duration_minutes)}
          </p>
        </div>

        {rate > 0 && (
          <div className="bg-primary-50 dark:bg-primary-900/20 rounded-2xl border border-primary-200/70 dark:border-primary-800/40 p-4">
            <div className="flex items-center gap-1.5 text-xs text-primary-700 dark:text-primary-400 mb-1">
              <Banknote className="w-3 h-3" />
              Tarif horaire
            </div>
            <p className="text-xl font-extrabold text-primary-700 dark:text-primary-400 tabular-nums">
              {formatFcfa(rate)}<span className="text-xs font-semibold ml-0.5">FCFA/h</span>
            </p>
          </div>
        )}

        {totalEstimated && (
          <div className="bg-secondary-50 dark:bg-secondary-900/20 rounded-2xl border border-secondary-200/70 dark:border-secondary-800/40 p-4">
            <div className="flex items-center gap-1.5 text-xs text-secondary-700 dark:text-secondary-400 mb-1">
              <Sparkles className="w-3 h-3" />
              Gain estimé
            </div>
            <p className="text-xl font-extrabold text-secondary-700 dark:text-secondary-400 tabular-nums">
              {formatFcfa(totalEstimated)}<span className="text-xs font-semibold ml-0.5">FCFA</span>
            </p>
          </div>
        )}
      </div>

      {/* Language requirements */}
      {project?.required_languages && project.required_languages.length > 0 && (
        <div className="bg-white dark:bg-sand-900 rounded-2xl border border-sand-200/70 dark:border-sand-800/70 p-4 mb-4">
          <div className="flex items-center gap-1.5 text-xs text-sand-500 mb-2">
            <Globe className="w-3 h-3" />
            Langues requises
          </div>
          <div className="flex flex-wrap gap-1.5">
            {project.required_languages.map(lang => (
              <span key={lang} className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300">
                {getLanguageLabel(lang)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      {project?.description && (
        <div className="bg-white dark:bg-sand-900 rounded-2xl border border-sand-200/70 dark:border-sand-800/70 p-4 mb-4">
          <p className="text-xs font-semibold text-sand-500 mb-1.5">À propos du projet</p>
          <p className="text-sm text-sand-700 dark:text-sand-300 leading-relaxed">
            {project.description}
          </p>
        </div>
      )}

      {/* Message du client */}
      {message && (
        <div className="bg-sand-50 dark:bg-sand-800 rounded-2xl p-4 mb-4">
          <p className="text-xs font-semibold text-sand-500 mb-1.5">Message du client</p>
          <p className="text-sm text-sand-700 dark:text-sand-300 italic leading-relaxed">
            « {message} »
          </p>
        </div>
      )}

      {/* Preview phrases */}
      {preview_phrases.length > 0 && (
        <div className="bg-white dark:bg-sand-900 rounded-2xl border border-sand-200/70 dark:border-sand-800/70 p-4 mb-5">
          <p className="text-xs font-semibold text-sand-500 mb-2.5">Aperçu des phrases</p>
          <div className="space-y-2">
            {preview_phrases.map((p, i) => (
              <div key={p.id} className="flex gap-2.5">
                <span className="text-[10px] font-bold text-sand-400 tabular-nums mt-0.5 shrink-0">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <p className="text-sm text-sand-800 dark:text-sand-200 leading-relaxed flex-1">
                  {p.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expiration info */}
      {status === 'pending' && !isExpired && (
        <p className="text-[11px] text-sand-400 text-center mb-5">
          Expire le {expiresDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      )}

      {/* Error display */}
      {actionError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{actionError}</p>
        </div>
      )}

      {/* Actions */}
      {status === 'pending' && !isExpired && (
        <div className="space-y-2">
          <button
            onClick={start}
            disabled={action !== 'idle'}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold shadow-lg shadow-primary-500/25 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:hover:scale-100"
          >
            {action === 'starting' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Mic className="w-4 h-4" />
                Commencer maintenant
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="flex gap-2">
            <button
              onClick={decline}
              disabled={action !== 'idle'}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl border border-sand-200 text-sand-600 font-semibold text-sm hover:bg-sand-50 transition-all disabled:opacity-40"
            >
              {action === 'declining' ? <Loader2 className="w-4 h-4 animate-spin" /> : <><X className="w-3.5 h-3.5" />Décliner</>}
            </button>
            <button
              onClick={accept}
              disabled={action !== 'idle'}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-secondary-100 text-secondary-700 font-semibold text-sm hover:bg-secondary-200 transition-all disabled:opacity-40"
            >
              {action === 'accepting' ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-3.5 h-3.5" />Accepter (plus tard)</>}
            </button>
          </div>
        </div>
      )}

      {status === 'accepted' && (
        <button
          onClick={start}
          disabled={action !== 'idle'}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold shadow-lg shadow-primary-500/25 hover:scale-[1.01] transition-all disabled:opacity-50"
        >
          {action === 'starting' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Mic className="w-4 h-4" />
              Commencer l'enregistrement
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      )}

      {status === 'declined' && (
        <div className="text-center py-4">
          <p className="text-sm text-sand-500 font-semibold">Vous avez décliné cette invitation</p>
        </div>
      )}

      {status === 'cancelled' && (
        <div className="text-center py-4">
          <p className="text-sm text-sand-500 font-semibold">Cette invitation a été annulée par le client</p>
        </div>
      )}
    </div>
  )
}
