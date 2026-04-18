import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { ExportFormat } from '../types/database'

export interface ExportFilters {
  min_snr_db?: number
}

interface UseExportsReturn {
  requestExport: (projectId: string, format: ExportFormat, filters?: ExportFilters) => Promise<void>
  downloading: boolean
  downloadExport: (storagePath: string, fileName: string) => Promise<void>
  error: string | null
}

export function useExports(): UseExportsReturn {
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  const requestExport = useCallback(
    async (projectId: string, format: ExportFormat, filters: ExportFilters = {}) => {
      setError(null)
      try {
        const { error: insertError } = await supabase
          .from('exports')
          .insert({
            project_id: projectId,
            format,
            filters_applied: filters,
          } as never)

        if (insertError) throw insertError
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur lors de la demande d'export"
        setError(message)
        console.error('requestExport error:', err)
      }
    },
    [],
  )

  const downloadExport = useCallback(async (storagePath: string, fileName: string) => {
    setDownloading(true)
    setError(null)
    try {
      const { data, error: dlError } = await supabase.storage
        .from('exports')
        .download(storagePath)

      if (dlError) throw dlError
      if (!data) throw new Error('Aucun fichier reçu')

      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du téléchargement'
      setError(message)
      console.error('downloadExport error:', err)
    } finally {
      setDownloading(false)
    }
  }, [])

  return { requestExport, downloading, downloadExport, error }
}
