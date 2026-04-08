import * as tus from 'tus-js-client'
import { supabase } from './supabase'

interface UploadOptions {
  bucketName: string
  filePath: string
  file: File | Blob
  onProgress?: (percentage: number) => void
  onSuccess?: () => void
  onError?: (error: Error) => void
}

export function uploadFile({ bucketName, filePath, file, onProgress, onSuccess, onError }: UploadOptions) {
  const projectUrl = import.meta.env.VITE_SUPABASE_URL as string

  return supabase.auth.getSession().then(({ data: { session } }) => {
    const upload = new tus.Upload(file, {
      endpoint: `${projectUrl}/storage/v1/upload/resumable`,
      retryDelays: [0, 1000, 3000, 5000],
      chunkSize: 6 * 1024 * 1024, // 6 MB
      headers: {
        authorization: `Bearer ${session?.access_token ?? ''}`,
        'x-upsert': 'false',
      },
      uploadDataDuringCreation: false,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName,
        objectName: filePath,
        contentType: file.type || 'audio/webm',
        cacheControl: '3600',
      },
      onError: (error) => {
        onError?.(error instanceof Error ? error : new Error(String(error)))
      },
      onProgress: (bytesUploaded, bytesTotal) => {
        const percentage = (bytesUploaded / bytesTotal) * 100
        onProgress?.(percentage)
      },
      onSuccess: () => {
        onSuccess?.()
      },
    })

    upload.findPreviousUploads().then((previousUploads) => {
      const lastUpload = previousUploads[0]
      if (lastUpload) {
        upload.resumeFromPreviousUpload(lastUpload)
      }
      upload.start()
    })

    return upload
  })
}
