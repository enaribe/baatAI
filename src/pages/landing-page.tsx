import { Link } from 'react-router-dom'
import { Mic, ArrowRight, Play, CheckCircle, Globe, Zap, Shield, ChevronDown, FolderPlus, Users, Download, Microscope, Rocket, Check, Info, Target, Sparkles } from 'lucide-react'

// Langues africaines supportées avec leurs noms natifs
const LANGUAGES = [
  { code: 'wol', name: 'Wolof', region: 'Sénégal', speakers: '5M+', color: 'from-primary-400 to-primary-600' },
  { code: 'fuc', name: 'Pulaar', region: 'Sahel', speakers: '20M+', color: 'from-secondary-400 to-secondary-600' },
  { code: 'srr', name: 'Sereer', region: 'Sénégal', speakers: '1.2M+', color: 'from-accent-400 to-accent-600' },
  { code: 'bam', name: 'Bambara', region: 'Mali', speakers: '15M+', color: 'from-amber-400 to-amber-600' },
]

const STATS = [
  { value: '50K+', label: 'Heures collectées', sub: 'et en croissance' },
  { value: '12+', label: 'Projets actifs', sub: 'par des chercheurs' },
  { value: '98%', label: 'Taux de qualité', sub: 'après validation QC' },
]

const FEATURES = [
  {
    icon: Mic,
    title: 'Collecte mobile-first',
    desc: 'Vos locuteurs enregistrent depuis n\'importe quel téléphone, sans compte, via un simple lien. Conçu pour le réseau 3G.',
    color: 'text-primary-500',
    bg: 'bg-primary-50 dark:bg-primary-950/30',
  },
  {
    icon: Zap,
    title: 'Validation automatique',
    desc: 'Chaque enregistrement est analysé : SNR, écrêtage, ratio de silence. Seules les pistes de qualité rejoignent votre dataset.',
    color: 'text-secondary-600',
    bg: 'bg-secondary-50 dark:bg-secondary-950/30',
  },
  {
    icon: Globe,
    title: 'Export prêt pour l\'IA',
    desc: 'Formats LJSpeech, HuggingFace et CSV/WAV. Téléchargez un dataset structuré, prêt à entraîner vos modèles ASR/TTS.',
    color: 'text-accent-600',
    bg: 'bg-accent-50 dark:bg-accent-950/30',
  },
  {
    icon: Shield,
    title: 'Infrastructure Supabase',
    desc: 'Stockage chiffré, RLS sur chaque table, uploads résumables TUS. Vos données vocales sont protégées et accessibles.',
    color: 'text-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
  },
]

const PRICING = [
  {
    name: 'Découverte',
    target: 'Chercheurs, étudiants, universitaires',
    price: 'Gratuit',
    currency: '',
    period: 'pour toujours',
    euro: null,
    cta: 'Commencer gratuitement',
    ctaLink: '/register',
    highlight: false,
    theme: 'sand',
    features: [
      '1 projet',
      '500 phrases maximum',
      '3 locuteurs par projet',
      'Export LJSpeech uniquement',
      'QC automatique (profil ASR)',
      'Enregistrement phrase par phrase',
      'Upload TUS resumable (3G friendly)',
      'Stockage audio 30 jours',
      'Les exports restent téléchargeables 30 jours',
      '+ 4 fonctionnalités',
    ],
    conditions: [
      'Badge « Powered by Baat-IA » ajouté automatiquement dans les métadonnées du dataset exporté',
      'Les données sont contribuées sous licence CC-BY-4.0 — elles rejoignent le corpus ouvert Baat-IA pour les langues africaines',
      'Pas de support dédié — documentation et communauté uniquement',
    ],
    idealFor: "Vous faites un mémoire de master sur le NLP Wolof, un projet de recherche à l'UCAD ou à l'UGB, ou vous voulez simplement tester la plateforme avant de vous engager.",
  },
  {
    name: 'Pro',
    target: 'Startups IA, équipes R&D, freelances NLP',
    price: '25 000',
    currency: 'FCFA',
    period: '/ mois',
    euro: '~38€',
    cta: 'Démarrer en Pro',
    ctaLink: '/register',
    highlight: true,
    badge: 'Le plus populaire',
    theme: 'primary',
    features: [
      'Projets illimités',
      'Phrases illimitées par projet',
      '20 locuteurs par projet',
      'Tous les formats d\'export (LJSpeech, HuggingFace Datasets, CSV+WAV, NeMo manifest)',
      'Profils QC ASR et TTS',
      'Enregistrement phrase par phrase',
      'Upload TUS resumable (3G friendly)',
      'Stockage audio 90 jours',
      '+ 7 fonctionnalités',
    ],
    conditions: [
      'Paiement mensuel via Wave, Orange Money ou carte bancaire (PayDunya)',
      'Annulation possible à tout moment — vos données restent accessibles 30 jours après annulation',
      'Option : contribuez vos données en CC-BY-4.0 et obtenez -50% (12 500 FCFA/mois)',
    ],
    idealFor: "Vous développez un assistant vocal pour votre startup, vous entraînez un modèle TTS Pulaar pour un client, ou vous avez besoin de datasets de qualité production avec des critères ASR/TTS adaptés.",
  },
  {
    name: 'Entreprise',
    target: 'Entreprises tech, ESN, centres de recherche',
    price: '150 000',
    currency: 'FCFA',
    period: '/ mois',
    euro: '~230€',
    cta: 'Contacter l\'équipe',
    ctaLink: 'mailto:contact@baat-ia.com',
    highlight: false,
    theme: 'accent',
    features: [
      'Tout le plan Pro inclus',
      'Locuteurs illimités par projet',
      'Multi-utilisateurs (jusqu\'à 10 membres) avec des rôles : admin, éditeur, lecteur',
      'Support prioritaire (WhatsApp + email, réponse sous 24h en jours ouvrés)',
      'Analytics avancés (Distribution par dialecte, par genre, par tranche d\'âge, heatmap QC, évolution temporelle)',
      'API REST d\'accès aux données (Endpoints pour lister, filtrer et télécharger vos segments programmatiquement)',
      'Webhooks de notification (Recevez un POST quand un export est prêt ou un locuteur a fini)',
      'Export automatisé (Programmez un export quotidien/hebdomadaire automatique)',
      '+ 3 fonctionnalités',
    ],
    conditions: [
      'Paiement mensuel ou trimestriel (-10%) via virement, Wave, OM ou carte',
      'Facturation avec TVA si applicable',
      'Engagement minimum : 3 mois',
    ],
    idealFor: "Vous êtes Orange et vous construisez un IVR vocal en Wolof, vous êtes une ESN qui livre des projets IA pour des clients, ou vous êtes un centre de recherche avec une équipe de 5 personnes qui travaille sur le NLP des langues sénégalaises.",
  },
  {
    name: 'Sur-mesure',
    target: 'Grands comptes, institutions, ONG internationales',
    price: '500 000+',
    currency: 'FCFA',
    period: '/ projet',
    euro: 'à partir de ~760€',
    cta: 'Demander un devis',
    ctaLink: 'mailto:contact@baat-ia.com',
    highlight: false,
    theme: 'dark',
    features: [
      'Tout le plan Entreprise inclus',
      'Accompagnement dédié (On vous aide à rédiger les phrases, choisir les dialectes, recruter les locuteurs)',
      'Recrutement de locuteurs (Baat-IA recrute et gère les locuteurs pour vous via notre réseau au Sénégal et en Afrique de l\'Ouest)',
      'SLA garanti (Temps de traitement garanti, uptime 99.5%, pénalités en cas de non-respect)',
      'Hébergement dédié (Vos données restent au Sénégal sur un serveur dédié — conformité RGPD et souveraineté des données)',
      'Intégration custom (Connexion à votre SI, formats d\'export spécifiques, pipeline personnalisé)',
      'Facturation sur devis (Bon de commande, virement bancaire, facturation en FCFA ou EUR)',
      'Interlocuteur dédié',
      '+ 1 fonctionnalités',
    ],
    conditions: [
      'Devis personnalisé après un appel de cadrage (30 min)',
      'Le prix dépend du volume (nombre d\'heures cible), du nombre de langues, et du niveau d\'accompagnement',
      'Possibilité de paiement en plusieurs tranches',
    ],
    idealFor: "Vous êtes Orange Sénégal et vous voulez 10 000 heures de Wolof pour votre call center IA. Vous êtes le Ministère de l'Éducation et vous voulez un dataset de lecture en Pulaar pour un outil d'alphabétisation. Vous êtes une ONG internationale qui finance la préservation des langues sénégalaises.",
  },
]

// (Removed SAMPLE_PHRASES as it is now hardcoded in the visual composition)

export function LandingPage() {
  return (
    <div className="min-h-screen bg-sand-50 dark:bg-sand-950 overflow-x-hidden">
      {/* =========================================
          NAV
      ========================================= */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-sand-50/80 dark:bg-sand-950/80 backdrop-blur-xl border-b border-sand-200/50 dark:border-sand-800/50">
        <div className="max-w-[72rem] mx-auto px-5 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-md shadow-primary-500/30">
              <Mic className="w-4 h-4 text-white" />
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-secondary-500 border-2 border-sand-50 dark:border-sand-950" />
            </div>
            <span
              className="text-lg font-extrabold text-sand-900 dark:text-sand-100 tracking-tight"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Baat-IA
            </span>
          </div>

          {/* CTA nav */}
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="hidden sm:block text-sm font-semibold text-sand-600 dark:text-sand-400 hover:text-sand-900 dark:hover:text-sand-100 transition-colors"
            >
              Connexion
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white text-sm font-bold shadow-md shadow-primary-500/25 hover:scale-[1.02] hover:shadow-lg hover:shadow-primary-500/30 active:scale-[0.98] transition-all duration-200"
            >
              Démarrer gratuitement
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* =========================================
          HÉRO — Asymmetrical Editorial
      ========================================= */}
      <section className="relative min-h-screen flex flex-col justify-center pt-28 pb-20 px-5 overflow-hidden">
        {/* Background elements */}
        <div className="absolute inset-0 wax-pattern opacity-[0.03] dark:opacity-[0.05] pointer-events-none" />
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-primary-500/10 via-accent-500/5 to-transparent rounded-full blur-3xl pointer-events-none translate-x-1/3 -translate-y-1/4" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-secondary-500/10 to-transparent rounded-full blur-3xl pointer-events-none -translate-x-1/3 translate-y-1/4" />

        <div className="max-w-[76rem] mx-auto w-full grid lg:grid-cols-12 gap-12 lg:gap-8 items-center relative z-10">

          {/* Left Column: Copy & CTAs */}
          <div className="lg:col-span-6 flex flex-col items-start text-left">
            {/* Pill badge */}
            <div className="mb-6 animate-fade-in-up">
              <span className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/60 dark:bg-sand-900/60 backdrop-blur-md text-sand-800 dark:text-sand-200 text-xs font-bold uppercase tracking-widest border border-sand-200/80 dark:border-sand-800 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
                </span>
                Plateforme open data
              </span>
            </div>

            {/* Title */}
            <h1
              className="text-sand-900 dark:text-sand-100 leading-[0.95] mb-6 animate-fade-in-up animation-delay-100"
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'clamp(3rem, 7vw, 5.5rem)',
                fontWeight: 800,
                letterSpacing: '-0.03em',
              }}
            >
              La voix de{' '}
              <span className="relative inline-block whitespace-nowrap">
                <span className="relative z-10 text-primary-600 dark:text-primary-500">
                  l'Afrique
                </span>
                <svg className="absolute -bottom-2 left-0 w-full h-3" viewBox="0 0 100 10" preserveAspectRatio="none">
                  <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="4" fill="none" className="text-primary-200 dark:text-primary-900/50" strokeLinecap="round"/>
                </svg>
              </span>
              <br />
              mérite l'IA.
            </h1>

            {/* Subtitle */}
            <p className="text-sand-600 dark:text-sand-400 text-lg sm:text-xl leading-relaxed mb-10 max-w-[32rem] animate-fade-in-up animation-delay-200">
              Collectez, validez et exportez des <strong className="text-sand-900 dark:text-sand-100 font-semibold">datasets vocaux de haute qualité</strong> pour le Wolof, Pulaar, Sereer et Bambara. Conçu pour les chercheurs et les entreprises.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto animate-fade-in-up animation-delay-300">
              <Link
                to="/register"
                className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-sand-900 dark:bg-sand-100 text-white dark:text-sand-900 font-bold text-base overflow-hidden transition-transform hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto shadow-xl shadow-sand-900/20 dark:shadow-white/10"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-primary-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <Mic className="w-5 h-5 relative z-10" />
                <span className="relative z-10">Créer mon projet</span>
              </Link>
              <Link
                to="/login"
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-white/50 dark:bg-sand-900/50 backdrop-blur-sm border border-sand-200 dark:border-sand-800 text-sand-800 dark:text-sand-200 font-semibold text-base hover:bg-white dark:hover:bg-sand-800 hover:border-sand-300 dark:hover:border-sand-700 transition-all duration-200 w-full sm:w-auto"
              >
                <div className="w-6 h-6 rounded-full bg-sand-100 dark:bg-sand-800 flex items-center justify-center group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30 transition-colors">
                  <Play className="w-3 h-3 fill-sand-600 dark:fill-sand-400 group-hover:fill-primary-600 dark:group-hover:fill-primary-400" />
                </div>
                Voir la démo
              </Link>
            </div>
          </div>

          {/* Right Column: Visual Composition */}
          <div className="lg:col-span-6 relative h-[500px] sm:h-[600px] w-full mt-12 lg:mt-0 animate-fade-in-up animation-delay-400">
            {/* Central Decorative Elements */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full border border-sand-200/50 dark:border-sand-800/50 border-dashed animate-[spin_60s_linear_infinite]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] rounded-full border border-sand-200/30 dark:border-sand-800/30 border-dashed animate-[spin_90s_linear_infinite_reverse]" />

            {/* Card 1: Wolof (Top Left) */}
            <div className="absolute top-[10%] left-[5%] sm:left-[10%] w-[260px] p-4 rounded-2xl bg-white/80 dark:bg-sand-900/80 backdrop-blur-xl border border-sand-200/60 dark:border-sand-800 shadow-lg shadow-sand-900/5 transform -rotate-6 hover:rotate-0 hover:scale-105 transition-all duration-300 z-20">
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-1 rounded-lg bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 text-[10px] font-bold uppercase tracking-wider">Wolof</span>
                <div className="flex gap-1">
                  <div className="w-1 h-3 bg-sand-200 dark:bg-sand-700 rounded-full" />
                  <div className="w-1 h-4 bg-sand-200 dark:bg-sand-700 rounded-full" />
                  <div className="w-1 h-2 bg-sand-200 dark:bg-sand-700 rounded-full" />
                </div>
              </div>
              <p className="text-sand-900 dark:text-sand-100 font-semibold text-lg leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>
                Maa ngi dem ca kër gi
              </p>
            </div>

            {/* Card 2: Pulaar (Center Right - ACTIVE) */}
            <div className="absolute top-[35%] right-[0%] sm:right-[5%] w-[300px] p-5 rounded-3xl bg-gradient-to-br from-sand-900 to-black dark:from-sand-800 dark:to-sand-950 border border-sand-800 dark:border-sand-700 shadow-2xl shadow-primary-500/20 transform rotate-3 hover:rotate-0 hover:scale-105 transition-all duration-300 z-30">
              <div className="flex items-center justify-between mb-4">
                <span className="px-2.5 py-1 rounded-lg bg-white/10 text-white text-[10px] font-bold uppercase tracking-wider backdrop-blur-md">Pulaar</span>
                <span className="flex items-center gap-1.5 text-xs font-medium text-primary-400">
                  <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
                  Enregistrement...
                </span>
              </div>
              <p className="text-white font-bold text-xl leading-tight mb-5" style={{ fontFamily: 'var(--font-heading)' }}>
                Mi wii e galle ngam
              </p>
              {/* Active Waveform */}
              <div className="flex items-center justify-between gap-1 h-8 px-2">
                {[40, 70, 40, 100, 60, 80, 30, 90, 50, 70, 40, 80, 60, 30].map((h, i) => (
                  <div
                    key={i}
                    className="w-1.5 bg-primary-500 rounded-full animate-pulse"
                    style={{
                      height: `${h}%`,
                      animationDelay: `${i * 0.1}s`,
                      animationDuration: '0.8s'
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Card 3: Bambara (Bottom Left) */}
            <div className="absolute bottom-[15%] left-[0%] sm:left-[15%] w-[240px] p-4 rounded-2xl bg-white/80 dark:bg-sand-900/80 backdrop-blur-xl border border-sand-200/60 dark:border-sand-800 shadow-lg shadow-sand-900/5 transform -rotate-3 hover:rotate-0 hover:scale-105 transition-all duration-300 z-20">
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider">Bambara</span>
                <CheckCircle className="w-4 h-4 text-secondary-500" />
              </div>
              <p className="text-sand-900 dark:text-sand-100 font-semibold text-base leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>
                Ne bɛ taa so la
              </p>
            </div>

            {/* Floating Mic Button */}
            <div className="absolute top-[65%] left-[45%] -translate-x-1/2 -translate-y-1/2 z-40">
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-xl shadow-primary-500/40 border-4 border-white dark:border-sand-950 hover:scale-110 transition-transform cursor-pointer">
                <Mic className="w-7 h-7 text-white" />
              </div>
            </div>

          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-sand-400 animate-float animation-delay-500">
          <span className="text-[10px] uppercase tracking-widest font-semibold">Découvrir</span>
          <ChevronDown className="w-4 h-4" />
        </div>
      </section>

      {/* =========================================
          STATS — bande pleine largeur
      ========================================= */}
      <section className="relative bg-gradient-to-r from-sand-900 via-sand-900 to-sand-950 dark:from-sand-950 dark:to-sand-900 py-14 overflow-hidden">
        <div className="absolute inset-0 wax-pattern opacity-[0.04] pointer-events-none" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(249,115,22,0.08) 0%, transparent 70%)' }}
        />
        <div className="relative max-w-[56rem] mx-auto px-5">
          <div className="grid grid-cols-3 gap-6 sm:gap-10">
            {STATS.map((stat, i) => (
              <div
                key={stat.label}
                className="text-center animate-stagger-in"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <p
                  className="text-white leading-none mb-1 tabular-nums"
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                    fontWeight: 800,
                    letterSpacing: '-0.04em',
                  }}
                >
                  {stat.value}
                </p>
                <p className="text-sand-300 text-xs sm:text-sm font-semibold mb-0.5">{stat.label}</p>
                <p className="text-sand-500 text-[11px] hidden sm:block">{stat.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================
          LANGUES — grille éditoriale
      ========================================= */}
      <section className="py-20 px-5 max-w-[72rem] mx-auto">
        <div className="flex flex-col lg:flex-row gap-12 items-center">
          {/* Texte gauche */}
          <div className="flex-1 max-w-[28rem]">
            <div className="mb-4">
              <span className="text-[11px] font-bold text-primary-500 uppercase tracking-widest">Langues supportées</span>
            </div>
            <h2
              className="text-sand-900 dark:text-sand-100 mb-4"
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                lineHeight: 0.95,
              }}
            >
              Des millions de locuteurs,
              <br />
              <span className="text-primary-500">enfin représentés</span>
            </h2>
            <p className="text-sand-600 dark:text-sand-400 leading-relaxed text-sm sm:text-base">
              Wolof, Pulaar, Sereer, Bambara — des langues parlées par plus de 40 millions de personnes mais quasi absentes des datasets d'entraînement IA existants.
            </p>
            <p className="text-sand-600 dark:text-sand-400 leading-relaxed text-sm sm:text-base mt-3">
              Baat-IA vous donne les outils pour combler ce manque. Phrase par phrase.
            </p>
          </div>

          {/* Grille langues */}
          <div className="flex-1 grid grid-cols-2 gap-4 w-full max-w-[32rem]">
            {LANGUAGES.map((lang, i) => (
              <div
                key={lang.code}
                className="relative overflow-hidden rounded-2xl p-5 border border-sand-200/60 dark:border-sand-800 bg-white dark:bg-sand-900 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary-500/8 transition-all duration-250 group animate-stagger-in"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                {/* Gradient coin */}
                <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl ${lang.color} opacity-10 rounded-bl-[40px] pointer-events-none group-hover:opacity-15 transition-opacity`} />

                <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br ${lang.color} mb-3 shadow-sm`}>
                  <span className="text-white text-xs font-black uppercase">{lang.code.slice(0, 2)}</span>
                </div>
                <p
                  className="text-lg font-black text-sand-900 dark:text-sand-100 leading-none mb-1"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {lang.name}
                </p>
                <p className="text-xs text-sand-500 dark:text-sand-400 mb-3">{lang.region}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-sand-400">Locuteurs</span>
                  <span className="text-sm font-black text-sand-800 dark:text-sand-200 tabular-nums" style={{ fontFamily: 'var(--font-heading)' }}>
                    {lang.speakers}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================
          FEATURES — comment ça marche
      ========================================= */}
      <section className="py-20 px-5 bg-sand-100/50 dark:bg-sand-900/30">
        <div className="max-w-[72rem] mx-auto">
          <div className="text-center mb-14">
            <span className="text-[11px] font-bold text-primary-500 uppercase tracking-widest block mb-3">Fonctionnalités</span>
            <h2
              className="text-sand-900 dark:text-sand-100"
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                lineHeight: 0.95,
              }}
            >
              Tout ce qu'il faut pour
              <br />
              un dataset de qualité
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((feature, i) => (
              <div
                key={feature.title}
                className={`rounded-2xl p-6 border border-sand-200/60 dark:border-sand-800 ${feature.bg} animate-stagger-in hover:-translate-y-1 transition-transform duration-250`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className={`w-10 h-10 rounded-xl bg-white dark:bg-sand-900 flex items-center justify-center mb-4 shadow-sm border border-sand-200/60 dark:border-sand-800`}>
                  <feature.icon className={`w-5 h-5 ${feature.color}`} />
                </div>
                <h3
                  className="text-base font-bold text-sand-900 dark:text-sand-100 mb-2"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {feature.title}
                </h3>
                <p className="text-sm text-sand-600 dark:text-sand-400 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================
          WORKFLOW — 3 étapes
      ========================================= */}
      <section className="py-20 px-5 max-w-[72rem] mx-auto">
        <div className="text-center mb-14">
          <span className="text-[11px] font-bold text-primary-500 uppercase tracking-widest block mb-3">Comment ça marche</span>
          <h2
            className="text-sand-900 dark:text-sand-100"
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 0.95,
            }}
          >
            3 étapes vers votre dataset
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6 relative">
          {/* Ligne de connexion (desktop) */}
          <div className="hidden md:block absolute top-10 left-[calc(16.67%+1.5rem)] right-[calc(16.67%+1.5rem)] h-px bg-gradient-to-r from-primary-200 via-primary-400 to-primary-200 dark:from-primary-900 dark:via-primary-700 dark:to-primary-900" />

          {[
            {
              step: '01',
              title: 'Créez votre projet',
              desc: 'Uploadez vos phrases texte, définissez la langue cible et le type d\'usage (ASR ou TTS). En 3 minutes.',
              icon: FolderPlus,
            },
            {
              step: '02',
              title: 'Invitez des locuteurs',
              desc: 'Générez des liens de session. Vos locuteurs accèdent via mobile sans compte — ils lisent, enregistrent, c\'est tout.',
              icon: Users,
            },
            {
              step: '03',
              title: 'Exportez votre dataset',
              desc: 'Téléchargez un ZIP au format LJSpeech ou HuggingFace, prêt à être injecté dans votre pipeline d\'entraînement.',
              icon: Download,
            },
          ].map((step, i) => (
            <div
              key={step.step}
              className="relative bg-white dark:bg-sand-900 rounded-2xl p-6 border border-sand-200/60 dark:border-sand-800 shadow-md animate-stagger-in hover:-translate-y-1 hover:shadow-lg hover:shadow-primary-500/8 transition-all duration-250"
              style={{ animationDelay: `${i * 120}ms` }}
            >
              {/* Numéro d'étape */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center mb-4 text-white text-sm font-black shadow-md shadow-primary-500/30" style={{ fontFamily: 'var(--font-heading)' }}>
                {step.step}
              </div>
              <div className="w-12 h-12 rounded-xl bg-sand-100 dark:bg-sand-800 flex items-center justify-center mb-4 shadow-sm border border-sand-200/60 dark:border-sand-700">
                <step.icon className="w-6 h-6 text-sand-700 dark:text-sand-300" />
              </div>
              <h3
                className="text-lg font-bold text-sand-900 dark:text-sand-100 mb-2"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {step.title}
              </h3>
              <p className="text-sm text-sand-600 dark:text-sand-400 leading-relaxed">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================
          POUR QUI — 2 colonnes
      ========================================= */}
      <section className="py-20 px-5 bg-sand-100/50 dark:bg-sand-900/30">
        <div className="max-w-[64rem] mx-auto grid md:grid-cols-2 gap-6">
          {[
            {
              audience: 'Chercheurs & Académiques',
              icon: Microscope,
              items: [
                'Collecte structurée de données annotées',
                'Export compatible HuggingFace Datasets',
                'Méta-données locuteurs : âge, genre, dialecte',
                'API REST + webhooks pour vos pipelines',
              ],
              cta: 'Pour la recherche',
              color: 'from-accent-500 to-accent-700',
              iconColor: 'text-accent-500',
              bgAccent: 'from-accent-500/8 to-transparent',
            },
            {
              audience: 'Entreprises & Startups',
              icon: Rocket,
              items: [
                'Déploiement rapide, sans infrastructure',
                'Sessions locuteurs sécurisées et scalables',
                'Formats ASR/TTS prêts à l\'emploi',
                'Contrôle qualité automatisé par segment',
              ],
              cta: 'Pour les entreprises',
              color: 'from-primary-500 to-primary-700',
              iconColor: 'text-primary-500',
              bgAccent: 'from-primary-500/8 to-transparent',
            },
          ].map((card) => (
            <div
              key={card.audience}
              className="relative overflow-hidden rounded-2xl bg-white dark:bg-sand-900 border border-sand-200/60 dark:border-sand-800 p-7 shadow-md"
            >
              <div className={`absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl ${card.bgAccent} rounded-bl-[80px] pointer-events-none`} />
              <div className="w-12 h-12 rounded-xl bg-sand-50 dark:bg-sand-950/50 flex items-center justify-center mb-5 shadow-sm border border-sand-200/60 dark:border-sand-800">
                <card.icon className={`w-6 h-6 ${card.iconColor}`} />
              </div>
              <h3
                className="text-xl font-black text-sand-900 dark:text-sand-100 mb-4"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {card.audience}
              </h3>
              <ul className="space-y-2.5 mb-6">
                {card.items.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-sand-700 dark:text-sand-300">
                    <CheckCircle className="w-4 h-4 text-secondary-500 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                to="/register"
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r ${card.color} text-white text-sm font-bold shadow-md hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] transition-all duration-200`}
              >
                {card.cta}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================
          PRICING — Tarifs
      ========================================= */}
      <section className="py-24 px-5 bg-sand-50 dark:bg-sand-950 relative overflow-hidden">
        <div className="max-w-[76rem] mx-auto relative z-10">
          <div className="text-center mb-16">
            <span className="text-[11px] font-bold text-primary-500 uppercase tracking-widest block mb-3">Tarifs</span>
            <h2
              className="text-sand-900 dark:text-sand-100 mb-4"
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                lineHeight: 0.95,
              }}
            >
              Créez vos datasets vocaux
              <br />
              <span className="text-primary-500">au juste prix</span>
            </h2>
            <p className="text-sand-600 dark:text-sand-400 text-base sm:text-lg max-w-[36rem] mx-auto">
              Du chercheur universitaire au grand compte, un plan adapté à chaque besoin et chaque budget.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 lg:gap-8 items-start">
            {PRICING.map((plan) => {
              const isDark = plan.theme === 'dark'
              const isPro = plan.theme === 'primary'

              return (
                <div
                  key={plan.name}
                  className={`relative rounded-3xl p-6 sm:p-8 transition-all duration-300 hover:-translate-y-1 ${
                    isPro
                      ? 'bg-white dark:bg-sand-900 border-2 border-primary-500 shadow-2xl shadow-primary-500/15 z-10'
                      : isDark
                        ? 'bg-sand-950 dark:bg-black border border-sand-800 shadow-xl'
                        : 'bg-white dark:bg-sand-900 border border-sand-200/60 dark:border-sand-800 shadow-lg shadow-sand-900/5'
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 text-white text-xs font-bold uppercase tracking-widest shadow-md shadow-primary-500/30">
                        <Sparkles className="w-3.5 h-3.5" />
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  {/* Header */}
                  <div className="mb-6">
                    <p className={`text-[11px] font-bold uppercase tracking-widest mb-3 ${isDark ? 'text-sand-400' : 'text-sand-500'}`}>
                      {plan.target}
                    </p>
                    <h3
                      className={`text-2xl sm:text-3xl font-black mb-4 ${
                        isPro ? 'text-primary-600 dark:text-primary-500' : isDark ? 'text-white' : 'text-sand-900 dark:text-sand-100'
                      }`}
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      {plan.name}
                    </h3>
                    <div className="flex items-baseline gap-2">
                      <span
                        className={`text-4xl sm:text-5xl font-black tracking-tight tabular-nums ${isDark ? 'text-white' : 'text-sand-900 dark:text-sand-100'}`}
                        style={{ fontFamily: 'var(--font-heading)' }}
                      >
                        {plan.price}
                      </span>
                      {plan.currency && (
                        <span className={`text-xl font-bold ${isDark ? 'text-sand-300' : 'text-sand-600 dark:text-sand-400'}`}>
                          {plan.currency}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-sm font-medium ${isDark ? 'text-sand-400' : 'text-sand-500'}`}>
                        {plan.period}
                      </span>
                      {plan.euro && (
                        <>
                          <span className={`w-1 h-1 rounded-full ${isDark ? 'bg-sand-700' : 'bg-sand-300'}`} />
                          <span className={`text-sm font-medium ${isDark ? 'text-sand-500' : 'text-sand-400'}`}>
                            {plan.euro}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* CTA */}
                  <Link
                    to={plan.ctaLink || '/register'}
                    className={`flex items-center justify-center w-full py-3.5 rounded-xl font-bold text-sm transition-all duration-200 mb-8 ${
                      isPro
                        ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md shadow-primary-500/25 hover:shadow-lg hover:scale-[1.02]'
                        : isDark
                          ? 'bg-white text-sand-950 hover:bg-sand-100'
                          : 'bg-sand-100 dark:bg-sand-800 text-sand-800 dark:text-sand-200 hover:bg-sand-200 dark:hover:bg-sand-700'
                    }`}
                  >
                    {plan.cta}
                  </Link>

                  {/* Features */}
                  <div className="mb-8">
                    <ul className="space-y-3">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <Check className={`w-5 h-5 shrink-0 mt-0.5 ${
                            isPro ? 'text-primary-500' : isDark ? 'text-sand-500' : 'text-secondary-500'
                          }`} />
                          <span className={`text-sm leading-relaxed ${isDark ? 'text-sand-300' : 'text-sand-700 dark:text-sand-300'}`}>
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Divider */}
                  <div className={`h-px w-full mb-6 ${isDark ? 'bg-sand-800' : 'bg-sand-100 dark:bg-sand-800'}`} />

                  {/* Conditions */}
                  <div className="mb-6">
                    <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${isDark ? 'text-sand-500' : 'text-sand-400'}`}>
                      Conditions
                    </p>
                    <ul className="space-y-2.5">
                      {plan.conditions.map((cond, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <Info className={`w-4 h-4 shrink-0 mt-0.5 ${isDark ? 'text-sand-600' : 'text-sand-400'}`} />
                          <span className={`text-xs leading-relaxed ${isDark ? 'text-sand-400' : 'text-sand-500 dark:text-sand-400'}`}>
                            {cond}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Ideal For */}
                  <div className={`p-4 rounded-xl ${isDark ? 'bg-sand-900/50 border border-sand-800' : 'bg-sand-50 dark:bg-sand-950/50 border border-sand-100 dark:border-sand-800'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Target className={`w-4 h-4 ${isPro ? 'text-primary-500' : isDark ? 'text-sand-400' : 'text-sand-500'}`} />
                      <span className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-sand-300' : 'text-sand-700 dark:text-sand-300'}`}>
                        Idéal pour
                      </span>
                    </div>
                    <p className={`text-sm italic leading-relaxed ${isDark ? 'text-sand-400' : 'text-sand-600 dark:text-sand-400'}`}>
                      "{plan.idealFor}"
                    </p>
                  </div>

                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* =========================================
          CTA FINAL — impact maximal
      ========================================= */}
      <section className="relative overflow-hidden py-24 px-5">
        {/* Fond sombre dramatique */}
        <div className="absolute inset-0 bg-gradient-to-br from-sand-900 via-sand-950 to-black" />
        <div className="absolute inset-0 wax-pattern opacity-[0.05] pointer-events-none" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 100%, rgba(249,115,22,0.15) 0%, transparent 60%)' }}
        />

        <div className="relative max-w-[48rem] mx-auto text-center">
          {/* Micro décoratif */}
          <div className="relative inline-flex items-center justify-center w-20 h-20 mb-8">
            <div className="absolute inset-0 rounded-full bg-primary-500/20 animate-ping" />
            <div className="absolute inset-[-8px] rounded-full bg-primary-500/10 animate-pulse" />
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-2xl shadow-primary-500/50 z-10">
              <Mic className="w-9 h-9 text-white" />
            </div>
          </div>

          <h2
            className="text-white mb-5"
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              fontWeight: 800,
              letterSpacing: '-0.04em',
              lineHeight: 0.95,
            }}
          >
            Commencez à construire
            <br />
            <span className="text-primary-400">la voix de demain</span>
          </h2>

          <p className="text-sand-400 text-base sm:text-lg mb-10 max-w-[28rem] mx-auto leading-relaxed">
            Rejoignez les équipes qui construisent l'IA vocale pour les langues africaines. Gratuit pour démarrer.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold text-base shadow-2xl shadow-primary-500/40 hover:scale-[1.02] hover:shadow-primary-500/50 active:scale-[0.98] transition-all duration-200"
            >
              <Mic className="w-5 h-5" />
              Créer un compte gratuit
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sand-400 hover:text-white font-semibold text-sm transition-colors group"
            >
              Déjà un compte ?
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
            </Link>
          </div>

          {/* Réassurance */}
          <div className="flex items-center justify-center gap-6 mt-10 flex-wrap">
            {['Aucune CB requise', 'Données sécurisées', 'Support francophone'].map((item) => (
              <span key={item} className="flex items-center gap-1.5 text-xs text-sand-500 font-medium">
                <CheckCircle className="w-3.5 h-3.5 text-secondary-500" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================
          FOOTER minimal
      ========================================= */}
      <footer className="border-t border-sand-200/50 dark:border-sand-800/50 py-8 px-5">
        <div className="max-w-[72rem] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
              <Mic className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-bold text-sand-700 dark:text-sand-300" style={{ fontFamily: 'var(--font-heading)' }}>
              Baat-IA
            </span>
          </div>
          <p className="text-xs text-sand-400 text-center">
            © 2025 Baat-IA · Datasets vocaux pour les langues africaines
          </p>
          <div className="flex items-center gap-4 text-xs text-sand-500">
            <Link to="/login" className="hover:text-sand-700 dark:hover:text-sand-300 transition-colors">Connexion</Link>
            <Link to="/register" className="hover:text-sand-700 dark:hover:text-sand-300 transition-colors">Inscription</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
