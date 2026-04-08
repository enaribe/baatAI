import type { ReactNode } from 'react'

interface PublicLayoutProps {
  children: ReactNode
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-sand-50 px-4 py-8 relative overflow-hidden">
      {/* Wax pattern overlay — très léger */}
      <div
        className="absolute inset-0 wax-pattern opacity-[0.035] pointer-events-none"
        aria-hidden="true"
      />

      {/* Warm glow blob */}
      <div
        className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(249,115,22,0.08) 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />
      <div
        className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-[420px] animate-fade-in-up">
        {children}
      </div>
    </div>
  )
}
