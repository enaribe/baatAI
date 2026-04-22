import { useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Mic, FileText, ShieldCheck, ArrowRight,
} from 'lucide-react'
import { Logo } from '../components/ui/logo'
import { Waveform } from '../components/ui/waveform'

/* ============================================================
   Landing Baat-IA — reproduction fidèle du mock marketing
   (Sections.jsx fourni). Dark Linear-inspired.
   ============================================================ */

const mono: React.CSSProperties = { fontFamily: 'var(--font-mono)' }
const sans: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontFeatureSettings: "'cv01', 'ss03'",
}

export function LandingPage() {
  return (
    <div
      className="min-h-screen text-[#f7f8f8]"
      style={{ background: '#08090a', ...sans }}
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
      className="sticky top-0 z-20 flex items-center gap-7 px-4 sm:px-8 py-3.5 border-b border-[rgba(255,255,255,0.05)] backdrop-blur-md"
      style={{ background: 'rgba(8,9,10,0.8)' }}
    >
      <div className="flex items-center gap-2">
        <Logo size={22} />
      </div>
      <span
        className="inline-flex items-center px-2 h-[20px] rounded-full text-[11px] text-[#f7f8f8] border border-[rgba(255,255,255,0.2)]"
        style={{ ...sans, fontWeight: 510 }}
      >
        Beta
      </span>
      <nav className="hidden md:flex gap-5 ml-2">
        {links.map((l) => (
          <a
            key={l}
            className="text-[13px] text-[#d0d6e0] hover:text-[#f7f8f8] transition-colors cursor-pointer"
            style={{ ...sans, fontWeight: 510 }}
          >
            {l}
          </a>
        ))}
      </nav>
      <div className="ml-auto flex gap-2">
        <Link
          to="/login"
          className="inline-flex items-center h-[32px] px-3 text-[13px] text-[#e2e4e7] bg-[rgba(255,255,255,0.02)] border border-[rgb(36,40,44)] rounded-md hover:bg-[rgba(255,255,255,0.04)] transition-colors"
          style={{ ...sans, fontWeight: 510 }}
        >
          Se connecter
        </Link>
        <Link
          to="/register"
          className="inline-flex items-center h-[32px] px-3 text-[13px] bg-gradient-to-br from-white to-[#d0d6e0] border border-white/20 rounded-md hover:from-white hover:to-[#f7f8f8] transition-colors"
          style={{ ...sans, fontWeight: 510, color: '#08090a' }}
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
      <h1
        className="mx-auto text-[40px] sm:text-[56px] lg:text-[64px] leading-[1.02] text-[#f7f8f8]"
        style={{ ...sans, fontWeight: 510, letterSpacing: '-1.408px', maxWidth: 860 }}
      >
        Les voix de l'Afrique,<br />prêtes pour l'IA.
      </h1>
      <p
        className="mx-auto mt-6 text-[16px] sm:text-[18px] leading-[1.6] text-[#8a8f98]"
        style={{ ...sans, letterSpacing: '-0.165px', maxWidth: 620 }}
      >
        Des datasets vocaux annotés en 34 langues africaines. Pour entraîner des modèles ASR, TTS et NLU qui parlent comme vos utilisateurs.
      </p>
      <div className="flex justify-center gap-2.5 mt-7 flex-wrap">
        <Link
          to="/register"
          className="inline-flex items-center h-[36px] px-4 text-[14px] bg-gradient-to-br from-white to-[#d0d6e0] border border-white/20 rounded-md hover:from-white hover:to-[#f7f8f8] transition-colors"
          style={{ ...sans, fontWeight: 510, color: '#08090a' }}
        >
          Demander l'accès
        </Link>
        <a
          className="inline-flex items-center gap-1.5 h-[36px] px-4 text-[14px] text-[#e2e4e7] bg-[rgba(255,255,255,0.02)] border border-[rgb(36,40,44)] rounded-md hover:bg-[rgba(255,255,255,0.04)] transition-colors cursor-pointer"
          style={{ ...sans, fontWeight: 510 }}
        >
          Explorer le catalogue
          <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Showcase dataset preview */}
      <div
        className="mt-[52px] p-3.5 rounded-[14px] relative border border-[rgba(255,255,255,0.08)]"
        style={{
          background: 'rgba(255,255,255,0.02)',
          boxShadow: '0 40px 80px -20px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,0,0,0.2)',
        }}
      >
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
                baat-ai.com/datasets/wolof-conversational
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
                Datasets
              </div>
              {[
                { n: 'Wolof · Conversational', h: '12 400', on: true },
                { n: 'Swahili · Broadcast', h: '8 200' },
                { n: 'Hausa · Read speech', h: '6 100' },
                { n: 'Amharic · Call center', h: '4 300' },
                { n: 'Yoruba · Conversational', h: '5 600' },
                { n: 'Lingala · Radio', h: '2 100' },
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
                    {d.h}h
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
                  Wolof — Conversational
                </div>
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 h-[22px] rounded-full text-[12px] text-[#d0d6e0] border border-[#23252a]"
                  style={{ ...sans, fontWeight: 510 }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#10b981' }} />
                  Prêt
                </span>
              </div>
              <div className="text-[13px] text-[#8a8f98] mt-1" style={sans}>
                12 400 heures · 8 214 locuteurs · échantillonnage 16 kHz
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
                      borderLeft: i === 0 ? '2px solid #f7f8f8' : '2px solid transparent',
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

/* ---------- Stats row ---------- */
function StatsRow() {
  const stats = [
    { n: '34', l: 'langues africaines' },
    { n: '82 400h', l: "d'audio annoté" },
    { n: '41 000', l: 'locuteurs uniques' },
    { n: '99.1%', l: 'accord inter-annotateurs' },
  ]
  return (
    <section className="px-6 pt-10 pb-20 max-w-[1100px] mx-auto">
      <div
        className="grid grid-cols-2 md:grid-cols-4 rounded-[12px] overflow-hidden border border-[rgba(255,255,255,0.05)]"
        style={{ background: 'rgba(255,255,255,0.02)' }}
      >
        {stats.map((s, i) => (
          <div
            key={i}
            className="p-7 text-left"
            style={{
              borderRight: i < 3 ? '1px solid rgba(255,255,255,0.05)' : '0',
              borderBottom:
                i < 2 ? '1px solid rgba(255,255,255,0.05)' : '0',
            }}
          >
            <div
              className="text-[32px] md:text-[36px] text-[#f7f8f8] tabular-nums"
              style={{ ...sans, fontWeight: 510, letterSpacing: '-0.9px' }}
            >
              {s.n}
            </div>
            <div className="text-[13px] text-[#8a8f98] mt-1" style={sans}>
              {s.l}
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
            background: 'linear-gradient(90deg, #f7f8f8 0%, #8a8f98 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {kicker}
        </div>
      )}
      <div
        className="text-[32px] md:text-[40px] text-[#f7f8f8]"
        style={{ ...sans, fontWeight: 510, lineHeight: 1.05, letterSpacing: '-0.9px', marginTop: kicker ? 12 : 0 }}
      >
        {title}
      </div>
      {subtitle && (
        <div className="text-[15px] md:text-[17px] text-[#8a8f98] mt-3.5" style={{ ...sans, lineHeight: 1.55 }}>
          {subtitle}
        </div>
      )}
    </div>
  )
}

/* ---------- Languages ---------- */
function LanguagesSection() {
  const langs: [string, string, string][] = [
    ['Wolof', 'sn·sénégal', '12 400h'],
    ['Swahili', 'ke·kenya', '8 200h'],
    ['Hausa', 'ng·nigeria', '6 100h'],
    ['Yoruba', 'ng·nigeria', '5 600h'],
    ['Amharic', 'et·éthiopie', '4 300h'],
    ['Igbo', 'ng·nigeria', '3 900h'],
    ['Zulu', 'za·afrique du sud', '3 400h'],
    ['Lingala', 'cd·rdc', '2 100h'],
    ['Bambara', 'ml·mali', '1 800h'],
    ['Fula', "sn·afrique de l'ouest", '1 600h'],
    ['Oromo', 'et·éthiopie', '1 400h'],
    ['Shona', 'zw·zimbabwe', '1 200h'],
  ]
  return (
    <section className="px-6 py-20 max-w-[1100px] mx-auto">
      <SectionTitle
        kicker="Couverture"
        title="34 langues. Une par une, pas en bloc."
        subtitle="Chaque langue a ses locuteurs natifs, ses annotateurs, ses validateurs. Pas de transcription croisée, pas de traduction automatique."
      />
      <div
        className="grid grid-cols-2 md:grid-cols-4 gap-px rounded-[12px] overflow-hidden border border-[rgba(255,255,255,0.05)]"
        style={{ background: 'rgba(255,255,255,0.05)' }}
      >
        {langs.map((l, i) => (
          <LangCell key={i} lang={l} />
        ))}
      </div>
      <div className="text-center mt-6">
        <a
          className="inline-flex items-center gap-1.5 h-[32px] px-3 text-[13px] text-[#e2e4e7] bg-[rgba(255,255,255,0.02)] border border-[rgb(36,40,44)] rounded-md hover:bg-[rgba(255,255,255,0.04)] transition-colors cursor-pointer"
          style={{ ...sans, fontWeight: 510 }}
        >
          Voir les 22 autres langues
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
      style={{ background: '#08090a' }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = '#0f1011')}
      onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = '#08090a')}
    >
      <div
        className="text-[17px] text-[#f7f8f8]"
        style={{ ...sans, fontWeight: 590, letterSpacing: '-0.2px' }}
      >
        {lang[0]}
      </div>
      <div className="text-[11px] text-[#62666d] uppercase" style={mono}>
        {lang[1]}
      </div>
      <div className="text-[13px] text-[#8a8f98] mt-1.5" style={sans}>
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
        title="Pas d'IA qui annote l'IA."
        subtitle="Chaque heure audio passe par trois humains avant de quitter nos serveurs."
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PipelineCard
          icon={<Mic className="w-5 h-5" strokeWidth={1.75} />}
          title="Collecte terrain"
          body="Enregistrements in-situ avec des locuteurs natifs. Contextes variés : rue, domicile, centre d'appel, radio."
          demo={<Waveform height={40} bars={48} />}
        />
        <PipelineCard
          icon={<FileText className="w-5 h-5" strokeWidth={1.75} />}
          title="Annotation humaine"
          body="Transcription orthographique, phonétique quand pertinent, tags d'émotion et de chevauchement."
          demo={
            <div className="text-[11px] leading-[1.7] text-[#d0d6e0]" style={mono}>
              <div>
                <span className="text-[#62666d]">00:01.2</span>{' '}
                <span className="text-[#f7f8f8]">[SPK_01]</span> ndax nga fi nekk
              </div>
              <div>
                <span className="text-[#62666d]">00:02.8</span>{' '}
                <span className="text-[#8a8f98]">[SPK_02]</span> waaw, damay liggéey
              </div>
              <div>
                <span className="text-[#62666d]">00:04.1</span>{' '}
                <span className="text-[#62666d]">[SILENCE]</span>
              </div>
            </div>
          }
        />
        <PipelineCard
          icon={<ShieldCheck className="w-5 h-5" strokeWidth={1.75} />}
          title="Validation croisée"
          body="Double annotation, arbitrage sur désaccord, score de confiance par segment. 99.1% d'accord inter-annotateurs."
          demo={
            <div className="flex flex-col gap-1.5">
              {[
                { l: 'Annotateur A', v: 99 },
                { l: 'Annotateur B', v: 97 },
                { l: 'Arbitre', v: 100 },
              ].map((r, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <span className="text-[11px] text-[#8a8f98] w-[88px]" style={sans}>
                    {r.l}
                  </span>
                  <div
                    className="flex-1 h-1 rounded-sm overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.05)' }}
                  >
                    <div
                      className="h-full"
                      style={{ width: `${r.v}%`, background: '#10b981' }}
                    />
                  </div>
                  <span
                    className="text-[11px] text-[#d0d6e0] w-8 text-right tabular-nums"
                    style={mono}
                  >
                    {r.v}%
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
      className="p-6 flex flex-col min-h-[280px] rounded-[12px] border border-[rgba(255,255,255,0.08)]"
      style={{ background: 'rgba(255,255,255,0.02)' }}
    >
      <div
        className="inline-flex"
        style={{
          background: 'linear-gradient(135deg, #f7f8f8 0%, #8a8f98 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          color: '#f7f8f8',
        }}
      >
        {icon}
      </div>
      <div
        className="text-[18px] text-[#f7f8f8] mt-4"
        style={{ ...sans, fontWeight: 590, letterSpacing: '-0.2px' }}
      >
        {title}
      </div>
      <div className="text-[14px] text-[#8a8f98] mt-1.5" style={{ ...sans, lineHeight: 1.55 }}>
        {body}
      </div>
      <div className="mt-auto pt-6 border-t border-[rgba(255,255,255,0.05)]">
        <div className="mt-4">{demo}</div>
      </div>
    </div>
  )
}

/* ---------- API ---------- */
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
              background: 'linear-gradient(90deg, #f7f8f8 0%, #8a8f98 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Accès
          </div>
          <div
            className="text-[32px] md:text-[40px] text-[#f7f8f8] mt-3"
            style={{ ...sans, fontWeight: 510, lineHeight: 1.05, letterSpacing: '-0.9px' }}
          >
            Streamez, ne téléchargez pas.
          </div>
          <div className="text-[15px] md:text-[16px] text-[#8a8f98] mt-3.5" style={{ ...sans, lineHeight: 1.6 }}>
            Une API HTTP simple. Filtrez par langue, durée, locuteur, contexte. Le streaming démarre en 40 ms.
          </div>
          <div className="flex gap-5 mt-6 flex-wrap">
            {[
              { n: 'REST', d: 'JSON + audio/wav' },
              { n: 'Streaming', d: 'HTTP chunked' },
              { n: 'Python', d: 'pip install baat' },
            ].map((x, i) => (
              <div key={i}>
                <div className="text-[14px] text-[#f7f8f8]" style={{ ...sans, fontWeight: 590 }}>
                  {x.n}
                </div>
                <div className="text-[12px] text-[#62666d] mt-0.5" style={sans}>
                  {x.d}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Code block */}
        <div
          className="p-5 rounded-[10px] border border-[rgba(255,255,255,0.08)]"
          style={{ background: '#0a0a0b', ...mono, fontSize: 13, lineHeight: 1.7, color: '#d0d6e0' }}
        >
          <div className="flex gap-2 mb-3 items-center">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#3e3e44' }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#3e3e44' }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#3e3e44' }} />
            <span className="ml-auto text-[11px] text-[#62666d]" style={mono}>
              stream.py
            </span>
          </div>
          <div>
            <span className="text-[#f7f8f8]">from</span> baat{' '}
            <span className="text-[#f7f8f8]">import</span> Dataset
          </div>
          <div>&nbsp;</div>
          <div>
            ds = Dataset(<span className="text-[#d0d6e0]">"wolof-conversational"</span>)
          </div>
          <div>&nbsp;</div>
          <div className="text-[#62666d]"># 12 400h, filtré par durée</div>
          <div>
            <span className="text-[#f7f8f8]">for</span> sample{' '}
            <span className="text-[#f7f8f8]">in</span> ds.stream(min_seconds=
            <span className="text-[#d0d6e0]">3</span>):
          </div>
          <div>&nbsp;&nbsp;&nbsp;&nbsp;audio = sample.waveform</div>
          <div>&nbsp;&nbsp;&nbsp;&nbsp;text&nbsp;&nbsp;= sample.transcript</div>
          <div>
            &nbsp;&nbsp;&nbsp;&nbsp;lang&nbsp;&nbsp;= sample.language
            <span className="text-[#62666d]">&nbsp;&nbsp;# "wol"</span>
          </div>
          <div>&nbsp;</div>
          <div className="text-[#62666d]"># &gt;&gt;&gt; 40ms au premier sample</div>
        </div>
      </div>
    </section>
  )
}

/* ---------- Quote ---------- */
function QuoteSection() {
  return (
    <section className="px-6 py-20 max-w-[900px] mx-auto text-center">
      <div
        className="text-[22px] md:text-[28px] text-[#f7f8f8]"
        style={{ ...sans, lineHeight: 1.35, letterSpacing: '-0.4px' }}
      >
        «&nbsp;On a entraîné notre ASR wolof sur{' '}
        <span
          style={{
            background: 'linear-gradient(90deg, #f7f8f8 0%, #8a8f98 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          2 400h de Baat
        </span>
        . Le WER est passé de 38% à 11% en une semaine.&nbsp;»
      </div>
      <div className="flex items-center justify-center gap-3 mt-7">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-[#fff] text-[13px]"
          style={{ background: '#3e3e44', ...sans, fontWeight: 590 }}
        >
          AD
        </div>
        <div className="text-left">
          <div className="text-[14px] text-[#f7f8f8]" style={{ ...sans, fontWeight: 590 }}>
            Aminata Diop
          </div>
          <div className="text-[12px] text-[#8a8f98]" style={sans}>
            Lead ML, Orange Digital Ventures
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- CTA ---------- */
function CtaSection() {
  return (
    <section className="px-6 py-20 max-w-[1100px] mx-auto">
      <div
        className="p-10 md:p-16 rounded-[14px] text-center border border-[rgba(255,255,255,0.15)]"
        style={{
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
        }}
      >
        <div
          className="text-[36px] md:text-[48px] text-[#f7f8f8]"
          style={{ ...sans, fontWeight: 510, lineHeight: 1.0, letterSpacing: '-1.056px' }}
        >
          Entraînez sur ce que vos<br />utilisateurs parlent vraiment.
        </div>
        <div className="flex justify-center gap-2.5 mt-8 flex-wrap">
          <Link
            to="/register"
            className="inline-flex items-center h-[36px] px-4 text-[14px] bg-gradient-to-br from-white to-[#d0d6e0] border border-white/20 rounded-md hover:from-white hover:to-[#f7f8f8] transition-colors"
            style={{ ...sans, fontWeight: 510, color: '#08090a' }}
          >
            Demander l'accès
          </Link>
          <a
            className="inline-flex items-center h-[36px] px-4 text-[14px] text-[#e2e4e7] bg-[rgba(255,255,255,0.02)] border border-[rgb(36,40,44)] rounded-md hover:bg-[rgba(255,255,255,0.04)] transition-colors cursor-pointer"
            style={{ ...sans, fontWeight: 510 }}
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
    <footer className="px-8 pt-[60px] pb-8 max-w-[1200px] mx-auto mt-[60px] border-t border-[rgba(255,255,255,0.05)]">
      <div className="grid grid-cols-2 md:grid-cols-[2fr_repeat(4,1fr)] gap-8">
        <div>
          <Logo size={22} />
          <div className="text-[13px] text-[#62666d] mt-4 max-w-[260px]" style={{ ...sans, lineHeight: 1.55 }}>
            Les voix de l'Afrique, prêtes pour l'IA. Conçu à Dakar, annoté partout.
          </div>
        </div>
        {Object.entries(cols).map(([h, links]) => (
          <div key={h}>
            <div
              className="text-[11px] text-[#62666d] uppercase tracking-[0.04em]"
              style={{ ...sans, fontWeight: 510 }}
            >
              {h}
            </div>
            <div className="flex flex-col gap-2.5 mt-3.5">
              {links.map((l) => (
                <a
                  key={l}
                  className="text-[13px] text-[#d0d6e0] hover:text-[#f7f8f8] transition-colors cursor-pointer"
                  style={sans}
                >
                  {l}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div
        className="mt-12 pt-5 border-t border-[rgba(255,255,255,0.05)] flex justify-between text-[12px] text-[#62666d]"
        style={sans}
      >
        <span>© 2026 Baat-IA</span>
        <span style={mono}>v2.4.1 · sn·dakar</span>
      </div>
    </footer>
  )
}

