import { useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Mic, FileText, ShieldCheck, ArrowRight,
} from 'lucide-react'
import { Logo } from '../components/ui/logo'
import { Waveform } from '../components/ui/waveform'
import { ThemeToggle } from '../components/ui/theme-toggle'

/* ============================================================
   Landing Daandé — reproduction fidèle du mock marketing
   Adaptative light/dark via les tokens --t-*.
   Les panneaux "moniteur" (dataset preview, code, API) restent
   en dark-lock pour conserver leur esthétique.
   ============================================================ */

const mono: React.CSSProperties = { fontFamily: 'var(--font-mono)' }
const sans: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontFeatureSettings: "'cv01', 'ss03'",
}

export function LandingPage() {
  return (
    <div
      className="min-h-screen"
      style={{ background: 'var(--t-bg)', color: 'var(--t-fg)', ...sans }}
    >
      <Nav />
      <Hero />
      <StatsRow />
      <LanguagesSection />
      <PipelineSection />
      <ApiSection />
      <QuoteSection />
      <CtaSection />
      <Footer />
    </div>
  )
}

/* ---------- Nav ---------- */
function Nav() {
  const links = ['Produit', 'Datasets', 'Langues', 'Tarifs', 'Docs']
  return (
    <header
      className="sticky top-0 z-20 flex items-center gap-7 px-4 sm:px-8 py-3.5 backdrop-blur-md"
      style={{
        background: 'var(--t-topbar-bg)',
        borderBottom: '1px solid var(--t-border-subtle)',
      }}
    >
      <div className="flex items-center gap-2">
        <Logo size={22} />
      </div>
      <span
        className="inline-flex items-center px-2 h-[20px] rounded-full text-[11px]"
        style={{
          ...sans,
          fontWeight: 510,
          color: 'var(--t-fg)',
          border: '1px solid var(--t-border-strong)',
        }}
      >
        Beta
      </span>
      <nav className="hidden md:flex gap-5 ml-2">
        {links.map((l) => (
          <a
            key={l}
            className="text-[13px] transition-colors cursor-pointer"
            style={{ ...sans, fontWeight: 510, color: 'var(--t-fg-2)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--t-fg)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--t-fg-2)')}
          >
            {l}
          </a>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle size={32} />
        <Link
          to="/login"
          className="inline-flex items-center h-[32px] px-3 text-[13px] rounded-md transition-colors"
          style={{
            ...sans,
            fontWeight: 510,
            color: 'var(--t-fg-2)',
            background: 'var(--t-surface)',
            border: '1px solid var(--t-border)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--t-surface-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--t-surface)')}
        >
          Se connecter
        </Link>
        <Link
          to="/register"
          className="inline-flex items-center h-[32px] px-3 text-[13px] rounded-md transition-colors"
          style={{
            ...sans,
            fontWeight: 510,
            background: 'var(--t-solid-bg)',
            color: 'var(--t-solid-fg)',
            border: '1px solid var(--t-border)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--t-solid-bg-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--t-solid-bg)')}
        >
          Demander l'accès
        </Link>
      </div>
    </header>
  )
}

/* ---------- Hero ---------- */
function Hero() {
  return (
    <section className="px-6 pt-20 pb-10 max-w-[1100px] mx-auto text-center">
      <div
        className="inline-block text-[11px] uppercase mb-5"
        style={{
          ...mono,
          letterSpacing: '0.12em',
          color: 'var(--t-fg-4)',
        }}
      >
        Beta privée · Dakar
      </div>
      <h1
        className="mx-auto text-[40px] sm:text-[56px] lg:text-[64px] leading-[1.02]"
        style={{
          ...sans,
          fontWeight: 510,
          letterSpacing: '-1.408px',
          maxWidth: 860,
          color: 'var(--t-fg)',
        }}
      >
        Les voix de l'Afrique,<br />prêtes pour l'IA.
      </h1>
      <p
        className="mx-auto mt-6 text-[16px] sm:text-[18px] leading-[1.6]"
        style={{
          ...sans,
          letterSpacing: '-0.165px',
          maxWidth: 640,
          color: 'var(--t-fg-3)',
        }}
      >
        Plateforme de collecte de datasets vocaux pour 4 langues africaines —
        Wolof, Pulaar, Sereer, Bambara. Pour les équipes IA qui construisent
        leurs propres modèles ASR et TTS.
      </p>
      <div className="flex justify-center gap-2.5 mt-7 flex-wrap">
        <Link
          to="/register"
          className="inline-flex items-center h-[36px] px-4 text-[14px] rounded-md transition-colors"
          style={{
            ...sans,
            fontWeight: 510,
            background: 'var(--t-solid-bg)',
            color: 'var(--t-solid-fg)',
            border: '1px solid var(--t-border)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--t-solid-bg-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--t-solid-bg)')}
        >
          Créer un projet
        </Link>
        <Link
          to="/speaker/register"
          className="inline-flex items-center gap-1.5 h-[36px] px-4 text-[14px] rounded-md transition-colors cursor-pointer"
          style={{
            ...sans,
            fontWeight: 510,
            color: 'var(--t-fg-2)',
            background: 'var(--t-surface)',
            border: '1px solid var(--t-border)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--t-surface-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--t-surface)')}
        >
          Devenir locuteur rémunéré
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Showcase dataset preview — reste dark-lock (moniteur stylisé) */}
      <div
        data-theme="dark"
        className="dark-lock mt-[52px] p-3.5 rounded-[14px] relative"
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 40px 80px -20px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,0,0,0.2)',
          color: '#f7f8f8',
        }}
      >
        <div
          className="absolute -top-2.5 right-4 inline-flex items-center px-2 h-[20px] rounded-[2px] text-[10px] uppercase z-10"
          style={{
            ...mono,
            letterSpacing: '0.08em',
            color: '#62666d',
            background: '#0f1011',
            border: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          Aperçu produit
        </div>
        <div className="rounded-[10px] overflow-hidden" style={{ background: '#0f1011' }}>
          {/* Window chrome */}
          <div className="px-3.5 py-2.5 border-b border-[rgba(255,255,255,0.05)] flex items-center gap-2.5">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#3e3e44' }} />
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#3e3e44' }} />
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#3e3e44' }} />
            </div>
            <div className="flex-1 flex justify-center">
              <div
                className="text-[11px] text-[#62666d] bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] rounded-md px-2.5 py-0.5"
                style={mono}
              >
                baat-ai.com/dashboard/projects
              </div>
            </div>
            <span
              className="inline-flex items-center px-2 h-[18px] rounded-[2px] text-[10px] text-[#f7f8f8] bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.05)]"
              style={{ ...sans, fontWeight: 510 }}
            >
              v2.4
            </span>
          </div>

          {/* Content */}
          <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] min-h-[340px]">
            {/* Side list */}
            <div className="border-r border-[rgba(255,255,255,0.05)] p-2.5 hidden md:block">
              <div
                className="px-2 py-1.5 text-[10px] text-[#62666d] uppercase tracking-[0.04em]"
                style={{ ...sans, fontWeight: 510 }}
              >
                Vos projets
              </div>
              {[
                { n: 'Centre d\'appel · Wolof', s: 'Actif', on: true },
                { n: 'Lecture phrases · Pulaar', s: 'Actif' },
                { n: 'Conversation · Sereer', s: 'Brouillon' },
                { n: 'Salutations · Bambara', s: 'Brouillon' },
              ].map((d, i) => (
                <div
                  key={i}
                  className="px-2 py-1.5 rounded-sm mb-0.5 flex items-center justify-between"
                  style={{ background: d.on ? 'rgba(255,255,255,0.04)' : 'transparent' }}
                >
                  <span
                    className="text-[12px] text-left"
                    style={{ ...sans, color: d.on ? '#f7f8f8' : '#d0d6e0', fontWeight: d.on ? 510 : 400 }}
                  >
                    {d.n}
                  </span>
                  <span className="text-[10px] text-[#62666d]" style={mono}>
                    {d.s.toLowerCase()}
                  </span>
                </div>
              ))}
            </div>

            {/* Main */}
            <div className="p-4 sm:p-[18px] text-left">
              <div className="flex items-center gap-2.5 flex-wrap">
                <div
                  className="text-[18px] text-[#f7f8f8]"
                  style={{ ...sans, fontWeight: 590, letterSpacing: '-0.24px' }}
                >
                  Centre d'appel — Wolof
                </div>
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 h-[22px] rounded-full text-[12px] text-[#d0d6e0] border border-[#23252a]"
                  style={{ ...sans, fontWeight: 510 }}
                >
                  Collecte en cours
                </span>
              </div>
              <div className="text-[13px] text-[#8a8f98] mt-1" style={sans}>
                85 phrases · 12 locuteurs invités · WebM 48 kHz
              </div>

              {/* Waveform panel */}
              <div
                className="mt-[18px] p-3.5 rounded-[8px] border border-[rgba(255,255,255,0.05)]"
                style={{ background: 'rgba(255,255,255,0.02)' }}
              >
                <Waveform height={52} bars={72} />
                <div className="flex justify-between mt-2 text-[10px] text-[#62666d]" style={mono}>
                  <span>00:00:00</span>
                  <span>00:00:12.480</span>
                </div>
              </div>

              {/* Transcript rows */}
              <div className="mt-3.5 flex flex-col gap-1.5">
                {[
                  { t: '00:01.2', s: 'Ndax nga fi nekk ci ngoon si ?', tr: 'Tu es là cet après-midi ?' },
                  { t: '00:03.6', s: 'Waaw, damay liggéey ci biro bi.', tr: 'Oui, je travaille au bureau.' },
                  { t: '00:06.8', s: 'Kon ñu dajaloo fukki waxtu.', tr: "Alors on se retrouve à 10h." },
                ].map((r, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[64px_1fr] md:grid-cols-[64px_1fr_1fr] gap-3 px-2 py-1.5 rounded-sm"
                    style={{
                      background: i === 0 ? 'rgba(255,255,255,0.05)' : 'transparent',
                    }}
                  >
                    <span className="text-[11px] text-[#62666d]" style={mono}>
                      {r.t}
                    </span>
                    <span className="text-[12px] text-[#f7f8f8]" style={sans}>
                      {r.s}
                    </span>
                    <span className="text-[12px] text-[#8a8f98] italic hidden md:block" style={sans}>
                      {r.tr}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- Comment ça marche ---------- */
function StatsRow() {
  const steps = [
    {
      n: '01',
      t: 'Vous uploadez vos phrases',
      d: "Texte brut, CSV ou copier-coller. Le parser extrait phrase par phrase.",
    },
    {
      n: '02',
      t: 'Des locuteurs natifs enregistrent',
      d: 'Depuis leur téléphone, payés via Wave ou Orange Money à la phrase validée.',
    },
    {
      n: '03',
      t: 'Vous récupérez le dataset',
      d: 'Format LJSpeech, HuggingFace ou CSV+WAV. Validation SNR et segmentation incluses.',
    },
  ]
  return (
    <section className="px-6 pt-10 pb-20 max-w-[1100px] mx-auto">
      <div
        className="grid grid-cols-1 md:grid-cols-3 rounded-[12px] overflow-hidden"
        style={{
          background: 'var(--t-surface)',
          border: '1px solid var(--t-border-subtle)',
        }}
      >
        {steps.map((s, i) => (
          <div
            key={i}
            className="p-7 text-left flex flex-col gap-2.5"
            style={{
              borderRight: i < 2 ? '1px solid var(--t-border-subtle)' : '0',
            }}
          >
            <div
              className="text-[11px] uppercase"
              style={{
                ...mono,
                letterSpacing: '0.08em',
                color: 'var(--t-fg-4)',
              }}
            >
              {s.n}
            </div>
            <div
              className="text-[17px]"
              style={{
                ...sans,
                fontWeight: 590,
                letterSpacing: '-0.2px',
                color: 'var(--t-fg)',
              }}
            >
              {s.t}
            </div>
            <div
              className="text-[13px]"
              style={{ ...sans, lineHeight: 1.55, color: 'var(--t-fg-3)' }}
            >
              {s.d}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ---------- Section title helper ---------- */
function SectionTitle({ kicker, title, subtitle }: { kicker?: string; title: React.ReactNode; subtitle?: string }) {
  return (
    <div className="text-center max-w-[700px] mx-auto mb-12">
      {kicker && (
        <div
          className="inline-block text-[12px] uppercase"
          style={{
            ...sans,
            fontWeight: 510,
            letterSpacing: '0.08em',
            background: 'linear-gradient(90deg, var(--t-fg) 0%, var(--t-fg-3) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {kicker}
        </div>
      )}
      <div
        className="text-[32px] md:text-[40px]"
        style={{
          ...sans,
          fontWeight: 510,
          lineHeight: 1.05,
          letterSpacing: '-0.9px',
          marginTop: kicker ? 12 : 0,
          color: 'var(--t-fg)',
        }}
      >
        {title}
      </div>
      {subtitle && (
        <div
          className="text-[15px] md:text-[17px] mt-3.5"
          style={{ ...sans, lineHeight: 1.55, color: 'var(--t-fg-3)' }}
        >
          {subtitle}
        </div>
      )}
    </div>
  )
}

/* ---------- Languages ---------- */
function LanguagesSection() {
  const langs: [string, string, string][] = [
    ['Wolof', 'sn·sénégal', '4 dialectes pris en charge'],
    ['Pulaar', "sn · ml · gn · mr", '3 dialectes pris en charge'],
    ['Sereer', 'sn·sénégal', '2 dialectes pris en charge'],
    ['Bambara', 'ml·mali', '2 dialectes pris en charge'],
  ]
  return (
    <section className="px-6 py-20 max-w-[1100px] mx-auto">
      <SectionTitle
        kicker="Couverture"
        title="4 langues au lancement."
        subtitle="Wolof, Pulaar, Sereer, Bambara — sélectionnées pour la demande des équipes NLP au Sénégal et au Mali. D'autres suivront selon vos besoins."
      />
      <div
        className="grid grid-cols-2 md:grid-cols-4 gap-px rounded-[12px] overflow-hidden"
        style={{
          background: 'var(--t-border-subtle)',
          border: '1px solid var(--t-border-subtle)',
        }}
      >
        {langs.map((l, i) => (
          <LangCell key={i} lang={l} />
        ))}
      </div>
      <div className="text-center mt-6">
        <a
          href="mailto:hello@baat-ai.com?subject=Demande%20de%20langue"
          className="inline-flex items-center gap-1.5 h-[32px] px-3 text-[13px] rounded-md transition-colors cursor-pointer"
          style={{
            ...sans,
            fontWeight: 510,
            color: 'var(--t-fg-2)',
            background: 'var(--t-surface)',
            border: '1px solid var(--t-border)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--t-surface-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--t-surface)')}
        >
          Demander une langue
          <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>
    </section>
  )
}

function LangCell({ lang }: { lang: [string, string, string] }) {
  const ref = useRef<HTMLDivElement>(null)
  return (
    <div
      ref={ref}
      className="p-5 flex flex-col gap-1 transition-colors"
      style={{ background: 'var(--t-bg)' }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'var(--t-bg-panel)')}
      onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'var(--t-bg)')}
    >
      <div
        className="text-[17px]"
        style={{ ...sans, fontWeight: 590, letterSpacing: '-0.2px', color: 'var(--t-fg)' }}
      >
        {lang[0]}
      </div>
      <div className="text-[11px] uppercase" style={{ ...mono, color: 'var(--t-fg-4)' }}>
        {lang[1]}
      </div>
      <div className="text-[13px] mt-1.5" style={{ ...sans, color: 'var(--t-fg-3)' }}>
        {lang[2]}
      </div>
    </div>
  )
}

/* ---------- Pipeline ---------- */
function PipelineSection() {
  return (
    <section className="px-6 py-20 max-w-[1100px] mx-auto">
      <SectionTitle
        kicker="Pipeline"
        title="Contrôle qualité automatique."
        subtitle="Chaque enregistrement passe par un contrôle SNR, détection de clipping et ratio silence. Les segments sous le seuil sont rejetés et renvoyés au locuteur pour ré-enregistrement."
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PipelineCard
          icon={<Mic className="w-5 h-5" strokeWidth={1.75} />}
          title="Capture mobile"
          body="Le locuteur enregistre depuis son téléphone, phrase par phrase. Upload résumable TUS — résiste à la 3G et aux coupures."
          demo={<Waveform height={40} bars={48} />}
        />
        <PipelineCard
          icon={<FileText className="w-5 h-5" strokeWidth={1.75} />}
          title="Métriques techniques"
          body="SNR, clipping, ratio silence, durée — calculés à l'arrivée sur chaque segment WebM. Profils ASR ou TTS selon le projet."
          demo={
            <div
              data-theme="dark"
              className="dark-lock text-[11px] leading-[1.7] rounded-[6px] p-2.5"
              style={{ ...mono, background: '#0f1011', color: '#d0d6e0' }}
            >
              <div>
                <span style={{ color: '#62666d' }}>snr_db</span>{' '}
                <span style={{ color: '#10b981' }}>32.4</span>
              </div>
              <div>
                <span style={{ color: '#62666d' }}>clipping_pct</span>{' '}
                <span style={{ color: '#10b981' }}>0.02</span>
              </div>
              <div>
                <span style={{ color: '#62666d' }}>silence_ratio</span>{' '}
                <span style={{ color: '#10b981' }}>0.18</span>
              </div>
              <div>
                <span style={{ color: '#62666d' }}>status</span>{' '}
                <span style={{ color: '#f7f8f8' }}>valid</span>
              </div>
            </div>
          }
        />
        <PipelineCard
          icon={<ShieldCheck className="w-5 h-5" strokeWidth={1.75} />}
          title="Validation croisée"
          body="Vous écoutez et validez vous-même les enregistrements depuis le dashboard. Les rejets reviennent au locuteur avec la raison du refus."
          demo={
            <div className="flex flex-col gap-1.5">
              {[
                { l: 'Phrase 01', s: 'valid', c: '#10b981' },
                { l: 'Phrase 02', s: 'valid', c: '#10b981' },
                { l: 'Phrase 03', s: 'rejet · bruit', c: '#ef4444' },
                { l: 'Phrase 04', s: 'en attente', c: '#62666d' },
              ].map((r, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <span
                    className="text-[11px] w-[80px]"
                    style={{ ...mono, color: 'var(--t-fg-3)' }}
                  >
                    {r.l}
                  </span>
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: r.c }}
                  />
                  <span
                    className="text-[11px] flex-1"
                    style={{ ...sans, color: 'var(--t-fg-2)' }}
                  >
                    {r.s}
                  </span>
                </div>
              ))}
            </div>
          }
        />
      </div>
    </section>
  )
}

function PipelineCard({
  icon, title, body, demo,
}: { icon: React.ReactNode; title: string; body: string; demo: React.ReactNode }) {
  return (
    <div
      className="p-6 flex flex-col min-h-[280px] rounded-[12px]"
      style={{
        background: 'var(--t-surface)',
        border: '1px solid var(--t-border)',
      }}
    >
      <div
        className="inline-flex"
        style={{
          background: 'linear-gradient(135deg, var(--t-fg) 0%, var(--t-fg-3) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          color: 'var(--t-fg)',
        }}
      >
        {icon}
      </div>
      <div
        className="text-[18px] mt-4"
        style={{ ...sans, fontWeight: 590, letterSpacing: '-0.2px', color: 'var(--t-fg)' }}
      >
        {title}
      </div>
      <div
        className="text-[14px] mt-1.5"
        style={{ ...sans, lineHeight: 1.55, color: 'var(--t-fg-3)' }}
      >
        {body}
      </div>
      <div
        className="mt-auto pt-6"
        style={{ borderTop: '1px solid var(--t-border-subtle)' }}
      >
        <div className="mt-4">{demo}</div>
      </div>
    </div>
  )
}

/* ---------- Export ---------- */
function ApiSection() {
  return (
    <section className="px-6 py-20 max-w-[1100px] mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr] gap-10 md:gap-12 items-center">
        <div>
          <div
            className="inline-block text-[12px] uppercase"
            style={{
              ...sans,
              fontWeight: 510,
              letterSpacing: '0.08em',
              background: 'linear-gradient(90deg, var(--t-fg) 0%, var(--t-fg-3) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Export
          </div>
          <div
            className="text-[32px] md:text-[40px] mt-3"
            style={{
              ...sans,
              fontWeight: 510,
              lineHeight: 1.05,
              letterSpacing: '-0.9px',
              color: 'var(--t-fg)',
            }}
          >
            Vos données, votre format.
          </div>
          <div
            className="text-[15px] md:text-[16px] mt-3.5"
            style={{ ...sans, lineHeight: 1.6, color: 'var(--t-fg-3)' }}
          >
            Téléchargez un ZIP prêt pour l'entraînement. Trois formats au choix selon votre framework.
            Métadonnées complètes : durée, locuteur, dialecte, métriques qualité.
          </div>
          <div className="flex gap-5 mt-6 flex-wrap">
            {[
              { n: 'LJSpeech', d: 'wavs/ + metadata.csv' },
              { n: 'HuggingFace', d: 'parquet + audio/' },
              { n: 'CSV + WAV', d: 'plain · custom' },
            ].map((x, i) => (
              <div key={i}>
                <div
                  className="text-[14px]"
                  style={{ ...sans, fontWeight: 590, color: 'var(--t-fg)' }}
                >
                  {x.n}
                </div>
                <div
                  className="text-[12px] mt-0.5"
                  style={{ ...sans, color: 'var(--t-fg-4)' }}
                >
                  {x.d}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* File tree — reste dark-lock (moniteur stylisé) */}
        <div
          data-theme="dark"
          className="dark-lock p-5 rounded-[10px] relative"
          style={{
            background: '#0a0a0b',
            border: '1px solid rgba(255,255,255,0.08)',
            ...mono,
            fontSize: 13,
            lineHeight: 1.7,
            color: '#d0d6e0',
          }}
        >
          <div className="flex gap-2 mb-3 items-center">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#3e3e44' }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#3e3e44' }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#3e3e44' }} />
            <span className="ml-auto text-[11px]" style={{ ...mono, color: '#62666d' }}>
              wolof-callcenter.zip
            </span>
          </div>
          <div style={{ color: '#f7f8f8' }}>wolof-callcenter/</div>
          <div>
            <span style={{ color: '#62666d' }}>├──</span>{' '}
            <span style={{ color: '#828fff' }}>metadata.csv</span>
          </div>
          <div>
            <span style={{ color: '#62666d' }}>├──</span>{' '}
            <span style={{ color: '#f7f8f8' }}>wavs/</span>
          </div>
          <div>
            <span style={{ color: '#62666d' }}>│&nbsp;&nbsp;&nbsp;├──</span>{' '}
            spk_001_phrase_0001.wav
          </div>
          <div>
            <span style={{ color: '#62666d' }}>│&nbsp;&nbsp;&nbsp;├──</span>{' '}
            spk_001_phrase_0002.wav
          </div>
          <div>
            <span style={{ color: '#62666d' }}>│&nbsp;&nbsp;&nbsp;└──</span>{' '}
            <span style={{ color: '#62666d' }}>... (1 248 fichiers)</span>
          </div>
          <div>
            <span style={{ color: '#62666d' }}>└──</span>{' '}
            <span style={{ color: '#828fff' }}>quality_report.json</span>
          </div>
          <div>&nbsp;</div>
          <div style={{ color: '#62666d' }}># 16 kHz · mono · WAV PCM</div>
          <div style={{ color: '#62666d' }}># total: 4h 12min · 1 248 segments</div>
        </div>
      </div>
    </section>
  )
}

/* ---------- Statut ---------- */
function QuoteSection() {
  const items = [
    {
      k: 'Lancement',
      v: 'Q2 2026',
      d: 'Beta privée ouverte aux premières équipes pilotes.',
    },
    {
      k: 'Localisation',
      v: 'Dakar, Sénégal',
      d: 'Équipe basée sur place, locuteurs recrutés au Sénégal et au Mali.',
    },
    {
      k: 'Modèle économique',
      v: 'Forfait par projet',
      d: 'Tarification à la phrase validée. Locuteurs payés via Wave / Orange Money.',
    },
  ]
  return (
    <section className="px-6 py-20 max-w-[1100px] mx-auto">
      <SectionTitle
        kicker="Statut"
        title="Premiers projets en cours."
        subtitle="Nous accompagnons une poignée d'équipes pilotes. Si vous construisez un modèle vocal pour une langue africaine, parlons-en."
      />
      <div
        className="grid grid-cols-1 md:grid-cols-3 rounded-[12px] overflow-hidden"
        style={{
          background: 'var(--t-surface)',
          border: '1px solid var(--t-border-subtle)',
        }}
      >
        {items.map((it, i) => (
          <div
            key={i}
            className="p-7 flex flex-col gap-2"
            style={{
              borderRight: i < 2 ? '1px solid var(--t-border-subtle)' : '0',
            }}
          >
            <div
              className="text-[10px] uppercase"
              style={{
                ...mono,
                letterSpacing: '0.08em',
                color: 'var(--t-fg-4)',
              }}
            >
              {it.k}
            </div>
            <div
              className="text-[20px]"
              style={{
                ...sans,
                fontWeight: 590,
                letterSpacing: '-0.24px',
                color: 'var(--t-fg)',
              }}
            >
              {it.v}
            </div>
            <div
              className="text-[13px]"
              style={{ ...sans, lineHeight: 1.55, color: 'var(--t-fg-3)' }}
            >
              {it.d}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ---------- CTA ---------- */
function CtaSection() {
  return (
    <section className="px-6 py-20 max-w-[1100px] mx-auto">
      <div
        className="p-10 md:p-16 rounded-[14px] text-center"
        style={{
          background: 'var(--t-surface-2)',
          border: '1px solid var(--t-border-strong)',
        }}
      >
        <div
          className="text-[36px] md:text-[48px]"
          style={{
            ...sans,
            fontWeight: 510,
            lineHeight: 1.0,
            letterSpacing: '-1.056px',
            color: 'var(--t-fg)',
          }}
        >
          Construisez vos modèles sur<br />les voix qui vous concernent.
        </div>
        <div className="flex justify-center gap-2.5 mt-8 flex-wrap">
          <Link
            to="/register"
            className="inline-flex items-center h-[36px] px-4 text-[14px] rounded-md transition-colors"
            style={{
              ...sans,
              fontWeight: 510,
              background: 'var(--t-solid-bg)',
              color: 'var(--t-solid-fg)',
              border: '1px solid var(--t-border)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--t-solid-bg-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--t-solid-bg)')}
          >
            Créer un projet
          </Link>
          <a
            href="mailto:hello@baat-ai.com"
            className="inline-flex items-center h-[36px] px-4 text-[14px] rounded-md transition-colors cursor-pointer"
            style={{
              ...sans,
              fontWeight: 510,
              color: 'var(--t-fg-2)',
              background: 'var(--t-surface)',
              border: '1px solid var(--t-border)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--t-surface-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--t-surface)')}
          >
            Parler à l'équipe
          </a>
        </div>
      </div>
    </section>
  )
}

/* ---------- Footer ---------- */
function Footer() {
  const cols: Record<string, string[]> = {
    Produit: ['Datasets', 'Langues', 'API', 'Tarifs'],
    Entreprise: ['À propos', 'Équipe', 'Blog', 'Contact'],
    Ressources: ['Docs', 'Guides', 'Benchmarks', 'Statut'],
    Légal: ['Confidentialité', 'CGU', 'Sécurité', 'Licences'],
  }
  return (
    <footer
      className="px-8 pt-[60px] pb-8 max-w-[1200px] mx-auto mt-[60px]"
      style={{ borderTop: '1px solid var(--t-border-subtle)' }}
    >
      <div className="grid grid-cols-2 md:grid-cols-[2fr_repeat(4,1fr)] gap-8">
        <div>
          <Logo size={22} />
          <div
            className="text-[13px] mt-4 max-w-[260px]"
            style={{ ...sans, lineHeight: 1.55, color: 'var(--t-fg-4)' }}
          >
            Les voix de l'Afrique, prêtes pour l'IA. Conçu à Dakar, annoté partout.
          </div>
        </div>
        {Object.entries(cols).map(([h, links]) => (
          <div key={h}>
            <div
              className="text-[11px] uppercase tracking-[0.04em]"
              style={{ ...sans, fontWeight: 510, color: 'var(--t-fg-4)' }}
            >
              {h}
            </div>
            <div className="flex flex-col gap-2.5 mt-3.5">
              {links.map((l) => (
                <a
                  key={l}
                  className="text-[13px] transition-colors cursor-pointer"
                  style={{ ...sans, color: 'var(--t-fg-2)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--t-fg)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--t-fg-2)')}
                >
                  {l}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div
        className="mt-12 pt-5 flex justify-between text-[12px]"
        style={{
          borderTop: '1px solid var(--t-border-subtle)',
          ...sans,
          color: 'var(--t-fg-4)',
        }}
      >
        <span style={{ color: 'var(--t-fg-4)' }}>© 2026 Daandé</span>
        <span style={{ ...mono, color: 'var(--t-fg-4)' }}>v2.4.1 · sn·dakar</span>
      </div>
    </footer>
  )
}
