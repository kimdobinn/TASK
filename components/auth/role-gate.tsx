'use client'

import { useRole } from '@/hooks/use-role'
import type { UserRole } from '@/types'
import type { Permission } from '@/lib/rbac'

interface RoleGateProps {
  children: React.ReactNode
  requiredRole?: UserRole
  requiredPermission?: Permission
  requiredPermissions?: Permission[]
  requireAll?: boolean
  fallback?: React.ReactNode
}

export function RoleGate({
  children,
  requiredRole,
  requiredPermission,
  requiredPermissions,
  requireAll = false,
  fallback = null,
}: RoleGateProps) {
  const { role, hasPermission, hasAnyPermission, hasAllPermissions } = useRole()

  // Check role
  if (requiredRole && role !== requiredRole) {
    return <>{fallback}</>
  }

  // Check single permission
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <>{fallback}</>
  }

  // Check multiple permissions
  if (requiredPermissions) {
    const hasAccess = requireAll
      ? hasAllPermissions(requiredPermissions)
      : hasAnyPermission(requiredPermissions)

    if (!hasAccess) {
      return <>{fallback}</>
    }
  }

  return <>{children}</>
}
