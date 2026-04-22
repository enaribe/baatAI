import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface UploadSampleParams {
  blob: Blob
  durationSeconds: number
  speakerId: string
}

interface UseSpeakerSampleResult {
  uploading: boolean
  progress: number
  error: string | null
  upload: (params: UploadSampleParams) => Promise<{ path: string } | null>
  remove: (speakerId: string, currentPath: string | null) => Promise<boolean>
  getPublicUrl: (path: string) => string
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

/**
 * Upload et gestion de l'échantillon de voix d'un locuteur.
 * - Upload via TUS resumable dans le bucket public `speaker-samples`
 * - Persiste path + durée dans speaker_profiles
 * - Remplace le sample existant s'il y en a un (path fixe par speaker)
 */
export function useSpeakerSample(): UseSpeakerSampleResult {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const upload = useCallback(async ({
    blob, durationSeconds, speakerId,
  }: UploadSampleParams): Promise<{ path: string } | null> => {
    setUploading(true)
    setProgress(0)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Session expirée')

      // Path fixe par speaker → upsert pour remplacer l'ancien sample
      const storagePath = `${speakerId}/sample.webm`
      const tus = await import('tus-js-client')

      await new Promise<void>((resolve, reject) => {
        const up = new tus.Upload(blob, {
          endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
          retryDelays: [0, 1000, 3000, 5000],
          chunkSize: 6 * 1024 * 1024,
          headers: {
            authorization: `Bearer ${session.access_token}`,
            apikey: supabaseAnonKey,
            'x-upsert': 'true',
          },
          uploadDataDuringCreation: true,
          removeFingerprintOnSuccess: true,
          metadata: {
            bucketName: 'speaker-samples',
            objectName: storagePath,
            contentType: 'audio/webm',
            cacheControl: '3600',
          },
          onError: reject,
          onProgress: (u, t) => setProgress(Math.round((u / t) * 100)),
          onSuccess: () => resolve(),
        })
        up.start()
      })

      // Met à jour speaker_profiles
      const { error: updateErr } = await (supabase
        .from('speaker_profiles')
        .update({
          sample_storage_path: storagePath,
          sample_duration_seconds: durationSeconds,
          sample_recorded_at: new Date().toISOString(),
        } as unknown as never)
        .eq('id', speakerId) as unknown as Promise<{ error: { message: string } | null }>)

      if (updateErr) throw new Error(updateErr.message)

      setUploading(false)
      setProgress(100)
      return { path: storagePath }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d'envoi")
      setUploading(false)
      return null
    }
  }, [])

  const remove = useCallback(async (speakerId: string, currentPath: string | null): Promise<boolean> => {
    setError(null)
    try {
      if (currentPath) {
        await supabase.storage.from('speaker-samples').remove([currentPath])
      }

      const { error: updateErr } = await (supabase
        .from('speaker_profiles')
        .update({
          sample_storage_path: null,
          sample_duration_seconds: null,
          sample_recorded_at: null,
        } as unknown as never)
        .eq('id', speakerId) as unknown as Promise<{ error: { message: string } | null }>)

      if (updateErr) throw new Error(updateErr.message)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression')
      return false
    }
  }, [])

  const getPublicUrl = useCallback((path: string): string => {
    // Bucket public : URL directe, ajoutée du timestamp du fichier en query
    // pour bust cache quand le sample est ré-enregistré.
    const { data } = supabase.storage.from('speaker-samples').getPublicUrl(path)
    return data.publicUrl
  }, [])

  return { uploading, progress, error, upload, remove, getPublicUrl }
}
