import { Mic, Volume2, VolumeX, CheckCircle2 } from 'lucide-react'

const sans = { fontFamily: 'var(--font-body)', fontFeatureSettings: "'cv01','ss03'" }

interface RecordingTipsModalProps {
  open: boolean
  /** Type d'usage du projet : conditionne les conseils */
  usageType: 'asr' | 'tts' | 'both' | null
  /** Nom du projet à afficher en titre */
  projectName: string | null
  onContinue: () => void
}

/**
 * Modal d'accueil affichée au tout début d'une session d'enregistrement.
 * Donne au locuteur les conseils adaptés au type de dataset (ASR vs TTS).
 *
 * - ASR : enregistrements naturels, contextes variés OK (bruit léger ambiant)
 * - TTS : voix isolée, environnement très calme strict
 */
export function RecordingTipsModal({ open, usageType, projectName, onContinue }: RecordingTipsModalProps) {
  if (!open) return null

  const isTTS = usageType === 'tts'
  const isASR = usageType === 'asr' || usageType === 'both'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.92)' }}
    >
      <div
        className="rounded-t-2xl sm:rounded-2xl w-full max-w-[480px] max-h-[92dvh] overflow-y-auto"
        style={{
          background: 'var(--t-modal-bg)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 40px 80px -20px rgba(0,0,0,0.8)',
        }}
      >
        <div className="p-6 pb-4">
          <div
            className="w-10 h-10 rounded-md flex items-center justify-center mb-4"
            style={{
              background: 'rgba(113,112,255,0.08)',
              border: '1px solid rgba(113,112,255,0.25)',
            }}
          >
            <Mic className="w-5 h-5" style={{ color: '#7170ff' }} strokeWidth={1.75} />
          </div>

          <h2
            className="text-[18px] text-[#f7f8f8] m-0"
            style={{ ...sans, fontWeight: 590, letterSpacing: '-0.2px' }}
          >
            Avant de commencer
          </h2>
          {projectName && (
            <p className="text-[13px] text-[#8a8f98] mt-1" style={sans}>
              {projectName}
            </p>
          )}
        </div>

        <div className="px-6 pb-6 flex flex-col gap-3">
          {isTTS && (
            <>
              <Tip
                icon={<VolumeX className="w-4 h-4 text-[#fbbf24]" strokeWidth={1.75} />}
                title="Trouvez un endroit très calme"
                desc="Aucun bruit de fond, ventilateur, télé ou conversation autour. Le silence est essentiel pour la synthèse vocale."
              />
              <Tip
                icon={<Mic className="w-4 h-4 text-[#7170ff]" strokeWidth={1.75} />}
                title="Parlez clairement et naturellement"
                desc="Articulez bien, à un rythme normal. Tenez le téléphone à 15-20 cm de votre bouche."
              />
              <Tip
                icon={<CheckCircle2 className="w-4 h-4 text-[#10b981]" strokeWidth={1.75} />}
                title="Réécoutez chaque phrase"
                desc="Si vous entendez du bruit, un bafouillage ou un mot mal prononcé, refaites l'enregistrement."
              />
            </>
          )}

          {isASR && !isTTS && (
            <>
              <Tip
                icon={<Volume2 className="w-4 h-4 text-[#10b981]" strokeWidth={1.75} />}
                title="Enregistrez dans des contextes variés"
                desc="Pas besoin d'un studio : la maison, un café, la rue (sans bruit fort), c'est même mieux pour la reconnaissance vocale."
              />
              <Tip
                icon={<Mic className="w-4 h-4 text-[#7170ff]" strokeWidth={1.75} />}
                title="Parlez naturellement"
                desc="Comme dans la vraie vie. N'articulez pas exagérément, ne forcez pas votre voix."
              />
              <Tip
                icon={<VolumeX className="w-4 h-4 text-[#fbbf24]" strokeWidth={1.75} />}
                title="Évitez quand même les bruits trop forts"
                desc="Pas de marteau-piqueur, pas de musique forte, pas de moto qui passe juste à côté. Un fond ambiant léger est OK."
              />
            </>
          )}

          {!isTTS && !isASR && (
            <Tip
              icon={<Mic className="w-4 h-4 text-[#7170ff]" strokeWidth={1.75} />}
              title="Parlez clairement"
              desc="Tenez le téléphone à 15-20 cm de votre bouche, dans un endroit raisonnablement calme."
            />
          )}
        </div>

        <div
          className="px-6 py-4 border-t"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}
        >
          <button
            type="button"
            onClick={onContinue}
            className="w-full h-[44px] text-[14px] rounded-md transition-colors"
            style={{
              ...sans,
              fontWeight: 590,
              color: '#ffffff',
              background: '#5e6ad2',
            }}
          >
            J'ai compris, commencer
          </button>
        </div>
      </div>
    </div>
  )
}

interface TipProps {
  icon: React.ReactNode
  title: string
  desc: string
}

function Tip({ icon, title, desc }: TipProps) {
  return (
    <div
      className="flex items-start gap-3 p-3 rounded-md"
      style={{
        background: 'var(--t-surface)',
        border: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-[#f7f8f8] m-0" style={{ ...sans, fontWeight: 510 }}>
          {title}
        </p>
        <p className="text-[12px] text-[#8a8f98] mt-1 leading-relaxed" style={sans}>
          {desc}
        </p>
      </div>
    </div>
  )
}
