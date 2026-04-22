import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Mail, Users, UserPlus } from 'lucide-react'
import { SentTab } from './sent-tab'
import { TeamTab } from './team-tab'
import { InviteDrawer } from './invite-drawer'

const sans = { fontFamily: 'var(--font-body)', fontFeatureSettings: "'cv01','ss03'" }
const mono = { fontFamily: 'var(--font-mono)' }

interface RecruitmentPanelProps {
  projectId: string
}

type SubTab = 'sent' | 'team'

const subTabs: { key: SubTab; label: string; icon: typeof Mail }[] = [
  { key: 'sent', label: 'Invitations', icon: Mail },
  { key: 'team', label: 'Équipe', icon: Users },
]

export function RecruitmentPanel({ projectId }: RecruitmentPanelProps) {
  const [tab, setTab] = useState<SubTab>('sent')
  const [searchParams, setSearchParams] = useSearchParams()
  const [inviteOpen, setInviteOpen] = useState(() => searchParams.get('invite') === '1')

  // Clean-up du query param après ouverture initiale
  useEffect(() => {
    if (searchParams.get('invite') === '1') {
      const next = new URLSearchParams(searchParams)
      next.delete('invite')
      setSearchParams(next, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div>
      {/* Header avec sous-onglets + CTA inviter */}
      <div className="flex items-center gap-0.5 mb-6 flex-wrap">
        {subTabs.map(({ key, label, icon: Icon }) => {
          const on = tab === key
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="relative inline-flex items-center gap-1.5 h-[32px] px-3 text-[12px] rounded-md transition-colors whitespace-nowrap"
              style={{
                ...sans,
                fontWeight: 510,
                color: on ? 'var(--t-fg)' : 'var(--t-fg-3)',
                background: on ? 'rgba(255,255,255,0.05)' : 'transparent',
                border: `1px solid ${on ? 'rgba(255,255,255,0.08)' : 'transparent'}`,
              }}
            >
              <Icon className="w-3 h-3" strokeWidth={1.75} />
              {label}
            </button>
          )
        })}

        <button
          onClick={() => setInviteOpen(true)}
          className="ml-auto inline-flex items-center gap-1.5 h-[32px] px-3 text-[12px] rounded-md transition-colors"
          style={{
            ...sans,
            fontWeight: 510,
            color: '#ffffff',
            background: '#5e6ad2',
          }}
        >
          <UserPlus className="w-3 h-3" strokeWidth={1.75} />
          Inviter des locuteurs
        </button>
      </div>

      <div className="animate-fade-in-up">
        {tab === 'sent' && <SentTab projectId={projectId} />}
        {tab === 'team' && <TeamTab projectId={projectId} />}
      </div>

      {inviteOpen && (
        <InviteDrawer
          projectId={projectId}
          onClose={() => setInviteOpen(false)}
        />
      )}
    </div>
  )
}

// évite l'import mort si le bundler se plaint
void mono
