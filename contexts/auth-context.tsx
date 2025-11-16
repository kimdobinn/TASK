'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'
import { getRoleRedirectPath } from '@/lib/auth-config'
import { parseSupabaseError, withRetry } from '@/lib/supabase-errors'
import type { UserRole } from '@/types'

interface UserProfile {
  id: string
  role: UserRole
  full_name: string
  time_zone: string
  created_at?: string
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  isLoading: boolean
  signUp: (email: string, password: string, data: {
    role: UserRole
    full_name: string
    time_zone: string
  }) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  // Fetch user profile
  const fetchProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, role, full_name, time_zone, created_at')
        .eq('id', userId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching profile:', parseSupabaseError(error))
      return null
    }
  }

  // Initialize auth state
  useEffect(() => {
    let mounted = true

    const initAuth = async () => {
      console.log('[AuthContext] initAuth: Starting initialization')
      try {
        // Add timeout to getSession to prevent hanging
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('getSession timeout')), 5000)
        )

        console.log('[AuthContext] initAuth: Fetching session with timeout...')
        const {
          data: { session },
        } = await Promise.race([sessionPromise, timeoutPromise]) as any
        console.log('[AuthContext] initAuth: Session fetched:', !!session)

        if (mounted && session?.user) {
          console.log('[AuthContext] initAuth: User found, setting user state')
          setUser(session.user)
          console.log('[AuthContext] initAuth: Fetching profile for user:', session.user.id)
          const userProfile = await fetchProfile(session.user.id)
          console.log('[AuthContext] initAuth: Profile fetched:', userProfile)
          setProfile(userProfile)
        } else if (!session) {
          console.log('[AuthContext] initAuth: No session found')
        }
      } catch (error) {
        console.error('[AuthContext] Error initializing auth:', parseSupabaseError(error))
        // If getSession fails/times out, auth state listener will handle initialization
      } finally {
        if (mounted) {
          console.log('[AuthContext] initAuth: Setting isLoading to false')
          setIsLoading(false)
        }
      }
    }

    initAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event)

      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
        const userProfile = await fetchProfile(session.user.id)
        setProfile(userProfile)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
        // Redirect will be handled by window.location in signOut function
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        setUser(session.user)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signUp = async (
    email: string,
    password: string,
    data: {
      role: UserRole
      full_name: string
      time_zone: string
    }
  ) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: data.role,
          full_name: data.full_name,
          time_zone: data.time_zone,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      throw parseSupabaseError(error)
    }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      throw parseSupabaseError(error)
    }

    if (data.user) {
      const userProfile = await fetchProfile(data.user.id)
      setUser(data.user)
      setProfile(userProfile)

      // Redirect based on role
      const redirectPath = getRoleRedirectPath(userProfile?.role)
      router.push(redirectPath)
      router.refresh()
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()

      if (error) {
        throw parseSupabaseError(error)
      }

      // Clear state immediately
      setUser(null)
      setProfile(null)

      // Force navigation to login page
      window.location.href = '/auth/login'
    } catch (error) {
      console.error('Sign out error:', error)
      throw error
    }
  }

  const refreshProfile = async () => {
    if (user) {
      const userProfile = await fetchProfile(user.id)
      setProfile(userProfile)
    }
  }

  const value: AuthContextType = {
    user,
    profile,
    isLoading,
    signUp,
    signIn,
    signOut,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
