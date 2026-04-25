import { useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Loader2, Search, Trash2, Pencil, Check, X,
  Sparkles, RefreshCw, AlertCircle, AlertTriangle, Plus, Unlock, Eye, EyeOff,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { usePhraseDrafts } from '../hooks/use-phrase-drafts'
import { useToast } from '../hooks/use-toast'
import { Skeleton } from '../components/ui/skeleton'
import type { PhraseDraft } from '../types/database'

const sans = { fontFamily: 'var(--font-body)', fontFeatureSettings: "'cv01','ss03'" }
const mono = { fontFamily: 'var(--font-mono)' }

export function SubtopicEditPage() {
  const { id: projectId, subId } = useParams<{ id: string; subId: string }>()
  const navigate = useNavigate()
  const { subtopic, drafts, loading, error, refetch } = usePhraseDrafts(subId)
  const { notify } = useToast()

  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const [validating, setValidating] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [extraCount, setExtraCount] = useState(50)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [unvalidating, setUnvalidating] = useState(false)
  const [showUnvalidateModal, setShowUnvalidateModal] = useState(false)
  const [showSource, setShowSource] = useState(true)

  const filtered = useMemo(() => {
    if (!search.trim()) return drafts
    const s = search.toLowerCase()
    return drafts.filter(
      (d) => d.content.toLowerCase().includes(s) || (d.source_text ?? '').toLowerCase().includes(s),
    )
  }, [drafts, search])

  const hasAnySource = useMemo(() => drafts.some((d) => d.source_text), [drafts])

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map((d) => d.id)))
    }
  }

  const startEdit = (d: PhraseDraft) => {
    setEditingId(d.id)
    setEditingText(d.content)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingText('')
  }

  const saveEdit = async () => {
    if (!editingId || !editingText.trim()) return
    try {
      const { error: updErr } = await supabase
        .from('phrase_drafts')
        .update({ content: editingText.trim(), edited: true } as never)
        .eq('id', editingId)
      if (updErr) throw updErr
      cancelEdit()
      await refetch()
    } catch (err) {
      notify({
        variant: 'error',
        title: 'Modification impossible',
        message: err instanceof Error ? err.message : 'Erreur inconnue',
      })
    }
  }

  const deleteOne = async (id: string) => {
    if (!confirm('Supprimer cette phrase ?')) return
    try {
      const { error: delErr } = await supabase.from('phrase_drafts').delete().eq('id', id)
      if (delErr) throw delErr
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      await refetch()
    } catch (err) {
      notify({
        variant: 'error',
        title: 'Suppression impossible',
        message: err instanceof Error ? err.message : 'Erreur inconnue',
      })
    }
  }

  const deleteSelected = async () => {
    if (selected.size === 0) return
    if (!confirm(`Supprimer ${selected.size} phrase(s) sélectionnée(s) ?`)) return
    setBulkDeleting(true)
    try {
      const { error: delErr } = await supabase
        .from('phrase_drafts')
        .delete()
        .in('id', Array.from(selected))
      if (delErr) throw delErr
      setSelected(new Set())
      notify({ variant: 'success', title: 'Phrases supprimées', message: `${selected.size} entrées` })
      await refetch()
    } catch (err) {
      notify({
        variant: 'error',
        title: 'Suppression impossible',
        message: err instanceof Error ? err.message : 'Erreur inconnue',
      })
    } finally {
      setBulkDeleting(false)
    }
  }

  const generateMore = async () => {
    if (!subId || extraCount < 10) return
    setGenerating(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Session expirée, reconnectez-vous.')
      const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-subtopic-phrases`
      const res = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subtopic_id: subId, mode: 'append', extra_count: extraCount }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erreur de génération')
      notify({
        variant: 'success',
        title: 'Phrases ajoutées',
        message: `${json.data.generated} nouvelles phrases.`,
      })
      await refetch()
    } catch (err) {
      notify({
        variant: 'error',
        title: 'Génération impossible',
        message: err instanceof Error ? err.message : 'Erreur inconnue',
      })
    } finally {
      setGenerating(false)
    }
  }

  const regenerateAll = async () => {
    if (!subId) return
    setGenerating(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Session expirée, reconnectez-vous.')
      const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-subtopic-phrases`
      const res = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subtopic_id: subId, mode: 'replace' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erreur de génération')
      notify({
        variant: 'success',
        title: 'Phrases régénérées',
        message: `${json.data.generated} nouvelles phrases.`,
      })
      await refetch()
    } catch (err) {
      notify({
        variant: 'error',
        title: 'Régénération impossible',
        message: err instanceof Error ? err.message : 'Erreur inconnue',
      })
    } finally {
      setGenerating(false)
    }
  }

  const handleUnvalidate = useCallback(async () => {
    if (!subId) return
    setUnvalidating(true)
    try {
      const { data, error: rpcErr } = await (supabase as unknown as {
        rpc: (fn: string, args: Record<string, unknown>) => Promise<{
          data: number | null
          error: { message: string } | null
        }>
      }).rpc('unvalidate_subtopic', { p_subtopic_id: subId })

      if (rpcErr) {
        // Cas garde-fou : recordings existants
        if (rpcErr.message.includes('has_recordings')) {
          notify({
            variant: 'error',
            title: 'Dévalidation bloquée',
            message: rpcErr.message.replace(/^.*has_recordings:\s*/i, ''),
          })
        } else {
          throw new Error(rpcErr.message)
        }
        return
      }

      notify({
        variant: 'success',
        title: 'Sous-thème dévalidé',
        message: `${data ?? 0} phrases retirées du projet. Vous pouvez à nouveau modifier.`,
      })
      setShowUnvalidateModal(false)
      await refetch()
    } catch (err) {
      notify({
        variant: 'error',
        title: 'Dévalidation impossible',
        message: err instanceof Error ? err.message : 'Erreur inconnue',
      })
    } finally {
      setUnvalidating(false)
    }
  }, [subId, notify, refetch])

  const validate = useCallback(async () => {
    if (!subId) return
    setValidating(true)
    try {
      const { data, error: rpcErr } = await (supabase as unknown as {
        rpc: (fn: string, args: Record<string, unknown>) => Promise<{
          data: number | null
          error: { message: string } | null
        }>
      }).rpc('validate_subtopic', { p_subtopic_id: subId })

      if (rpcErr) throw new Error(rpcErr.message)

      notify({
        variant: 'success',
        title: 'Sous-thème validé',
        message: `${data ?? 0} phrases ajoutées au projet.`,
      })
      navigate(`/project/${projectId}?tab=phrases`)
    } catch (err) {
      notify({
        variant: 'error',
        title: 'Validation impossible',
        message: err instanceof Error ? err.message : 'Erreur inconnue',
      })
    } finally {
      setValidating(false)
    }
  }, [subId, projectId, navigate, notify])

  if (loading) {
    return (
      <div className="px-5 lg:px-8 py-10">
        <Skeleton className="h-5 w-32 mb-4" />
        <Skeleton className="h-10 w-96 mb-6" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (error || !subtopic) {
    return (
      <div className="px-5 lg:px-8 py-10">
        <Link
          to={`/project/${projectId}?tab=phrases`}
          className="inline-flex items-center gap-1.5 text-[12px] text-[#8a8f98] hover:text-[#f7f8f8] transition-colors mb-6"
          style={sans}
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
          Retour au projet
        </Link>
        <div
          className="flex items-start gap-2 px-3 py-2.5 rounded-md text-[12px] text-[#fca5a5]"
          style={{
            ...sans,
            background: 'var(--t-danger-muted-bg)',
            border: '1px solid var(--t-danger-muted-border)',
          }}
        >
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{error || 'Sous-thème introuvable'}</span>
        </div>
      </div>
    )
  }

  const isValidated = subtopic.status === 'validated'

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-10 flex items-center gap-3 px-5 lg:px-8 h-[52px] border-b border-[rgba(255,255,255,0.05)] bg-[rgba(8,9,10,0.9)] backdrop-blur-md">
        <Link
          to={`/project/${projectId}?tab=phrases`}
          className="inline-flex items-center gap-1.5 text-[12px] text-[#8a8f98] hover:text-[#f7f8f8] transition-colors"
          style={sans}
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
          Projet
        </Link>
        <span className="text-[#3e3e44]">/</span>
        <Sparkles className="w-3.5 h-3.5 text-[#7170ff]" strokeWidth={1.75} />
        <span className="text-[13px] text-[#f7f8f8] truncate" style={{ ...sans, fontWeight: 510 }}>
          {subtopic.title}
        </span>
        <span className="text-[11px] text-[#62666d]" style={mono}>
          {drafts.length}/{subtopic.target_count}
        </span>
      </header>

      <div className="px-5 lg:px-8 py-7 max-w-[960px] mx-auto">
        {/* Hero */}
        <div className="mb-6">
          <h1
            className="text-[24px] text-[#f7f8f8] m-0"
            style={{ ...sans, fontWeight: 510, lineHeight: 1.2, letterSpacing: '-0.3px' }}
          >
            {subtopic.title}
          </h1>
          {subtopic.description && (
            <p className="text-[14px] text-[#8a8f98] mt-2 max-w-[70ch]" style={sans}>
              {subtopic.description}
            </p>
          )}
        </div>

        {isValidated && (
          <div
            className="flex items-start gap-3 px-3 py-3 rounded-md text-[12px] mb-5"
            style={{
              ...sans,
              background: 'rgba(16,185,129,0.06)',
              border: '1px solid rgba(16,185,129,0.18)',
            }}
          >
            <Check className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#10b981]" strokeWidth={2} />
            <div className="flex-1">
              <p className="text-[#10b981] m-0" style={{ ...sans, fontWeight: 510 }}>
                Sous-thème validé · phrases ajoutées au projet
              </p>
              <p className="text-[#8a8f98] mt-1 leading-relaxed" style={sans}>
                Pour modifier, vous devez dévalider. Cela retire les phrases du projet et les remet en mode édition. Bloqué si des enregistrements existent déjà.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowUnvalidateModal(true)}
              className="inline-flex items-center gap-1.5 h-[28px] px-2.5 text-[12px] rounded-md transition-colors shrink-0"
              style={{
                ...sans,
                fontWeight: 510,
                color: '#d0d6e0',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            >
              <Unlock className="w-3 h-3" strokeWidth={1.75} />
              Dévalider
            </button>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#62666d]" strokeWidth={1.75} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher dans les phrases…"
              className="w-full h-[34px] pl-8 pr-3 text-[13px] text-[#f7f8f8] placeholder:text-[#62666d] rounded-md bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] focus:outline-none focus:border-[rgba(255,255,255,0.22)]"
              style={sans}
            />
          </div>
          {hasAnySource && (
            <button
              type="button"
              onClick={() => setShowSource((v) => !v)}
              title={showSource ? 'Masquer les phrases françaises' : 'Afficher les phrases françaises'}
              className="inline-flex items-center gap-1.5 h-[34px] px-3 text-[12px] rounded-md text-[#d0d6e0] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
              style={{
                ...sans,
                fontWeight: 510,
                background: showSource ? 'rgba(113,112,255,0.06)' : 'var(--t-surface)',
                border: `1px solid ${showSource ? 'rgba(113,112,255,0.25)' : 'rgba(255,255,255,0.08)'}`,
              }}
            >
              {showSource ? <Eye className="w-3 h-3" strokeWidth={1.75} /> : <EyeOff className="w-3 h-3" strokeWidth={1.75} />}
              <span className="hidden sm:inline">Source FR</span>
            </button>
          )}
          {!isValidated && selected.size > 0 && (
            <button
              type="button"
              onClick={deleteSelected}
              disabled={bulkDeleting}
              className="inline-flex items-center gap-1.5 h-[34px] px-3 text-[12px] rounded-md transition-colors disabled:opacity-40"
              style={{
                ...sans,
                fontWeight: 510,
                color: 'var(--t-danger-text)',
                background: 'var(--t-danger-muted-bg)',
                border: '1px solid var(--t-danger-muted-border)',
              }}
            >
              {bulkDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" strokeWidth={1.75} />}
              Supprimer ({selected.size})
            </button>
          )}
        </div>

        {/* Table */}
        <div
          className="rounded-md overflow-hidden"
          style={{ background: 'var(--t-surface)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {/* Header table */}
          <div
            className={`grid items-center px-3 h-[36px] border-b text-[11px] text-[#62666d] uppercase ${
              showSource && hasAnySource
                ? 'grid-cols-[36px_44px_1fr_1fr_72px] gap-3'
                : 'grid-cols-[36px_44px_1fr_72px]'
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
                onChange={toggleAll}
                className="w-3.5 h-3.5 accent-[#5e6ad2]"
              />
            ) : <span />}
            <span style={mono}>#</span>
            {showSource && hasAnySource ? (
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
                {search ? 'Aucune phrase ne correspond à votre recherche.' : 'Aucune phrase générée pour ce sous-thème.'}
              </p>
            </div>
          )}

          {filtered.map((d) => (
            <div
              key={d.id}
              className={`grid items-start px-3 py-2.5 border-b last:border-b-0 ${
                showSource && hasAnySource
                  ? 'grid-cols-[36px_44px_1fr_1fr_72px] gap-3'
                  : 'grid-cols-[36px_44px_1fr_72px] items-center'
              }`}
              style={{ borderColor: 'rgba(255,255,255,0.04)' }}
            >
              {!isValidated ? (
                <input
                  type="checkbox"
                  checked={selected.has(d.id)}
                  onChange={() => toggleSelected(d.id)}
                  className={`w-3.5 h-3.5 accent-[#5e6ad2] ${showSource && hasAnySource ? 'mt-1' : ''}`}
                />
              ) : <span />}
              <span
                className={`text-[11px] text-[#62666d] tabular-nums ${showSource && hasAnySource ? 'mt-0.5' : ''}`}
                style={mono}
              >
                {d.position}
              </span>

              {/* Cellule source FR (visible uniquement si toggle ON) */}
              {showSource && hasAnySource && (
                <span
                  className="text-[12px] text-[#8a8f98] italic leading-relaxed break-words"
                  style={sans}
                >
                  {d.source_text || <span className="text-[#3e3e44]">—</span>}
                </span>
              )}

              {/* Cellule traduction WO (éditable) */}
              {editingId === d.id ? (
                <input
                  type="text"
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void saveEdit()
                    if (e.key === 'Escape') cancelEdit()
                  }}
                  className="w-full h-[28px] px-2 text-[13px] text-[#f7f8f8] rounded bg-[rgba(255,255,255,0.05)] border border-[rgba(113,112,255,0.4)] focus:outline-none"
                  style={sans}
                />
              ) : showSource && hasAnySource ? (
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
                      onClick={saveEdit}
                      className="w-7 h-7 flex items-center justify-center rounded text-[#10b981] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="w-7 h-7 flex items-center justify-center rounded text-[#8a8f98] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
                    >
                      <X className="w-3.5 h-3.5" strokeWidth={1.75} />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => startEdit(d)}
                      className="w-7 h-7 flex items-center justify-center rounded text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
                      title="Modifier"
                    >
                      <Pencil className="w-3 h-3" strokeWidth={1.75} />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteOne(d.id)}
                      className="w-7 h-7 flex items-center justify-center rounded text-[#8a8f98] hover:text-[#fca5a5] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3 h-3" strokeWidth={1.75} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer actions */}
        {!isValidated && (
          <div className="mt-6 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={10}
                max={500}
                step={10}
                value={extraCount}
                onChange={(e) => setExtraCount(parseInt(e.target.value, 10) || 0)}
                className="w-[80px] h-[34px] px-2 text-[13px] text-[#f7f8f8] rounded-md bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] focus:outline-none focus:border-[rgba(255,255,255,0.22)] tabular-nums text-center"
                style={sans}
              />
              <button
                type="button"
                onClick={generateMore}
                disabled={generating || extraCount < 10}
                className="inline-flex items-center gap-1.5 h-[34px] px-3 text-[12px] rounded-md text-[#d0d6e0] hover:bg-[rgba(255,255,255,0.04)] transition-colors disabled:opacity-40"
                style={{
                  ...sans,
                  fontWeight: 510,
                  border: '1px solid rgba(255,255,255,0.15)',
                }}
              >
                {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" strokeWidth={1.75} />}
                Générer en plus
              </button>
            </div>

            <div className="ml-auto flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Régénérer toutes les phrases ? Les ${drafts.length} phrases actuelles seront supprimées.`)) {
                    void regenerateAll()
                  }
                }}
                disabled={generating}
                className="inline-flex items-center gap-1.5 h-[34px] px-3 text-[12px] rounded-md text-[#d0d6e0] hover:bg-[rgba(255,255,255,0.04)] transition-colors disabled:opacity-40"
                style={{ ...sans, fontWeight: 510 }}
              >
                <RefreshCw className="w-3 h-3" strokeWidth={1.75} />
                Tout régénérer
              </button>
              <button
                type="button"
                onClick={validate}
                disabled={validating || drafts.length === 0}
                className="inline-flex items-center gap-1.5 h-[34px] px-4 text-[12px] rounded-md transition-colors disabled:opacity-40"
                style={{
                  ...sans,
                  fontWeight: 510,
                  color: '#ffffff',
                  background: '#5e6ad2',
                }}
              >
                {validating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" strokeWidth={2} />}
                Valider ce sous-thème
              </button>
            </div>
          </div>
        )}
      </div>

      {showUnvalidateModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ background: 'rgba(0,0,0,0.85)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowUnvalidateModal(false) }}
        >
          <div
            className="rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-[460px] max-h-[92dvh] overflow-y-auto"
            style={{
              background: 'var(--t-surface-2)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div className="flex items-start gap-3 mb-4">
              <div
                className="w-9 h-9 rounded-md flex items-center justify-center shrink-0"
                style={{
                  background: 'rgba(251,191,36,0.08)',
                  border: '1px solid rgba(251,191,36,0.25)',
                }}
              >
                <AlertTriangle className="w-4 h-4 text-[#fbbf24]" strokeWidth={1.75} />
              </div>
              <div className="flex-1">
                <h2 className="text-[15px] text-[#f7f8f8] m-0" style={{ ...sans, fontWeight: 590 }}>
                  Dévalider ce sous-thème ?
                </h2>
                <p className="text-[12px] text-[#8a8f98] mt-1" style={sans}>
                  Les phrases seront retirées du projet.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 mb-4">
              <p className="text-[13px] text-[#d0d6e0]" style={sans}>
                Cette action va :
              </p>
              <ul className="text-[12px] text-[#8a8f98] flex flex-col gap-1 pl-4 list-disc" style={sans}>
                <li>Retirer les {drafts.length} phrases du projet</li>
                <li>Repasser le sous-thème en mode édition</li>
                <li>Échouer si des locuteurs ont déjà enregistré ces phrases</li>
              </ul>
              <p className="text-[12px] text-[#62666d] mt-1" style={sans}>
                Vous pourrez ensuite éditer, régénérer puis re-valider.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowUnvalidateModal(false)}
                disabled={unvalidating}
                className="flex-1 h-[34px] text-[13px] rounded-md text-[#d0d6e0] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
                style={{ ...sans, fontWeight: 510 }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleUnvalidate}
                disabled={unvalidating}
                className="flex-1 inline-flex items-center justify-center gap-1.5 h-[34px] text-[13px] rounded-md transition-colors disabled:opacity-40"
                style={{
                  ...sans,
                  fontWeight: 510,
                  color: '#ffffff',
                  background: '#fbbf24',
                }}
              >
                {unvalidating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlock className="w-3.5 h-3.5" strokeWidth={1.75} />}
                Dévalider
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

}

void AlertCircle
