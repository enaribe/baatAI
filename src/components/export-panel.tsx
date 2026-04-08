import { useState } from 'react'
import { Download, Package, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { Button } from './ui/button'
import { Select } from './ui/select'
import { Badge } from './ui/badge'
import { useExports } from '../hooks/use-exports'
import type { Export, ExportFormat } from '../types/database'

interface ExportPanelProps {
  projectId: string
  exports: Export[]
  onExportRequested: () => void
}

const FORMAT_OPTIONS = [
  { value: 'ljspeech', label: 'LJSpeech' },
  { value: 'huggingface', label: 'HuggingFace' },
  { value: 'csv_wav', label: 'CSV + WAV' },
]

const statusLabels: Record<string, string> = {
  pending: 'En attente',
  generating: 'Génération...',
  ready: 'Prêt',
  failed: 'Échec',
}

const statusVariants: Record<string, 'pending' | 'processing' | 'valid' | 'rejected'> = {
  pending: 'pending',
  generating: 'processing',
  ready: 'valid',
  failed: 'rejected',
}

export function ExportPanel({ projectId, exports: exportsList, onExportRequested }: ExportPanelProps) {
  const [format, setFormat] = useState<ExportFormat>('ljspeech')
  const [requesting, setRequesting] = useState(false)
  const { requestExport, downloadExport, downloading, error } = useExports()

  const handleRequest = async () => {
    setRequesting(true)
    await requestExport(projectId, format)
    onExportRequested()
    setRequesting(false)
  }

  const handleDownload = (exp: Export) => {
    if (!exp.storage_path) return
    const fileName = `${exp.format}-${exp.id.slice(0, 8)}.zip`
    downloadExport(exp.storage_path, fileName)
  }

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    if (h > 0) return `${h}h ${m}min`
    return `${m}min`
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Package className="w-5 h-5 text-accent-500" />
        <h3
          className="text-base font-bold text-sand-900 dark:text-sand-100"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Exports
        </h3>
      </div>

      {/* New export */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <Select
            id="export-format"
            value={format}
            onChange={(e) => setFormat(e.target.value as ExportFormat)}
            options={FORMAT_OPTIONS}
          />
        </div>
        <Button
          onClick={handleRequest}
          loading={requesting}
          icon={requesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        >
          Générer l'export
        </Button>
      </div>

      {error && (
        <p className="text-sm text-error mb-4">{error}</p>
      )}

      {/* Exports list */}
      {exportsList.length === 0 ? (
        <p className="text-sm text-sand-400 dark:text-sand-500 py-4 text-center">
          Aucun export. Générez votre premier dataset.
        </p>
      ) : (
        <div className="space-y-2">
          {exportsList.map((exp) => {
            const StatusIcon = exp.status === 'ready'
              ? CheckCircle2
              : exp.status === 'failed'
                ? XCircle
                : Clock

            return (
              <div
                key={exp.id}
                className="flex items-center justify-between bg-white dark:bg-sand-900 rounded-xl border border-sand-200/50 dark:border-sand-800 p-4"
              >
                <div className="flex items-center gap-3">
                  <StatusIcon className={`w-5 h-5 ${
                    exp.status === 'ready' ? 'text-secondary-500' :
                    exp.status === 'failed' ? 'text-red-500' :
                    'text-sand-400'
                  }`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-sand-800 dark:text-sand-200 uppercase">
                        {exp.format}
                      </span>
                      <Badge variant={statusVariants[exp.status]}>
                        {statusLabels[exp.status]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-sand-400">
                      {exp.total_segments != null && (
                        <span>{exp.total_segments} segments</span>
                      )}
                      {exp.total_duration_seconds != null && (
                        <span>{formatDuration(exp.total_duration_seconds)}</span>
                      )}
                      {exp.file_size_bytes != null && (
                        <span>{formatSize(exp.file_size_bytes)}</span>
                      )}
                      <span>
                        {new Date(exp.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {exp.status === 'ready' && exp.storage_path && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDownload(exp)}
                    loading={downloading}
                    icon={<Download className="w-3.5 h-3.5" />}
                  >
                    Télécharger
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
