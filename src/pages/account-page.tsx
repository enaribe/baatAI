import { useState } from 'react'
import { Mail, User, Building2, AlertTriangle, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/use-auth'
import { DeleteAccountModal } from '../components/delete-account-modal'

const sans = { fontFamily: 'var(--font-body)', fontFeatureSettings: "'cv01','ss03'" }
const mono = { fontFamily: 'var(--font-mono)' }

export function AccountPage() {
  const { user } = useAuth()
  const [deleteOpen, setDeleteOpen] = useState(false)

  const fullName = (user?.user_metadata?.full_name as string | undefined) ?? null
  const organization = (user?.user_metadata?.organization as string | undefined) ?? null

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-10 flex items-center gap-3 px-5 lg:px-8 h-[52px] border-b border-[rgba(255,255,255,0.05)] bg-[rgba(8,9,10,0.9)] backdrop-blur-md">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-[12px] text-[#8a8f98] hover:text-[#f7f8f8] transition-colors"
          style={sans}
        >
          <ArrowLeft className="w-[13px] h-[13px]" strokeWidth={1.75} />
          Dashboard
        </Link>
        <span className="w-px h-3 bg-[rgba(255,255,255,0.1)]" />
        <span className="text-[11px] text-[#62666d]" style={mono}>
          /account
        </span>
      </header>

      <div className="max-w-[640px] mx-auto px-5 lg:px-8 py-10">
        <h1
          className="text-[28px] text-[#f7f8f8] m-0"
          style={{ ...sans, fontWeight: 510, letterSpacing: '-0.5px' }}
        >
          Mon compte
        </h1>
        <p className="text-[14px] text-[#8a8f98] mt-2" style={sans}>
          Gérez les informations et préférences de votre compte.
        </p>

        {/* Section Informations */}
        <section className="mt-8">
          <div
            className="text-[11px] text-[#62666d] uppercase mb-3"
            style={{ ...sans, fontWeight: 510, letterSpacing: '0.04em' }}
          >
            Informations
          </div>
          <div
            className="rounded-[10px]"
            style={{
              background: 'var(--t-surface)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <Row icon={<User className="w-3.5 h-3.5" strokeWidth={1.75} />} label="Nom" value={fullName ?? 'Non renseigné'} />
            <Divider />
            <Row icon={<Mail className="w-3.5 h-3.5" strokeWidth={1.75} />} label="Email" value={user?.email ?? '—'} mono />
            {organization && (
              <>
                <Divider />
                <Row icon={<Building2 className="w-3.5 h-3.5" strokeWidth={1.75} />} label="Organisation" value={organization} />
              </>
            )}
          </div>
        </section>

        {/* Zone danger */}
        <section className="mt-10">
          <div
            className="text-[11px] text-[#fca5a5] uppercase mb-3"
            style={{ ...sans, fontWeight: 510, letterSpacing: '0.04em' }}
          >
            Zone dangereuse
          </div>
          <div
            className="rounded-[10px] p-5"
            style={{
              background: 'var(--t-danger-muted-bg)',
              border: '1px solid var(--t-danger-muted-border)',
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-8 h-8 flex items-center justify-center rounded-md shrink-0"
                style={{
                  background: 'var(--t-danger-muted-bg)',
                  border: '1px solid var(--t-danger-muted-border)',
                }}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-[#fca5a5]" strokeWidth={1.75} />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-[14px] text-[#f7f8f8]"
                  style={{ ...sans, fontWeight: 590 }}
                >
                  Supprimer mon compte
                </p>
                <p className="text-[12px] text-[#8a8f98] mt-1 leading-relaxed" style={sans}>
                  Action irréversible. Archivez ou terminez vos projets actifs avant de supprimer votre compte.
                </p>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setDeleteOpen(true)}
                className="inline-flex items-center gap-1.5 h-[30px] px-3 text-[12px] rounded-md transition-colors"
                style={{
                  ...sans,
                  fontWeight: 510,
                  color: 'var(--t-danger-text)',
                  background: 'var(--t-danger-muted-bg)',
                  border: '1px solid var(--t-danger-muted-border)',
                }}
              >
                Supprimer mon compte
              </button>
            </div>
          </div>
        </section>
      </div>

      <DeleteAccountModal open={deleteOpen} onClose={() => setDeleteOpen(false)} />
    </div>
  )
}

function Row({
  icon, label, value, mono: isMono,
}: {
  icon: React.ReactNode
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <div
        className="w-7 h-7 flex items-center justify-center rounded-md text-[#8a8f98] shrink-0"
        style={{
          background: 'var(--t-surface-hover)',
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-[10px] text-[#62666d] uppercase"
          style={{ ...sans, fontWeight: 510, letterSpacing: '0.04em' }}
        >
          {label}
        </p>
        <p
          className="text-[13px] text-[#f7f8f8] truncate"
          style={isMono ? mono : sans}
        >
          {value}
        </p>
      </div>
    </div>
  )
}

function Divider() {
  return <div className="h-px mx-5" style={{ background: 'var(--t-border-subtle)' }} />
}
