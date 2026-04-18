import { createContext, useEffect, useState, useCallback } from 'react'
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

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<UserRole | null>(null)

  const fetchRole = useCallback(async (uid: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', uid)
        .single() as unknown as { data: { role: UserRole } | null }
      setRole(data?.role ?? 'client')
    } catch {
      setRole('client')
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) fetchRole(s.user.id)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) fetchRole(s.user.id)
      else setRole(null)
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
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          organization: organization ?? null,
        },
      },
    })
    if (error) return { error: new Error(error.message) }

    // Mettre à jour le rôle si différent du défaut 'client'
    if (data.user && userRole !== 'client') {
      const profilesTable = supabase.from('profiles') as unknown as {
        update: (v: { role: UserRole }) => { eq: (col: string, val: string) => Promise<unknown> }
      }
      await profilesTable.update({ role: userRole }).eq('id', data.user.id)
    }

    return { error: null }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  return (
    <AuthContext.Provider value={{ user, session, loading, role, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
