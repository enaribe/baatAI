import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { Notification } from '../types/database'

interface UseNotificationsResult {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  error: string | null
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  refetch: () => Promise<void>
}

export function useNotifications(userId: string | undefined): UseNotificationsResult {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchNotifications = useCallback(async () => {
    if (!userId) { setLoading(false); return }
    setLoading(true)
    const { data, error: err } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
    if (err) setError(err.message)
    setNotifications((data as unknown as Notification[]) ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  // Realtime subscription
  useEffect(() => {
    if (!userId) return

    // Nom unique par monte pour éviter le conflit StrictMode double-mount
    const channelName = `notifications:${userId}:${Math.random().toString(36).slice(2, 8)}`
    const channel = supabase.channel(channelName)

    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev].slice(0, 50))
      },
    )

    channel.subscribe()
    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [userId])

  const markAsRead = useCallback(async (id: string) => {
    const now = new Date().toISOString()
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: now } : n))
    type DbResult = Promise<{ error: { message: string } | null }>
    await (supabase
      .from('notifications')
      .update({ read_at: now } as unknown as never)
      .eq('id', id) as unknown as DbResult)
  }, [])

  const markAllAsRead = useCallback(async () => {
    if (!userId) return
    const now = new Date().toISOString()
    setNotifications(prev => prev.map(n => n.read_at ? n : { ...n, read_at: now }))
    type DbResult = Promise<{ error: { message: string } | null }>
    await (supabase
      .from('notifications')
      .update({ read_at: now } as unknown as never)
      .eq('user_id', userId)
      .is('read_at', null) as unknown as DbResult)
  }, [userId])

  const unreadCount = notifications.filter(n => !n.read_at).length

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  }
}
