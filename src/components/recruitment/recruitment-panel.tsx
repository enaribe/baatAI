import { useState } from 'react'
import { UserSearch, Mail, Users } from 'lucide-react'
import { DiscoverTab } from './discover-tab'
import { SentTab } from './sent-tab'
import { TeamTab } from './team-tab'

interface RecruitmentPanelProps {
  projectId: string
}

type SubTab = 'discover' | 'sent' | 'team'

const subTabs: { key: SubTab; label: string; icon: typeof UserSearch }[] = [
  { key: 'discover', label: 'Découvrir', icon: UserSearch },
  { key: 'sent', label: 'Invitations', icon: Mail },
  { key: 'team', label: 'Équipe', icon: Users },
]

export function RecruitmentPanel({ projectId }: RecruitmentPanelProps) {
  const [tab, setTab] = useState<SubTab>('discover')

  return (
    <div>
      {/* Inner tab nav */}
      <div className="flex items-center gap-1 p-1 bg-sand-100 dark:bg-sand-800/80 rounded-xl border border-sand-200/60 dark:border-sand-800 w-fit mb-6">
        {subTabs.map(({ key, label, icon: Icon }) => {
          const isActive = tab === key
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={[
                'relative inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all duration-200',
                isActive
                  ? 'bg-white dark:bg-sand-900 text-sand-900 dark:text-sand-100 shadow-sm'
                  : 'text-sand-500 hover:text-sand-700 dark:hover:text-sand-300',
              ].join(' ')}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          )
        })}
      </div>

      <div className="animate-fade-in-up">
        {tab === 'discover' && <DiscoverTab projectId={projectId} />}
        {tab === 'sent' && <SentTab projectId={projectId} />}
        {tab === 'team' && <TeamTab projectId={projectId} />}
      </div>
    </div>
  )
}
