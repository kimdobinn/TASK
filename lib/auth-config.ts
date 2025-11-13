// Authentication configuration and utilities

export const AUTH_CONFIG = {
  // Email configuration
  emailRedirectTo: process.env.NEXT_PUBLIC_SITE_URL
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
    : 'http://localhost:3000/auth/callback',

  // Session configuration
  sessionTimeout: 3600, // 1 hour in seconds

  // Password requirements
  passwordRequirements: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false,
  },

  // Role-based redirect paths
  redirectPaths: {
    student: '/dashboard/student',
    tutor: '/dashboard/tutor',
    default: '/dashboard',
  },
} as const

export type AuthConfig = typeof AUTH_CONFIG

// Helper function to get role-based redirect path
export function getRoleRedirectPath(role?: string): string {
  if (!role) return AUTH_CONFIG.redirectPaths.default

  if (role === 'student') return AUTH_CONFIG.redirectPaths.student
  if (role === 'tutor') return AUTH_CONFIG.redirectPaths.tutor

  return AUTH_CONFIG.redirectPaths.default
}

// Validate password against requirements
export function validatePassword(password: string): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []
  const { passwordRequirements } = AUTH_CONFIG

  if (password.length < passwordRequirements.minLength) {
    errors.push(`Password must be at least ${passwordRequirements.minLength} characters`)
  }

  if (passwordRequirements.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (passwordRequirements.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  if (passwordRequirements.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  if (passwordRequirements.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}
