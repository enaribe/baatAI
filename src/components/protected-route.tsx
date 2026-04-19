import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../hooks/use-auth'
import type { UserRole } from '../types/database'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: ReactNode
  allowedRoles?: UserRole[]
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading, role, roleStatus } = useAuth()

  if (loading || (user && (roleStatus === 'idle' || roleStatus === 'loading'))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sand-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (roleStatus === 'error' || !role) {
    console.warn('[PROTECTED-ROUTE] Rôle introuvable pour un user authentifié – redirection /login')
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    if (role === 'speaker') return <Navigate to="/speaker/dashboard" replace />
    if (role === 'admin') return <Navigate to="/admin/speakers" replace />
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
