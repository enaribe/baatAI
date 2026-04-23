import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import { Logo } from '../ui/logo'
import { ThemeToggle } from '../ui/theme-toggle'

interface PublicLayoutProps {
  children: ReactNode
  /** Titre affiché dans le panneau gauche (peut contenir des <br/>) */
  brandTitle?: ReactNode
  /** Sous-titre sous le titre gauche */
  brandSubtitle?: string
}

/**
 * Layout Auth Daandé — split screen 50/50 (desktop).
 * - Panneau gauche `BrandSide` : fond `#0a0b0c` + glow radial, logo,
 *   titre marketing 40px weight 510, sous-titre, MiniWaveform animée, stats, stamp mono.
 * - Panneau droit : contenu (formulaire)
 * Mobile : seul le panneau droit est visible.
 */
export function PublicLayout({ children, brandTitle, brandSubtitle }: PublicLayoutProps) {
  return (
    <div
      className="min-h-screen grid lg:grid-cols-2"
      style={{ background: 'var(--t-bg)', color: 'var(--t-fg)' }}
    >
      <BrandSide title={brandTitle} sub={brandSubtitle} />
      <section className="relative flex flex-col min-h-screen overflow-y-auto p-6 sm:p-10 lg:p-11">
        <div className="absolute top-4 right-4 sm:top-5 sm:right-5 z-10">
          <ThemeToggle size={32} />
        </div>
        {children}
      </section>
    </div>
  )
}

/* ---------- Brand side panel ---------- */
function BrandSide({ title, sub }: { title?: ReactNode; sub?: string }) {
  return (
    <aside
      data-theme="dark"
      className="dark-lock hidden lg:flex relative flex-col overflow-hidden p-9 lg:p-11 border-r border-[rgba(255,255,255,0.05)] text-[#f7f8f8]"
      style={{
        background:
          'radial-gradient(ellipse at 20% 10%, rgba(255,255,255,0.05), transparent 60%), #0a0b0c',
      }}
    >
      <div>
        <Logo size={24} />
      </div>

      <div className="flex-1 flex flex-col justify-center max-w-[460px]">
        <div
          className="text-[40px] text-[#f7f8f8]"
          style={{
            fontFamily: 'var(--font-body)',
            fontFeatureSettings: "'cv01','ss03'",
            fontWeight: 510,
            lineHeight: 1.05,
            letterSpacing: '-0.8px',
          }}
        >
          {title ?? (
            <>
              Les voix de<br />l'Afrique, prêtes<br />pour l'IA.
            </>
          )}
        </div>
        <div
          className="text-[15px] text-[#8a8f98] mt-[18px] max-w-[380px]"
          style={{
            fontFamily: 'var(--font-body)',
            fontFeatureSettings: "'cv01','ss03'",
            lineHeight: 1.6,
          }}
        >
          {sub ??
            'Rejoignez Daandé pour construire ou alimenter des datasets vocaux annotés en 34 langues africaines.'}
        </div>

        <MiniWaveform />

        <div className="flex gap-9 mt-8">
          {[
            ['34', 'langues'],
            ['82 400h', 'annotées'],
            ['41 000', 'locuteurs'],
          ].map(([n, l], i) => (
            <div key={i}>
              <div
                className="text-[22px] text-[#f7f8f8] tabular-nums"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontFeatureSettings: "'cv01','ss03'",
                  fontWeight: 510,
                  letterSpacing: '-0.4px',
                }}
              >
                {n}
              </div>
              <div
                className="text-[12px] text-[#62666d] mt-0.5"
                style={{ fontFamily: 'var(--font-body)', fontFeatureSettings: "'cv01','ss03'" }}
              >
                {l}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        className="text-[11px] text-[#3e3e44]"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        sn · dakar · v2.4.1
      </div>
    </aside>
  )
}

/* ---------- MiniWaveform : barres animées gradient blanc→gris ---------- */
function MiniWaveform() {
  const ref = useRef<HTMLDivElement>(null)
  const bars = 56

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const seeds = Array.from({ length: bars }, () => Math.random())
    let raf = 0

    const tick = (t: number) => {
      if (!ref.current) return
      const kids = ref.current.children
      for (let i = 0; i < kids.length; i++) {
        const s = seeds[i] ?? 0.5
        const v =
          (0.2 + 0.8 * Math.abs(Math.sin(t / 500 + i * 0.32 + s * 6))) *
          (0.3 + 0.7 * s)
        ;(kids[i] as HTMLElement).style.height = `${v * 44}px`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div
      ref={ref}
      className="flex items-center gap-[3px] mt-8 w-full max-w-[380px]"
      style={{ height: 44 }}
    >
      {Array.from({ length: bars }).map((_, i) => {
        const t = i / (bars - 1)
        const shade = `rgb(${Math.round(247 - t * 170)}, ${Math.round(248 - t * 172)}, ${Math.round(248 - t * 170)})`
        return (
          <div
            key={i}
            style={{
              flex: 1,
              height: 4,
              background: shade,
              borderRadius: 2,
              transition: 'height 60ms linear',
              opacity: 0.55 + (1 - t) * 0.45,
            }}
          />
        )
      })}
    </div>
  )
}
