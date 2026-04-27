import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { useAuth } from '../hooks/use-auth'
import { useNotifications } from '../hooks/use-notifications'
import { Link } from 'react-router-dom'
import {
  Loader2, Bell, Mail, Check, X, AlertTriangle, Clock, ChevronRight,
  CheckCheck, Circle,
} from 'lucide-react'
import type { Notification, NotificationType } from '../types/database'

const sans = { fontFamily: 'var(--font-body)', fontFeatureSettings: "'cv01','ss03'" }
const mono = { fontFamily: 'var(--font-mono)' }

interface NotifDisplay {
  icon: React.ReactNode
  title: string
  body: string
  href?: string
}

function buildDisplay(n: Notification): NotifDisplay {
  const p = (n.payload as Record<string, unknown> | null) ?? {}
  const projectName = (p.project_name as string) ?? 'un projet'
  const rate = p.rate_per_hour_fcfa as number | undefined
  const rateStr = rate && rate > 0
    ? ` · ${new Intl.NumberFormat('fr-SN').format(rate)} FCFA/h`
    : ''

  const iconProps = { className: 'w-3.5 h-3.5', strokeWidth: 1.75 as const }

  const map: Record<NotificationType, NotifDisplay> = {
    invitation_received: {
      icon: <Mail {...iconProps} className="w-3.5 h-3.5 text-[#7170ff]" strokeWidth={1.75} />,
      title: 'Nouvelle invitation',
      body: `Vous êtes invité sur ${projectName}${rateStr}`,
      href: p.invitation_id ? `/speaker/invitations/${p.invitation_id}` : '/speaker/invitations',
    },
    invitation_reminder: {
      icon: <Clock {...iconProps} className="w-3.5 h-3.5 text-[#fbbf24]" strokeWidth={1.75} />,
      title: "Rappel d'invitation",
      body: `${projectName} attend votre réponse${rateStr}`,
      href: p.invitation_id ? `/speaker/invitations/${p.invitation_id}` : '/speaker/invitations',
    },
    invitation_accepted: {
      icon: <Check {...iconProps} className="w-3.5 h-3.5 text-[#10b981]" strokeWidth={1.75} />,
      title: 'Invitation acceptée',
      body: `${(p.speaker_name as string) ?? 'Un locuteur'} a accepté votre invitation sur ${projectName}`,
    },
    invitation_declined: {
      icon: <X {...iconProps} className="w-3.5 h-3.5 text-[var(--t-fg-3)]" strokeWidth={1.75} />,
      title: 'Invitation déclinée',
      body: `${(p.speaker_name as string) ?? 'Un locuteur'} a décliné votre invitation sur ${projectName}`,
    },
    recording_rejected: {
      icon: <AlertTriangle {...iconProps} className="w-3.5 h-3.5 text-[#fca5a5]" strokeWidth={1.75} />,
      title: 'Enregistrement rejeté',
      body: `Un enregistrement sur ${projectName} n'a pas passé le contrôle qualité`,
    },
    project_completed: {
      icon: <Check {...iconProps} className="w-3.5 h-3.5 text-[#10b981]" strokeWidth={1.75} />,
      title: 'Projet terminé',
      body: `${projectName} est complet. Merci pour votre participation !`,
    },
  }

  return map[n.type] ?? {
    icon: <Bell {...iconProps} className="w-3.5 h-3.5 text-[var(--t-fg-3)]" strokeWidth={1.75} />,
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

/* Error boundary local (page en blanc risqué sans ça) */
class LocalErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[NotificationsPage crash]', error, info)
  }
  render() {
    if (this.state.error) {
      return (
        <div className="p-8">
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-md text-[12px] text-[#fca5a5] border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)]" style={sans}>
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>Erreur d'affichage : {this.state.error.message}</span>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export function SpeakerNotificationsPage() {
  return (
    <LocalErrorBoundary>
      <Inner />
    </LocalErrorBoundary>
  )
}

function Inner() {
  const { user } = useAuth()
  const { notifications, unreadCount, loading, error, markAsRead, markAllAsRead } = useNotifications(user?.id)

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-10 flex items-center gap-3 px-5 lg:px-8 h-[52px] border-b border-[var(--t-surface-active)] bg-[var(--t-topbar-bg)] backdrop-blur-md">
        <Bell className="w-[13px] h-[13px] text-[var(--t-fg-3)]" strokeWidth={1.75} />
        <span className="text-[13px] text-[var(--t-fg)]" style={{ ...sans, fontWeight: 510 }}>
          Notifications
        </span>
        {unreadCount > 0 && (
          <span
            className="inline-flex items-center justify-center px-1.5 min-w-[18px] h-[18px] rounded-full text-[10px] text-white tabular-nums"
            style={{ ...sans, fontWeight: 590, background: '#5e6ad2' }}
          >
            {unreadCount}
          </span>
        )}
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="ml-auto inline-flex items-center gap-1 text-[12px] text-[var(--t-fg-3)] hover:text-[var(--t-fg)] transition-colors"
            style={sans}
          >
            <CheckCheck className="w-3 h-3" strokeWidth={1.75} />
            Tout marquer lu
          </button>
        )}
      </header>

      {error && (
        <div className="mx-5 lg:mx-8 mt-4 flex items-start gap-2 px-3 py-2.5 rounded-md text-[12px] text-[#fca5a5] border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.06)]" style={sans}>
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin text-[var(--t-fg-3)]" />
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState />
      ) : (
        <div>
          {notifications.map((n) => {
            const d = buildDisplay(n)
            const isUnread = !n.read_at

            const content = (
              <div className="flex items-center gap-3 h-[56px] px-5 lg:px-8 border-b border-[var(--t-surface-2)] hover:bg-[var(--t-surface)] transition-colors">
                {isUnread ? (
                  <Circle className="w-1.5 h-1.5 shrink-0 fill-[#7170ff] text-[#7170ff]" strokeWidth={0} />
                ) : (
                  <span className="w-1.5 h-1.5 shrink-0" />
                )}
                <span
                  className="w-7 h-7 flex items-center justify-center rounded-md shrink-0"
                  style={{
                    background: 'var(--t-surface-2)',
                    border: '1px solid var(--t-surface-active)',
                  }}
                >
                  {d.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[13px] text-[var(--t-fg)] truncate"
                    style={{ ...sans, fontWeight: isUnread ? 510 : 400 }}
                  >
                    {d.title}
                  </p>
                  <p className="text-[11px] text-[var(--t-fg-3)] truncate" style={sans}>
                    {d.body}
                  </p>
                </div>
                <span className="text-[11px] text-[var(--t-fg-4)] shrink-0 hidden sm:inline" style={mono}>
                  {relativeTime(n.created_at)}
                </span>
                {d.href && <ChevronRight className="w-3.5 h-3.5 text-[var(--t-fg-4)]" strokeWidth={1.75} />}
              </div>
            )

            if (d.href) {
              return (
                <Link
                  key={n.id}
                  to={d.href}
                  onClick={() => isUnread && markAsRead(n.id)}
                  className="block"
                >
                  {content}
                </Link>
              )
            }

            return (
              <button
                key={n.id}
                onClick={() => isUnread && markAsRead(n.id)}
                className="block w-full text-left bg-transparent border-0"
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

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
      <div
        className="w-12 h-12 rounded-[10px] flex items-center justify-center mb-5"
        style={{
          background: 'linear-gradient(135deg, var(--t-border), var(--t-surface))',
          border: '1px solid var(--t-border)',
        }}
      >
        <Bell className="w-5 h-5 text-[var(--t-fg-3)]" strokeWidth={1.5} />
      </div>
      <h3 className="text-[16px] text-[var(--t-fg)] m-0" style={{ ...sans, fontWeight: 590 }}>
        Tout est calme
      </h3>
      <p className="text-[13px] text-[var(--t-fg-3)] mt-2 max-w-[380px]" style={{ ...sans, lineHeight: 1.55 }}>
        Vous serez prévenu ici des invitations et mises à jour sur vos projets.
      </p>
    </div>
  )
}
