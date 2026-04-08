import { useState } from 'react'
import { FileText, ChevronDown, ChevronUp } from 'lucide-react'
import type { Phrase, Recording } from '../types/database'

interface PhraseListProps {
  phrases: Phrase[]
  recordings: Recording[]
}

export function PhraseList({ phrases, recordings }: PhraseListProps) {
  const [expanded, setExpanded] = useState(false)

  const recordedPhraseIds = new Set(recordings.map((r) => r.phrase_id))
  const visiblePhrases = expanded ? phrases : phrases.slice(0, 10)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary-500" />
          <h3
            className="text-base font-bold text-sand-900 dark:text-sand-100"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Phrases ({phrases.length})
          </h3>
        </div>
        <span className="text-xs text-sand-400">
          {recordedPhraseIds.size}/{phrases.length} enregistrées
        </span>
      </div>

      <div className="space-y-1">
        {visiblePhrases.map((phrase) => {
          const isRecorded = recordedPhraseIds.has(phrase.id)
          return (
            <div
              key={phrase.id}
              className={`flex items-start gap-3 py-2.5 px-3 rounded-lg text-sm ${
                isRecorded
                  ? 'bg-secondary-50/50 dark:bg-secondary-900/10'
                  : 'hover:bg-sand-50 dark:hover:bg-sand-800/50'
              }`}
            >
              <span className="text-sand-400 tabular-nums shrink-0 w-7 text-right text-xs pt-0.5">
                {phrase.position}
              </span>
              <span className="text-sand-800 dark:text-sand-200 flex-1">{phrase.content}</span>
              {isRecorded && (
                <span className="shrink-0 w-2 h-2 rounded-full bg-secondary-500 mt-1.5" />
              )}
            </div>
          )
        })}
      </div>

      {phrases.length > 10 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 mt-3 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Réduire
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Voir les {phrases.length - 10} autres
            </>
          )}
        </button>
      )}
    </div>
  )
}
