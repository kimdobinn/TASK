'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { getRoleRedirectPath } from '@/lib/auth-config'

export default function DashboardPage() {
  const { user, profile, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        // Not authenticated, redirect to login
        router.push('/auth/login')
      } else if (profile) {
        // Has profile, redirect to role-specific dashboard
        const dashboardPath = getRoleRedirectPath(profile.role)
        router.push(dashboardPath)
      }
    }
  }, [user, profile, isLoading, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Loading your dashboard...</p>
      </div>
    </div>
  )
}
