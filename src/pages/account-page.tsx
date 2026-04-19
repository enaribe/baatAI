import { useState } from 'react'
import { Mail, User, Building2, Trash2 } from 'lucide-react'
import { useAuth } from '../hooks/use-auth'
import { DeleteAccountModal } from '../components/delete-account-modal'

export function AccountPage() {
  const { user } = useAuth()
  const [deleteOpen, setDeleteOpen] = useState(false)

  const fullName = (user?.user_metadata?.full_name as string | undefined) ?? null
  const organization = (user?.user_metadata?.organization as string | undefined) ?? null

  return (
    <div className="max-w-[42rem] mx-auto px-4 sm:px-6 py-8">
      <h1
        className="text-2xl font-extrabold text-sand-900 dark:text-sand-100 mb-1"
        style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}
      >
        Mon compte
      </h1>
      <p className="text-sm text-sand-500 mb-8">Gérez les informations et préférences de votre compte.</p>

      {/* Infos */}
      <div className="bg-white dark:bg-sand-900 rounded-2xl border border-sand-200/70 dark:border-sand-800/70 divide-y divide-sand-100 dark:divide-sand-800">
        <Row icon={User} label="Nom" value={fullName ?? 'Non renseigné'} />
        <Row icon={Mail} label="Email" value={user?.email ?? '—'} />
        {organization && <Row icon={Building2} label="Organisation" value={organization} />}
      </div>

      {/* Zone danger */}
      <div className="mt-8 pt-6 border-t border-sand-200/60 dark:border-sand-800">
        <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest mb-2">Zone danger</p>
        <div className="bg-white dark:bg-sand-900 rounded-2xl border border-red-200/70 dark:border-red-900/40 p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-extrabold text-sand-900 dark:text-sand-100"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Supprimer mon compte
              </p>
              <p className="text-xs text-sand-500 leading-relaxed mt-1">
                Action irréversible. Archivez ou terminez vos projets actifs avant de supprimer votre compte.
              </p>
            </div>
            <button
              onClick={() => setDeleteOpen(true)}
              className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Supprimer
            </button>
          </div>
        </div>
      </div>

      <DeleteAccountModal open={deleteOpen} onClose={() => setDeleteOpen(false)} />
    </div>
  )
}

function Row({ icon: Icon, label, value }: {
  icon: typeof User
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <div className="w-8 h-8 rounded-xl bg-sand-100 dark:bg-sand-800 flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-sand-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-sand-400 uppercase tracking-widest">{label}</p>
        <p className="text-sm text-sand-900 dark:text-sand-100 truncate">{value}</p>
      </div>
    </div>
  )
}
