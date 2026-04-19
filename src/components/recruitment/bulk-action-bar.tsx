import { useState } from 'react'
import { Send, X, Loader2, MessageSquare } from 'lucide-react'

interface BulkActionBarProps {
  selectedCount: number
  onClear: () => void
  onSend: (message: string) => Promise<void>
  sending: boolean
}

export function BulkActionBar({ selectedCount, onClear, onSend, sending }: BulkActionBarProps) {
  const [message, setMessage] = useState('')
  const [showMessage, setShowMessage] = useState(false)
  const visible = selectedCount > 0

  return (
    <div
      className={[
        'fixed left-1/2 -translate-x-1/2 z-50 transition-all duration-300',
        visible
          ? 'bottom-6 opacity-100 translate-y-0'
          : 'bottom-0 opacity-0 translate-y-8 pointer-events-none',
      ].join(' ')}
      style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}
    >
      <div className="flex flex-col gap-0 bg-sand-900 dark:bg-sand-800 text-white rounded-2xl shadow-2xl shadow-sand-900/40 border border-sand-800 dark:border-sand-700 overflow-hidden min-w-[22rem] max-w-[32rem]">
        {/* Message (optional) */}
        {showMessage && (
          <div className="px-4 py-3 border-b border-sand-800 dark:border-sand-700 bg-sand-950/40 animate-fade-in">
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={2}
              maxLength={300}
              placeholder="Message personnalisé (optionnel)"
              className="w-full bg-transparent text-sm text-white placeholder:text-sand-500 focus:outline-none resize-none leading-relaxed"
            />
            <div className="flex items-center justify-between text-[10px] text-sand-500 mt-1">
              <span>{message.length}/300</span>
            </div>
          </div>
        )}

        {/* Main bar */}
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={onClear}
            aria-label="Effacer la sélection"
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-sand-300"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-baseline gap-1.5">
            <span
              className="text-2xl font-extrabold tabular-nums"
              style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.03em' }}
            >
              {selectedCount}
            </span>
            <span className="text-xs text-sand-400 font-medium">
              {selectedCount > 1 ? 'locuteurs sélectionnés' : 'locuteur sélectionné'}
            </span>
          </div>

          <div className="flex-1" />

          <button
            onClick={() => setShowMessage(v => !v)}
            aria-label="Ajouter un message"
            className={[
              'w-8 h-8 flex items-center justify-center rounded-full transition-all',
              showMessage
                ? 'bg-primary-500 text-white'
                : 'text-sand-300 hover:bg-white/10',
            ].join(' ')}
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onSend(message)}
            disabled={sending}
            className="inline-flex items-center gap-2 pl-3.5 pr-4 py-2 rounded-xl bg-gradient-to-r from-primary-400 to-primary-600 text-white font-bold text-sm shadow-lg shadow-primary-500/40 hover:scale-[1.02] active:scale-[0.97] transition-all disabled:opacity-50 disabled:hover:scale-100"
          >
            {sending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <><Send className="w-3.5 h-3.5" /> Inviter tous</>}
          </button>
        </div>
      </div>
    </div>
  )
}
