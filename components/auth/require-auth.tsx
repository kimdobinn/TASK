'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { useRole } from '@/hooks/use-role'
import type { UserRole } from '@/types'

interface RequireAuthProps {
  children: React.ReactNode
  requiredRole?: UserRole
  fallbackPath?: string
}

export function RequireAuth({ children, requiredRole, fallbackPath = '/auth/login' }: RequireAuthProps) {
  const { user, isLoading } = useAuth()
  const { role } = useRole()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      // Not authenticated
      if (!user) {
        router.push(fallbackPath)
        return
      }

      // Authenticated but wrong role
      if (requiredRole && role !== requiredRole) {
        router.push('/dashboard')
        return
      }
    }
  }, [user, isLoading, role, requiredRole, fallbackPath, router])

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Not authenticated
  if (!user) {
    return null
  }

  // Wrong role
  if (requiredRole && role !== requiredRole) {
    return null
  }

  return <>{children}</>
}
