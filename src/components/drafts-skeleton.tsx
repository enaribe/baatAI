import { Skeleton } from './ui/skeleton'

const sans = { fontFamily: 'var(--font-body)', fontFeatureSettings: "'cv01','ss03'" }
const mono = { fontFamily: 'var(--font-mono)' }

interface DraftsSkeletonProps {
  /** Nombre de lignes à afficher (défaut 8) */
  rows?: number
  /** Si true, simule la double colonne FR/WO */
  bilingual?: boolean
}

/**
 * Skeleton qui simule la table des drafts d'un sous-thème.
 * Plus représentatif qu'un Skeleton générique : le user voit immédiatement
 * la structure tabulaire qui va apparaître.
 */
export function DraftsSkeleton({ rows = 8, bilingual = true }: DraftsSkeletonProps) {
  return (
    <div
      className="rounded-md overflow-hidden"
      style={{ background: 'var(--t-surface)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {/* Header */}
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
        <span />
        <span style={mono}>#</span>
        {bilingual ? (
          <>
            <span>Source</span>
            <span>Traduction</span>
          </>
        ) : (
          <span>Phrase</span>
        )}
        <span className="text-right">Actions</span>
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={`grid items-center px-3 py-2.5 border-b last:border-b-0 ${
            bilingual ? 'grid-cols-[36px_44px_1fr_1fr_72px] gap-3' : 'grid-cols-[36px_44px_1fr_72px]'
          }`}
          style={{ borderColor: 'rgba(255,255,255,0.04)' }}
        >
          <Skeleton className="w-3.5 h-3.5" />
          <Skeleton className="w-6 h-3" />
          <Skeleton className={`h-3 ${i % 3 === 0 ? 'w-[60%]' : i % 3 === 1 ? 'w-[85%]' : 'w-[75%]'}`} />
          {bilingual && (
            <Skeleton className={`h-3 ${i % 3 === 0 ? 'w-[70%]' : i % 3 === 1 ? 'w-[55%]' : 'w-[80%]'}`} />
          )}
          <div className="flex items-center justify-end gap-0.5">
            <Skeleton className="w-5 h-5" />
            <Skeleton className="w-5 h-5" />
          </div>
        </div>
      ))}
    </div>
  )
}
