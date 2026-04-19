import { createContext, useEffect, useState, useCallback, useRef } from 'react'
import type { ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { UserRole } from '../types/database'

export type RoleStatus = 'idle' | 'loading' | 'loaded' | 'error'

export interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  role: UserRole | null
  roleStatus: RoleStatus
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

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<UserRole | null>(null)
  const [roleStatus, setRoleStatus] = useState<RoleStatus>('idle')
  const pendingRole = useRef<UserRole | null>(null)

  const fetchRole = useCallback(async (uid: string) => {
    if (pendingRole.current) {
      console.info('[AUTH] Rôle depuis pendingRole:', pendingRole.current)
      setRole(pendingRole.current)
      setRoleStatus('loaded')
      pendingRole.current = null
      return
    }
    setRoleStatus('loading')
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', uid)
        .single() as unknown as { data: { role: UserRole } | null, error: unknown }

      if (error) throw error

      if (!data?.role) {
        console.warn('[AUTH] Profil sans rôle pour user', uid, '– déconnexion forcée')
        await supabase.auth.signOut()
        setRole(null)
        setRoleStatus('error')
        return
      }

      console.info('[AUTH] Rôle chargé depuis DB:', data.role)
      setRole(data.role)
      setRoleStatus('loaded')
    } catch (err) {
      console.error('[AUTH] Erreur fetchRole:', err)
      setRole(null)
      setRoleStatus('error')
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) {
        setRoleStatus('loading')
        fetchRole(s.user.id)
      } else {
        setRole(null)
        setRoleStatus('idle')
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) {
        setRoleStatus('loading')
        fetchRole(s.user.id)
      } else {
        pendingRole.current = null
        setRole(null)
        setRoleStatus('idle')
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [fetchRole])

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
    // Important : définir pendingRole AVANT signUp pour que le fetchRole
    // déclenché par onAuthStateChange récupère le bon rôle sans aller en DB
    // (et évite la race condition avec le trigger handle_new_user).
    pendingRole.current = userRole

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
    if (error) {
      pendingRole.current = null
      return { error: new Error(error.message) }
    }

    return { error: null }
  }, [])

  const signOut = useCallback(async () => {
    pendingRole.current = null
    await supabase.auth.signOut()
  }, [])

  return (
    <AuthContext.Provider value={{ user, session, loading, role, roleStatus, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
