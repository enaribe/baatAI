import { createContext, useEffect, useState, useCallback, useRef } from 'react'
import type { ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { UserRole } from '../types/database'

export interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  role: UserRole | null
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: UserRole,
    organization?: string,
  ) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

function extractRole(user: User | null): UserRole | null {
  if (!user) return null
  const raw = (user.user_metadata?.role ?? null) as string | null
  if (raw === 'client' || raw === 'speaker' || raw === 'admin') return raw
  return null
}

interface ProfileCheck {
  exists: boolean
  status: 'active' | 'suspended' | 'revoked' | null
  role: UserRole | null
}

/**
 * Vérifie que le profil correspondant à un user existe encore en base
 * et que son statut autorise l'accès. Si le profil a été supprimé
 * (ex: reset DB, suppression compte), on retourne exists=false → signOut.
 */
async function checkProfile(userId: string): Promise<ProfileCheck> {
  type ProfileRow = { status: string | null; role: string | null }
  const { data, error } = await (supabase
    .from('profiles')
    .select('status, role')
    .eq('id', userId)
    .maybeSingle() as unknown as Promise<{
      data: ProfileRow | null
      error: { message: string; code?: string } | null
    }>)

  if (error) {
    // Erreur réseau : on laisse passer pour ne pas déconnecter à tort
    console.warn('[auth] checkProfile error (network?):', error.message)
    return { exists: true, status: 'active', role: null }
  }

  if (!data) {
    return { exists: false, status: null, role: null }
  }

  const status = data.status as ProfileCheck['status'] | null
  const role = (data.role === 'client' || data.role === 'speaker' || data.role === 'admin')
    ? data.role
    : null

  return {
    exists: true,
    status: status ?? 'active',
    role,
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [dbRole, setDbRole] = useState<UserRole | null>(null)
  const validatingRef = useRef(false)

  /**
   * Synchronise la session côté React + valide le profil en base.
   * Si le profil n'existe plus → signOut forcé.
   */
  const syncSession = useCallback(async (s: Session | null) => {
    if (!s?.user) {
      setSession(null)
      setUser(null)
      setDbRole(null)
      setLoading(false)
      return
    }

    // Évite les re-validations concurrentes (ex: storm de TOKEN_REFRESHED)
    if (validatingRef.current) {
      setSession(s)
      setUser(s.user)
      setLoading(false)
      return
    }
    validatingRef.current = true

    try {
      const check = await checkProfile(s.user.id)

      if (!check.exists) {
        console.warn('[auth] Profil introuvable pour user', s.user.id, '→ signOut forcé')
        await supabase.auth.signOut()
        setSession(null)
        setUser(null)
        setDbRole(null)
        // Redirection forcée vers la landing pour casser les pages cachées
        if (typeof window !== 'undefined' && !window.location.pathname.match(/^\/(login|register|request-access|$)/)) {
          window.location.replace('/login')
        }
        return
      }

      if (check.status === 'revoked' || check.status === 'suspended') {
        console.warn('[auth] Compte', check.status, '→ signOut forcé')
        await supabase.auth.signOut()
        setSession(null)
        setUser(null)
        setDbRole(null)
        if (typeof window !== 'undefined') {
          const reason = check.status === 'suspended' ? 'suspended' : 'revoked'
          window.location.replace(`/login?account=${reason}`)
        }
        return
      }

      setSession(s)
      setUser(s.user)
      setDbRole(check.role)
    } finally {
      validatingRef.current = false
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      void syncSession(s)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      void syncSession(s)
    })

    return () => subscription.unsubscribe()
  }, [syncSession])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error ? new Error(error.message) : null }
  }, [])

  const signUp = useCallback(async (
    email: string,
    password: string,
    fullName: string,
    userRole: UserRole = 'client',
    organization?: string,
  ) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          organization: organization ?? null,
          role: userRole,
        },
      },
    })
    if (error) return { error: new Error(error.message) }
    return { error: null }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  // Role : on privilégie la valeur de la DB (source de vérité),
  // sinon fallback sur le JWT metadata pour ne pas casser pendant le loading.
  const role = dbRole ?? extractRole(user)

  return (
    <AuthContext.Provider value={{ user, session, loading, role, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
