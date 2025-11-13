// Role-based Access Control utilities

import type { UserRole } from '@/types'

// Define permissions for each role
export const ROLE_PERMISSIONS = {
  student: {
    canViewTutors: true,
    canRequestBooking: true,
    canViewOwnBookings: true,
    canCancelBooking: true,
    canBlockTimes: false,
    canApproveBookings: false,
    canViewAllBookings: false,
  },
  tutor: {
    canViewTutors: false,
    canRequestBooking: false,
    canViewOwnBookings: true,
    canCancelBooking: false,
    canBlockTimes: true,
    canApproveBookings: true,
    canViewAllBookings: true,
  },
} as const

export type Permission = keyof typeof ROLE_PERMISSIONS.student

// Check if a role has a specific permission
export function hasPermission(role: UserRole | undefined, permission: Permission): boolean {
  if (!role) return false
  return ROLE_PERMISSIONS[role][permission] ?? false
}

// Check if user has any of the given permissions
export function hasAnyPermission(
  role: UserRole | undefined,
  permissions: Permission[]
): boolean {
  return permissions.some((permission) => hasPermission(role, permission))
}

// Check if user has all of the given permissions
export function hasAllPermissions(
  role: UserRole | undefined,
  permissions: Permission[]
): boolean {
  return permissions.every((permission) => hasPermission(role, permission))
}

// Route access control
export const PROTECTED_ROUTES = {
  student: ['/dashboard/student'],
  tutor: ['/dashboard/tutor'],
  both: ['/dashboard'],
} as const

// Check if user has access to a route based on role
export function canAccessRoute(role: UserRole | undefined, pathname: string): boolean {
  if (!role) return false

  // Check role-specific routes
  if (PROTECTED_ROUTES[role].some((route) => pathname.startsWith(route))) {
    return true
  }

  // Check routes accessible to both roles
  if (PROTECTED_ROUTES.both.some((route) => pathname === route)) {
    return true
  }

  return false
}

// Get accessible dashboard path for role
export function getDashboardPath(role: UserRole | undefined): string {
  if (role === 'student') return '/dashboard/student'
  if (role === 'tutor') return '/dashboard/tutor'
  return '/dashboard'
}
