import { EditableDraftRow } from './editable-draft-row'
import type { PhraseDraft } from '../types/database'

const sans = { fontFamily: 'var(--font-body)', fontFeatureSettings: "'cv01','ss03'" }
const mono = { fontFamily: 'var(--font-mono)' }

interface DraftsTableProps {
  drafts: PhraseDraft[]
  filtered: PhraseDraft[]
  isValidated: boolean
  showSource: boolean
  hasAnySource: boolean
  selected: Set<string>
  search: string
  editingId: string | null
  editingText: string
  savingEdit: boolean
  onToggleSelected: (id: string) => void
  onToggleAll: () => void
  onStartEdit: (d: PhraseDraft) => void
  onCancelEdit: () => void
  onChangeEditingText: (v: string) => void
  onSaveEdit: () => void | Promise<void>
  onAskDelete: (d: PhraseDraft) => void
}

/**
 * Tableau scrollable des drafts avec header + lignes.
 * Layout adaptatif : 1 ou 2 colonnes selon showSource && hasAnySource.
 */
export function DraftsTable({
  drafts,
  filtered,
  isValidated,
  showSource,
  hasAnySource,
  selected,
  search,
  editingId,
  editingText,
  savingEdit,
  onToggleSelected,
  onToggleAll,
  onStartEdit,
  onCancelEdit,
  onChangeEditingText,
  onSaveEdit,
  onAskDelete,
}: DraftsTableProps) {
  const bilingual = showSource && hasAnySource

  return (
    <div
      className="rounded-md overflow-hidden"
      style={{ background: 'var(--t-surface)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div
        className={`grid items-center px-3 h-[36px] border-b text-[11px] text-[#62666d] uppercase ${
          bilingual ? 'grid-cols-[36px_44px_1fr_1fr_72px] gap-3' : 'grid-cols-[36px_44px_1fr_72px]'
        }`}
        style={{
          ...sans,
          fontWeight: 510,
          letterSpacing: '0.04em',
          borderColor: 'rgba(255,255,255,0.08)',
        }}
      >
        {!isValidated ? (
          <input
            type="checkbox"
            checked={filtered.length > 0 && selected.size === filtered.length}
            onChange={onToggleAll}
            className="w-3.5 h-3.5 accent-[#5e6ad2]"
          />
        ) : <span />}
        <span style={mono}>#</span>
        {bilingual ? (
          <>
            <span>Français (source)</span>
            <span>Traduction (à valider)</span>
          </>
        ) : (
          <span>Phrase</span>
        )}
        <span className="text-right">Actions</span>
      </div>

      {filtered.length === 0 && (
        <div className="px-4 py-10 text-center">
          <p className="text-[13px] text-[#8a8f98]" style={sans}>
            {search
              ? 'Aucune phrase ne correspond à votre recherche.'
              : drafts.length === 0
                ? 'Aucune phrase générée pour ce sous-thème.'
                : 'Aucun résultat.'}
          </p>
        </div>
      )}

      {filtered.map((d) => (
        <EditableDraftRow
          key={d.id}
          draft={d}
          isValidated={isValidated}
          showSource={showSource}
          hasAnySource={hasAnySource}
          selected={selected.has(d.id)}
          editingId={editingId}
          editingText={editingText}
          savingEdit={savingEdit}
          onToggleSelected={onToggleSelected}
          onStartEdit={onStartEdit}
          onCancelEdit={onCancelEdit}
          onChangeEditingText={onChangeEditingText}
          onSaveEdit={onSaveEdit}
          onAskDelete={onAskDelete}
        />
      ))}
    </div>
  )
}
