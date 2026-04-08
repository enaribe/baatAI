import { Link } from 'react-router-dom'
import { FolderPlus, Mic, FileText, CheckCircle2, BarChart3, Sparkles } from 'lucide-react'
import { useProjects } from '../hooks/use-projects'
import { useAuth } from '../hooks/use-auth'
import { StatCard } from '../components/stat-card'
import { ProjectCard } from '../components/project-card'
import { Button } from '../components/ui/button'
import { Skeleton } from '../components/ui/skeleton'

export function DashboardPage() {
  const { user } = useAuth()
  const { projects, loading, error } = useProjects()

  const totalProjects = projects.length
  const totalPhrases = projects.reduce((sum, p) => sum + p.total_phrases, 0)
  const totalRecordings = projects.reduce((sum, p) => sum + p.total_recordings, 0)
  const totalValid = projects.reduce((sum, p) => sum + p.valid_recordings, 0)

  const displayName = (user?.user_metadata?.full_name as string | undefined)?.split(' ')[0]
    || user?.email?.split('@')[0]
    || ''

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Bonjour'
    if (h < 18) return 'Bon après-midi'
    return 'Bonsoir'
  })()

  return (
    <div className="p-5 sm:p-6 lg:p-8 max-w-[76rem]">
      {/* Header avec hero subtle */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-50 via-white to-sand-50 dark:from-primary-950/30 dark:via-sand-900 dark:to-sand-950 border border-sand-200/60 dark:border-sand-800 p-6 sm:p-8 mb-6">
        {/* Wax pattern très léger en arrière-plan */}
        <div className="absolute inset-0 wax-pattern opacity-[0.025] pointer-events-none dark:opacity-[0.04]" />
        {/* Glow */}
        <div
          className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.10) 0%, transparent 70%)' }}
        />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-primary-500 uppercase tracking-widest">{greeting}</span>
              <Sparkles className="w-3.5 h-3.5 text-primary-400" />
            </div>
            <h1
              className="text-sand-900 dark:text-sand-100"
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'clamp(1.6rem, 3vw, 2.4rem)',
                fontWeight: 800,
                lineHeight: 1.0,
                letterSpacing: '-0.03em',
              }}
            >
              {displayName}
            </h1>
            <p className="mt-1.5 text-sand-500 dark:text-sand-400 text-sm">
              {totalProjects > 0
                ? `${totalProjects} projet${totalProjects > 1 ? 's' : ''} · ${totalRecordings.toLocaleString('fr-FR')} enregistrements collectés`
                : 'Prêt à créer votre premier dataset vocal ?'
              }
            </p>
          </div>
          <Link to="/project/new">
            <Button icon={<FolderPlus className="w-4 h-4" />} size="lg">
              Nouveau projet
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[112px] rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          <StatCard
            label="Projets"
            value={totalProjects}
            icon={<BarChart3 className="w-5 h-5" />}
            color="accent"
            delay={0}
          />
          <StatCard
            label="Phrases"
            value={totalPhrases}
            icon={<FileText className="w-5 h-5" />}
            color="primary"
            delay={100}
          />
          <StatCard
            label="Enregistrements"
            value={totalRecordings}
            icon={<Mic className="w-5 h-5" />}
            color="primary"
            delay={200}
          />
          <StatCard
            label="Validés"
            value={totalValid}
            icon={<CheckCircle2 className="w-5 h-5" />}
            color="secondary"
            delay={300}
          />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm mb-6 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
          {error}
        </div>
      )}

      {/* Projects section */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2
            className="text-sand-900 dark:text-sand-100"
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(1.1rem, 2vw, 1.4rem)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
            }}
          >
            Vos projets
          </h2>
          {!loading && (
            <p className="text-xs text-sand-400 mt-0.5">
              {totalProjects} projet{totalProjects !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[200px] rounded-2xl" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        /* Empty state illustré */
        <div className="relative overflow-hidden text-center py-16 px-8 bg-white dark:bg-sand-900 rounded-2xl border border-sand-200/60 dark:border-sand-800">
          <div className="absolute inset-0 wax-pattern opacity-[0.025] pointer-events-none" />
          {/* Illustration SVG simple */}
          <div className="relative w-20 h-20 mx-auto mb-5">
            <div className="absolute inset-0 rounded-full bg-primary-100 dark:bg-primary-900/30 animate-pulse-soft" />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary-100 to-primary-50 dark:from-primary-900/40 dark:to-primary-950/20 flex items-center justify-center border-2 border-primary-200/50 dark:border-primary-800/50">
              <Mic className="w-9 h-9 text-primary-400" />
            </div>
          </div>
          <h3
            className="text-xl font-bold text-sand-800 dark:text-sand-200 mb-2"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Votre premier dataset commence ici
          </h3>
          <p className="text-sand-500 dark:text-sand-400 text-sm mb-6 max-w-[28rem] mx-auto leading-relaxed">
            Uploadez vos phrases, invitez des locuteurs, et collectez des enregistrements vocaux de qualité pour entraîner vos modèles ASR/TTS.
          </p>
          <Link to="/project/new">
            <Button icon={<FolderPlus className="w-4 h-4" />} size="lg">
              Créer mon premier projet
            </Button>
          </Link>
          {/* Langues supportées */}
          <div className="flex items-center justify-center gap-2 mt-8">
            {['Wolof', 'Pulaar', 'Sereer', 'Bambara'].map((lang) => (
              <span
                key={lang}
                className="px-3 py-1 rounded-full text-[11px] font-semibold bg-sand-100 dark:bg-sand-800 text-sand-600 dark:text-sand-400 border border-sand-200 dark:border-sand-700"
              >
                {lang}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project, i) => (
            <div
              key={project.id}
              className="animate-stagger-in"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <ProjectCard
                id={project.id}
                name={project.name}
                description={project.description}
                languageLabel={project.language_label}
                targetLanguage={project.target_language}
                usageType={project.usage_type}
                status={project.status}
                totalPhrases={project.total_phrases}
                totalRecordings={project.total_recordings}
                validRecordings={project.valid_recordings}
                createdAt={project.created_at}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
