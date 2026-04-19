import { useAuth } from '../hooks/use-auth'
import { useNotifications } from '../hooks/use-notifications'
import { Link } from 'react-router-dom'
import { Loader2, Bell, Mail, Check, X, AlertCircle, Clock, ChevronRight, CheckCheck } from 'lucide-react'
import type { Notification, NotificationType } from '../types/database'

interface NotifDisplay {
  icon: typeof Mail
  iconBg: string
  iconColor: string
  title: string
  body: string
  href?: string
}

function buildDisplay(n: Notification): NotifDisplay {
  const p = n.payload as Record<string, unknown>
  const projectName = (p.project_name as string) ?? 'un projet'
  const rate = p.rate_per_hour_fcfa as number | undefined
  const rateStr = rate && rate > 0
    ? ` · ${new Intl.NumberFormat('fr-SN').format(rate)} FCFA/h`
    : ''

  const map: Record<NotificationType, NotifDisplay> = {
    invitation_received: {
      icon: Mail,
      iconBg: 'bg-primary-100',
      iconColor: 'text-primary-600',
      title: 'Nouvelle invitation',
      body: `Vous êtes invité sur ${projectName}${rateStr}`,
      href: p.invitation_id ? `/speaker/invitations/${p.invitation_id}` : '/speaker/invitations',
    },
    invitation_reminder: {
      icon: Clock,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      title: 'Rappel d\'invitation',
      body: `${projectName} attend votre réponse${rateStr}`,
      href: p.invitation_id ? `/speaker/invitations/${p.invitation_id}` : '/speaker/invitations',
    },
    invitation_accepted: {
      icon: Check,
      iconBg: 'bg-secondary-100',
      iconColor: 'text-secondary-600',
      title: 'Invitation acceptée',
      body: `${(p.speaker_name as string) ?? 'Un locuteur'} a accepté votre invitation sur ${projectName}`,
    },
    invitation_declined: {
      icon: X,
      iconBg: 'bg-sand-100',
      iconColor: 'text-sand-500',
      title: 'Invitation déclinée',
      body: `${(p.speaker_name as string) ?? 'Un locuteur'} a décliné votre invitation sur ${projectName}`,
    },
    recording_rejected: {
      icon: AlertCircle,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      title: 'Enregistrement rejeté',
      body: `Un enregistrement sur ${projectName} n\'a pas passé le contrôle qualité`,
    },
    project_completed: {
      icon: Check,
      iconBg: 'bg-secondary-100',
      iconColor: 'text-secondary-600',
      title: 'Projet terminé',
      body: `${projectName} est complet. Merci pour votre participation !`,
    },
  }

  return map[n.type] ?? {
    icon: Bell,
    iconBg: 'bg-sand-100',
    iconColor: 'text-sand-500',
    title: 'Notification',
    body: '',
  }
}

function relativeTime(iso: string): string {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'à l\'instant'
  if (mins < 60) return `il y a ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `il y a ${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `il y a ${days} j`
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export function SpeakerNotificationsPage() {
  const { user } = useAuth()
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications(user?.id)

  return (
    <div className="max-w-[42rem] mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1
          className="text-2xl font-extrabold text-sand-900 dark:text-sand-100"
          style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}
        >
          Notifications
        </h1>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Tout marquer lu
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16">
          <Bell className="w-10 h-10 text-sand-300 mx-auto mb-3" />
          <p className="text-sand-500 font-semibold">Aucune notification pour l\'instant</p>
          <p className="text-sand-400 text-sm mt-1">Vous serez prévenu ici des invitations et mises à jour</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => {
            const d = buildDisplay(n)
            const Icon = d.icon
            const isUnread = !n.read_at
            const content = (
              <div
                className={`flex items-start gap-3 rounded-2xl border p-4 transition-colors ${
                  isUnread
                    ? 'bg-primary-50/60 dark:bg-primary-900/10 border-primary-200/70 dark:border-primary-800/40'
                    : 'bg-white dark:bg-sand-900 border-sand-200/70 dark:border-sand-800/70'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl ${d.iconBg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${d.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-bold text-sand-900 dark:text-sand-100 truncate">
                      {d.title}
                    </p>
                    {isUnread && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-sand-600 dark:text-sand-400 leading-relaxed">
                    {d.body}
                  </p>
                  <p className="text-[11px] text-sand-400 mt-1">
                    {relativeTime(n.created_at)}
                  </p>
                </div>
                {d.href && (
                  <ChevronRight className="w-4 h-4 text-sand-300 shrink-0 mt-1" />
                )}
              </div>
            )

            if (d.href) {
              return (
                <Link
                  key={n.id}
                  to={d.href}
                  onClick={() => isUnread && markAsRead(n.id)}
                  className="block hover:opacity-95 transition-opacity"
                >
                  {content}
                </Link>
              )
            }

            return (
              <button
                key={n.id}
                onClick={() => isUnread && markAsRead(n.id)}
                className="block w-full text-left hover:opacity-95 transition-opacity"
              >
                {content}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
