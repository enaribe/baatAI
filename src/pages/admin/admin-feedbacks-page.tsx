import { useMemo, useState } from 'react'
import {
  Loader2, MessageSquare, AlertTriangle, Check, X, Bug, Lightbulb, Heart, Archive, Eye,
} from 'lucide-react'
import { useFeedbacks, type Feedback, type FeedbackCategory, type FeedbackStatus } from '../../hooks/use-feedbacks'
import { useToast } from '../../hooks/use-toast'
import { supabase } from '../../lib/supabase'

const sans = { fontFamily: 'var(--font-body)', fontFeatureSettings: "'cv01','ss03'" }
const mono = { fontFamily: 'var(--font-mono)' }

function relativeTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'à l\'instant'
  if (mins < 60) return `il y a ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `il y a ${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `il y a ${days} j`
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

const CATEGORY_META: Record<FeedbackCategory, { label: string; color: string; icon: typeof Bug }> = {
  bug: { label: 'Bug', color: '#ef4444', icon: Bug },
  suggestion: { label: 'Suggestion', color: '#fbbf24', icon: Lightbulb },
  praise: { label: 'Compliment', color: '#10b981', icon: Heart },
  other: { label: 'Autre', color: '#7170ff', icon: MessageSquare },
}

const STATUS_META: Record<FeedbackStatus, { label: string; color: string }> = {
  new: { label: 'Nouveau', color: '#7170ff' },
  reviewed: { label: 'Revu', color: '#10b981' },
  archived: { label: 'Archivé', color: '#62666d' },
}

type Filter = 'all' | FeedbackStatus | FeedbackCategory

export function AdminFeedbacksPage() {
  const { feedbacks, loading, error, refetch } = useFeedbacks()
  const { notify } = useToast()
  const [filter, setFilter] = useState<Filter>('new')
  const [selected, setSelected] = useState<Feedback | null>(null)
  const [updating, setUpdating] = useState(false)

  const counts = useMemo(() => ({
    all: feedbacks.length,
    new: feedbacks.filter(f => f.status === 'new').length,
    reviewed: feedbacks.filter(f => f.status === 'reviewed').length,
    archived: feedbacks.filter(f => f.status === 'archived').length,
    bug: feedbacks.filter(f => f.category === 'bug').length,
    suggestion: feedbacks.filter(f => f.category === 'suggestion').length,
    praise: feedbacks.filter(f => f.category === 'praise').length,
    other: feedbacks.filter(f => f.category === 'other').length,
  }), [feedbacks])

  const filtered = useMemo(() => {
    if (filter === 'all') return feedbacks
    if (filter === 'new' || filter === 'reviewed' || filter === 'archived') {
      return feedbacks.filter(f => f.status === filter)
    }
    return feedbacks.filter(f => f.category === filter)
  }, [feedbacks, filter])

  const updateStatus = async (id: string, status: FeedbackStatus, adminNotes?: string) => {
    setUpdating(true)
    try {
      const payload: Record<string, unknown> = { status }
      if (status !== 'new') payload.reviewed_at = new Date().toISOString()
      if (adminNotes !== undefined) payload.admin_notes = adminNotes

      const { error: updErr } = await supabase
        .from('feedbacks')
        .update(payload as never)
        .eq('id', id)
      if (updErr) throw updErr
      notify({ variant: 'success', title: 'Mis à jour', message: `Statut : ${STATUS_META[status].label}` })
      await refetch()
      // Refresh selected si c'est le même
      if (selected?.id === id) {
        setSelected({ ...selected, status, admin_notes: adminNotes ?? selected.admin_notes })
      }
    } catch (err) {
      notify({
        variant: 'error',
        title: 'Mise à jour impossible',
        message: err instanceof Error ? err.message : 'Erreur inconnue',
      })
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="min-h-screen">
      <header
        className="sticky top-0 z-10 flex items-center gap-3 px-5 lg:px-8 h-[52px] backdrop-blur-md flex-wrap"
        style={{
          background: 'var(--t-topbar-bg)',
          borderBottom: '1px solid var(--t-border-subtle)',
        }}
      >
        <MessageSquare className="w-[13px] h-[13px]" strokeWidth={1.75} style={{ color: 'var(--t-fg-3)' }} />
        <span className="text-[13px]" style={{ ...sans, fontWeight: 510, color: 'var(--t-fg)' }}>
          Feedbacks
        </span>
        <span className="text-[11px]" style={{ ...mono, color: 'var(--t-fg-4)' }}>
          {counts.all}
        </span>
      </header>

      <div className="px-5 lg:px-8 py-5">
        {/* Filtres */}
        <div className="flex items-center gap-1.5 mb-4 flex-wrap">
          <FilterChip label={`Nouveaux ${counts.new}`} active={filter === 'new'} onClick={() => setFilter('new')} color="#7170ff" />
          <FilterChip label={`Revus ${counts.reviewed}`} active={filter === 'reviewed'} onClick={() => setFilter('reviewed')} color="#10b981" />
          <FilterChip label={`Archivés ${counts.archived}`} active={filter === 'archived'} onClick={() => setFilter('archived')} color="#62666d" />
          <span className="w-px h-4 bg-[rgba(255,255,255,0.08)] mx-1" />
          <FilterChip label={`Bugs ${counts.bug}`} active={filter === 'bug'} onClick={() => setFilter('bug')} color="#ef4444" />
          <FilterChip label={`Suggestions ${counts.suggestion}`} active={filter === 'suggestion'} onClick={() => setFilter('suggestion')} color="#fbbf24" />
          <FilterChip label={`Compliments ${counts.praise}`} active={filter === 'praise'} onClick={() => setFilter('praise')} color="#10b981" />
          <FilterChip label={`Autres ${counts.other}`} active={filter === 'other'} onClick={() => setFilter('other')} color="#7170ff" />
          <span className="w-px h-4 bg-[rgba(255,255,255,0.08)] mx-1" />
          <FilterChip label={`Tous ${counts.all}`} active={filter === 'all'} onClick={() => setFilter('all')} color="#8a8f98" />
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-[12px] text-[#8a8f98]" style={sans}>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Chargement…
          </div>
        )}

        {error && (
          <div
            className="flex items-start gap-2 px-3 py-2.5 rounded-md text-[12px] text-[#fca5a5] mb-4"
            style={{
              ...sans,
              background: 'var(--t-danger-muted-bg)',
              border: '1px solid var(--t-danger-muted-border)',
            }}
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div
            className="flex flex-col items-center justify-center py-16 px-6 rounded-md text-center"
            style={{
              background: 'var(--t-surface)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <MessageSquare className="w-6 h-6 text-[#62666d] mb-2" strokeWidth={1.5} />
            <p className="text-[13px] text-[#8a8f98]" style={sans}>
              Aucun feedback dans cette catégorie.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {filtered.map((f) => (
            <FeedbackRow key={f.id} feedback={f} onClick={() => setSelected(f)} />
          ))}
        </div>
      </div>

      {selected && (
        <FeedbackDetailModal
          feedback={selected}
          updating={updating}
          onClose={() => setSelected(null)}
          onUpdateStatus={updateStatus}
        />
      )}
    </div>
  )
}

function FilterChip({
  label, active, onClick, color,
}: { label: string; active: boolean; onClick: () => void; color: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 h-[28px] px-2.5 text-[11px] rounded-md transition-colors"
      style={{
        ...sans,
        fontWeight: 510,
        color: active ? '#ffffff' : 'var(--t-fg-2)',
        background: active ? color : 'var(--t-surface)',
        border: `1px solid ${active ? color : 'rgba(255,255,255,0.08)'}`,
      }}
    >
      {label}
    </button>
  )
}

function FeedbackRow({ feedback: f, onClick }: { feedback: Feedback; onClick: () => void }) {
  const cat = CATEGORY_META[f.category]
  const stat = STATUS_META[f.status]
  const Icon = cat.icon

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-start gap-3 p-3 rounded-md text-left transition-colors hover:bg-[rgba(255,255,255,0.02)]"
      style={{
        background: 'var(--t-surface)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div
        className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
        style={{ background: `${cat.color}15`, border: `1px solid ${cat.color}30` }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color: cat.color }} strokeWidth={1.75} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-[10px] uppercase" style={{ ...sans, fontWeight: 590, color: cat.color, letterSpacing: '0.04em' }}>
            {cat.label}
          </span>
          <span className="text-[10px] uppercase" style={{ ...sans, fontWeight: 590, color: stat.color, letterSpacing: '0.04em' }}>
            · {stat.label}
          </span>
          <span className="text-[10px] text-[#62666d]" style={mono}>
            · {relativeTime(f.created_at)}
          </span>
          {f.user_email && (
            <span className="text-[10px] text-[#8a8f98] truncate" style={sans}>
              · {f.user_email}
            </span>
          )}
        </div>
        <p className="text-[13px] text-[#d0d6e0] line-clamp-2 m-0" style={sans}>
          {f.message}
        </p>
      </div>
      <Eye className="w-3.5 h-3.5 text-[#62666d] shrink-0 mt-1" strokeWidth={1.75} />
    </button>
  )
}

function FeedbackDetailModal({
  feedback: f, updating, onClose, onUpdateStatus,
}: {
  feedback: Feedback
  updating: boolean
  onClose: () => void
  onUpdateStatus: (id: string, status: FeedbackStatus, adminNotes?: string) => void | Promise<void>
}) {
  const [adminNotes, setAdminNotes] = useState(f.admin_notes ?? '')
  const cat = CATEGORY_META[f.category]
  const Icon = cat.icon

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.85)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-[560px] max-h-[92dvh] overflow-y-auto"
        style={{
          background: 'var(--t-modal-bg)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 40px 80px -20px rgba(0,0,0,0.8)',
        }}
      >
        <div className="flex items-start gap-3 mb-4">
          <div
            className="w-9 h-9 rounded-md flex items-center justify-center shrink-0"
            style={{ background: `${cat.color}15`, border: `1px solid ${cat.color}30` }}
          >
            <Icon className="w-4 h-4" style={{ color: cat.color }} strokeWidth={1.75} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[15px] text-[#f7f8f8] m-0" style={{ ...sans, fontWeight: 590 }}>
              Feedback {cat.label.toLowerCase()}
            </h2>
            <p className="text-[12px] text-[#8a8f98] mt-1" style={sans}>
              {f.user_email ?? 'Anonyme'} · {f.user_role ?? '?'} · {relativeTime(f.created_at)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
          >
            <X className="w-3.5 h-3.5" strokeWidth={1.75} />
          </button>
        </div>

        <div
          className="p-3 rounded-md mb-4 whitespace-pre-wrap"
          style={{
            ...sans,
            fontSize: '13px',
            color: 'var(--t-fg)',
            background: 'var(--t-surface)',
            border: '1px solid rgba(255,255,255,0.05)',
            lineHeight: 1.5,
          }}
        >
          {f.message}
        </div>

        {f.page_url && (
          <p className="text-[11px] text-[#62666d] mb-2" style={sans}>
            <span className="text-[#8a8f98]">Page :</span> <span style={mono}>{f.page_url}</span>
          </p>
        )}
        {f.user_agent && (
          <p className="text-[11px] text-[#62666d] mb-4 break-all" style={sans}>
            <span className="text-[#8a8f98]">Navigateur :</span> <span style={mono}>{f.user_agent}</span>
          </p>
        )}

        <label className="block text-[12px] text-[#d0d6e0] mb-1.5" style={{ ...sans, fontWeight: 510 }}>
          Notes admin
        </label>
        <textarea
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          placeholder="Notes internes (visibles uniquement par les admins)…"
          rows={3}
          className="w-full px-3 py-2.5 text-[13px] text-[#f7f8f8] placeholder:text-[#62666d] rounded-md bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] focus:outline-none focus:border-[rgba(255,255,255,0.22)] resize-y"
          style={{ ...sans, lineHeight: 1.5 }}
        />

        <div className="flex flex-wrap gap-2 mt-5">
          <button
            type="button"
            onClick={() => onUpdateStatus(f.id, 'reviewed', adminNotes || undefined)}
            disabled={updating}
            className="inline-flex items-center gap-1.5 h-[34px] px-3 text-[12px] rounded-md transition-colors disabled:opacity-40"
            style={{ ...sans, fontWeight: 510, color: '#ffffff', background: '#10b981' }}
          >
            {updating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" strokeWidth={2} />}
            Marquer revu
          </button>
          <button
            type="button"
            onClick={() => onUpdateStatus(f.id, 'archived', adminNotes || undefined)}
            disabled={updating}
            className="inline-flex items-center gap-1.5 h-[34px] px-3 text-[12px] rounded-md text-[#d0d6e0] hover:bg-[rgba(255,255,255,0.04)] transition-colors disabled:opacity-40"
            style={{ ...sans, fontWeight: 510, border: '1px solid rgba(255,255,255,0.15)' }}
          >
            <Archive className="w-3.5 h-3.5" strokeWidth={1.75} />
            Archiver
          </button>
          {f.status !== 'new' && (
            <button
              type="button"
              onClick={() => onUpdateStatus(f.id, 'new', adminNotes || undefined)}
              disabled={updating}
              className="inline-flex items-center gap-1.5 h-[34px] px-3 text-[12px] rounded-md text-[#d0d6e0] hover:bg-[rgba(255,255,255,0.04)] transition-colors disabled:opacity-40 ml-auto"
              style={{ ...sans, fontWeight: 510 }}
            >
              Remettre en nouveau
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
