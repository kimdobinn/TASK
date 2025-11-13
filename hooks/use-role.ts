// Hook for role-based access control

import { useAuth } from './use-auth'
import { hasPermission, hasAnyPermission, hasAllPermissions, canAccessRoute } from '@/lib/rbac'
import type { Permission } from '@/lib/rbac'

export function useRole() {
  const { profile } = useAuth()

  return {
    role: profile?.role,
    isStudent: profile?.role === 'student',
    isTutor: profile?.role === 'tutor',
    hasPermission: (permission: Permission) => hasPermission(profile?.role, permission),
    hasAnyPermission: (permissions: Permission[]) =>
      hasAnyPermission(profile?.role, permissions),
    hasAllPermissions: (permissions: Permission[]) =>
      hasAllPermissions(profile?.role, permissions),
    canAccessRoute: (pathname: string) => canAccessRoute(profile?.role, pathname),
  }
}
