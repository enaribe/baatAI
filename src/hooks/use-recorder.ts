import { useState, useRef, useCallback } from 'react'

type RecorderState = 'idle' | 'recording' | 'stopped'

interface UseRecorderReturn {
  state: RecorderState
  duration: number
  start: () => Promise<void>
  stop: () => Promise<Blob | null>
  error: string | null
}

export function useRecorder(): UseRecorderReturn {
  const [state, setState] = useState<RecorderState>('idle')
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const timerRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)
  const resolveStop = useRef<((blob: Blob | null) => void) | null>(null)

  const start = useCallback(async () => {
    setError(null)
    setDuration(0)
    chunks.current = []

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000,
        },
      })

      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      })

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.current.push(e.data)
        }
      }

      recorder.onstop = () => {
        // Stop all tracks
        stream.getTracks().forEach((t) => t.stop())
        clearInterval(timerRef.current)

        const blob = new Blob(chunks.current, { type: recorder.mimeType })
        setState('stopped')
        resolveStop.current?.(blob)
        resolveStop.current = null
      }

      recorder.onerror = () => {
        stream.getTracks().forEach((t) => t.stop())
        clearInterval(timerRef.current)
        setError("Erreur lors de l'enregistrement")
        setState('idle')
        resolveStop.current?.(null)
        resolveStop.current = null
      }

      mediaRecorder.current = recorder
      recorder.start(100) // collect data every 100ms
      setState('recording')

      startTimeRef.current = Date.now()
      timerRef.current = window.setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 200)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError("Accès au micro refusé. Autorisez l'accès dans les paramètres de votre navigateur.")
      } else {
        setError("Impossible d'accéder au microphone.")
      }
      setState('idle')
    }
  }, [])

  const stop = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorder.current
      if (!recorder || recorder.state !== 'recording') {
        resolve(null)
        return
      }

      resolveStop.current = resolve
      recorder.stop()
    })
  }, [])

  return { state, duration, start, stop, error }
}
