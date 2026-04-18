import type { RecordingStatus } from '../types/database'

export type RejectionCode =
  | 'too_short'
  | 'too_long'
  | 'low_snr'
  | 'clipping'
  | 'too_much_silence'
  | 'no_speech_detected'
  | 'dc_offset'

interface RejectionInfo {
  label: string
  description: string
  advice: string
}

const rejectionDictionary: Record<RejectionCode, RejectionInfo> = {
  too_short: {
    label: 'Audio trop court',
    description: 'L\'enregistrement est plus court que la durée minimale attendue.',
    advice: 'Lisez la phrase entière sans couper le début ni la fin.',
  },
  too_long: {
    label: 'Audio trop long',
    description: 'L\'enregistrement dépasse la durée maximale autorisée.',
    advice: 'Arrêtez l\'enregistrement juste après la fin de la phrase.',
  },
  low_snr: {
    label: 'Bruit de fond trop élevé',
    description: 'Le rapport signal/bruit est insuffisant pour un dataset utilisable.',
    advice: 'Enregistrez dans un endroit plus calme, proche du micro.',
  },
  clipping: {
    label: 'Saturation du signal',
    description: 'Le volume est trop fort, l\'audio est écrêté (clipping).',
    advice: 'Parlez moins fort ou éloignez-vous légèrement du micro.',
  },
  too_much_silence: {
    label: 'Trop de silence',
    description: 'Une trop grande partie de l\'enregistrement est silencieuse.',
    advice: 'Commencez à parler dès le début et évitez les longues pauses.',
  },
  no_speech_detected: {
    label: 'Aucune parole détectée',
    description: 'Le système n\'a pas détecté de voix dans l\'enregistrement.',
    advice: 'Vérifiez que le micro fonctionne et que vous parlez bien dedans.',
  },
  dc_offset: {
    label: 'Décalage DC détecté',
    description: 'Le signal présente un décalage continu anormal.',
    advice: 'Problème probable de matériel — essayez un autre micro si possible.',
  },
}

export function translateRejectReason(code: string): string {
  return rejectionDictionary[code as RejectionCode]?.label ?? code
}

export function getRejectionInfo(code: string): RejectionInfo | null {
  return rejectionDictionary[code as RejectionCode] ?? null
}

export function translateRejectReasons(codes: string[] | null | undefined): string[] {
  if (!codes || codes.length === 0) return []
  return codes.map(translateRejectReason)
}

const statusDictionary: Record<RecordingStatus, string> = {
  pending: 'En attente',
  processing: 'Analyse en cours',
  completed: 'Traité',
  failed: 'Échec du traitement',
}

export function translateRecordingStatus(status: RecordingStatus): string {
  return statusDictionary[status] ?? status
}
