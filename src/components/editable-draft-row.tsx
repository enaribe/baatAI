import { Pencil, Trash2, Check, X } from 'lucide-react'
import type { PhraseDraft } from '../types/database'

const sans = { fontFamily: 'var(--font-body)', fontFeatureSettings: "'cv01','ss03'" }
const mono = { fontFamily: 'var(--font-mono)' }

interface EditableDraftRowProps {
  draft: PhraseDraft
  isValidated: boolean
  showSource: boolean
  hasAnySource: boolean
  selected: boolean
  editingId: string | null
  editingText: string
  savingEdit: boolean
  onToggleSelected: (id: string) => void
  onStartEdit: (d: PhraseDraft) => void
  onCancelEdit: () => void
  onChangeEditingText: (v: string) => void
  onSaveEdit: () => void | Promise<void>
  onAskDelete: (d: PhraseDraft) => void
}

/**
 * Une ligne de la table des drafts d'un sous-thème.
 * Affichage adaptatif : 2 colonnes (FR/WO) si bilingue, 1 sinon.
 * Édition inline du content (jamais du source_text).
 */
export function EditableDraftRow({
  draft: d,
  isValidated,
  showSource,
  hasAnySource,
  selected,
  editingId,
  editingText,
  savingEdit,
  onToggleSelected,
  onStartEdit,
  onCancelEdit,
  onChangeEditingText,
  onSaveEdit,
  onAskDelete,
}: EditableDraftRowProps) {
  const bilingual = showSource && hasAnySource

  return (
    <div
      className={`grid items-start px-3 py-2.5 border-b last:border-b-0 ${
        bilingual
          ? 'grid-cols-[36px_44px_1fr_1fr_72px] gap-3'
          : 'grid-cols-[36px_44px_1fr_72px] items-center'
      }`}
      style={{ borderColor: 'rgba(255,255,255,0.04)' }}
    >
      {!isValidated ? (
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelected(d.id)}
          className={`w-3.5 h-3.5 accent-[#5e6ad2] ${bilingual ? 'mt-1' : ''}`}
        />
      ) : <span />}

      <span
        className={`text-[11px] text-[#62666d] tabular-nums ${bilingual ? 'mt-0.5' : ''}`}
        style={mono}
      >
        {d.position}
      </span>

      {bilingual && (
        <span
          className="text-[12px] text-[#8a8f98] italic leading-relaxed break-words"
          style={sans}
        >
          {d.source_text || <span className="text-[#3e3e44]">—</span>}
        </span>
      )}

      {editingId === d.id ? (
        <input
          type="text"
          value={editingText}
          onChange={(e) => onChangeEditingText(e.target.value)}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') void onSaveEdit()
            if (e.key === 'Escape') onCancelEdit()
          }}
          className="w-full h-[28px] px-2 text-[13px] text-[#f7f8f8] rounded bg-[rgba(255,255,255,0.05)] border border-[rgba(113,112,255,0.4)] focus:outline-none"
          style={sans}
        />
      ) : bilingual ? (
        <span className="text-[13px] text-[#f7f8f8] leading-relaxed break-words flex items-start gap-2" style={sans}>
          <span>{d.content}</span>
          {d.edited && (
            <span className="text-[9px] text-[#62666d] uppercase shrink-0 mt-0.5" style={{ ...sans, letterSpacing: '0.04em' }}>
              modifié
            </span>
          )}
        </span>
      ) : (
        <div className="flex flex-col gap-0.5 min-w-0">
          {d.source_text && (
            <span
              className="text-[11px] text-[#62666d] italic truncate"
              style={sans}
              title={d.source_text}
            >
              {d.source_text}
            </span>
          )}
          <span className="text-[13px] text-[#f7f8f8] flex items-center gap-2" style={sans}>
            {d.content}
            {d.edited && (
              <span className="text-[9px] text-[#62666d] uppercase" style={{ ...sans, letterSpacing: '0.04em' }}>
                modifié
              </span>
            )}
          </span>
        </div>
      )}

      <div className="flex items-center justify-end gap-0.5">
        {isValidated ? null : editingId === d.id ? (
          <>
            <button
              type="button"
              onClick={() => void onSaveEdit()}
              className="w-7 h-7 flex items-center justify-center rounded text-[#10b981] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
            >
              <Check className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={onCancelEdit}
              className="w-7 h-7 flex items-center justify-center rounded text-[#8a8f98] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
            >
              <X className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onStartEdit(d)}
              disabled={savingEdit}
              className="w-7 h-7 flex items-center justify-center rounded text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[rgba(255,255,255,0.04)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title={savingEdit ? 'Une autre modification est en cours' : 'Modifier'}
            >
              <Pencil className="w-3 h-3" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={() => onAskDelete(d)}
              disabled={savingEdit}
              className="w-7 h-7 flex items-center justify-center rounded text-[#8a8f98] hover:text-[#fca5a5] hover:bg-[rgba(255,255,255,0.04)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Supprimer"
            >
              <Trash2 className="w-3 h-3" strokeWidth={1.75} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
