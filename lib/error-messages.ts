/**
 * User-Friendly Error Messages
 * Task 22, Subtask 4: Centralized error message mapping and utilities
 */

// ============================================================================
// Error Message Mapping
// ============================================================================

/**
 * Maps technical error codes/messages to user-friendly messages
 */
export const ERROR_MESSAGES = {
  // Authentication Errors
  'auth/invalid-email': 'Please enter a valid email address',
  'auth/user-not-found': 'No account found with this email address',
  'auth/wrong-password': 'Incorrect password. Please try again',
  'auth/email-already-in-use': 'An account with this email already exists',
  'auth/weak-password': 'Password is too weak. Please use at least 8 characters with uppercase, lowercase, and numbers',
  'auth/too-many-requests': 'Too many login attempts. Please try again later',
  'auth/network-request-failed': 'Network error. Please check your internet connection',
  'auth/invalid-credential': 'Invalid login credentials. Please check your email and password',
  'auth/user-disabled': 'This account has been disabled. Please contact support',
  'auth/operation-not-allowed': 'This operation is not allowed. Please contact support',

  // Database/API Errors
  'PGRST116': 'The requested resource was not found',
  'PGRST301': 'You do not have permission to perform this action',
  'PGRST204': 'No data found',
  '23505': 'This record already exists',
  '23503': 'Cannot delete: this item is referenced by other records',
  '23502': 'Required field is missing',
  '22P02': 'Invalid data format',
  '42P01': 'Database table not found. Please contact support',

  // Network Errors
  'ECONNREFUSED': 'Unable to connect to the server. Please try again later',
  'ETIMEDOUT': 'Request timed out. Please check your internet connection',
  'ENOTFOUND': 'Server not found. Please check your internet connection',

  // Validation Errors
  'validation/required': 'This field is required',
  'validation/invalid-email': 'Please enter a valid email address',
  'validation/invalid-date': 'Please select a valid date',
  'validation/date-past': 'Date cannot be in the past',
  'validation/invalid-time': 'Please select a valid time',
  'validation/min-length': 'Input is too short',
  'validation/max-length': 'Input is too long',
  'validation/pattern': 'Invalid format',

  // Booking Errors
  'booking/time-conflict': 'This time slot is already booked',
  'booking/tutor-unavailable': 'This tutor is not available at the selected time',
  'booking/invalid-duration': 'Please select a valid session duration',
  'booking/past-date': 'Cannot book sessions in the past',
  'booking/not-found': 'Booking request not found',
  'booking/already-processed': 'This booking has already been processed',
  'booking/cannot-cancel': 'Cannot cancel booking at this time',

  // Generic Errors
  'generic/unknown': 'An unexpected error occurred. Please try again',
  'generic/server-error': 'Server error. Please try again later',
  'generic/maintenance': 'System is under maintenance. Please try again later',
  'generic/rate-limit': 'Too many requests. Please slow down and try again',
} as const

// ============================================================================
// Error Categories
// ============================================================================

export type ErrorCategory =
  | 'auth'
  | 'database'
  | 'network'
  | 'validation'
  | 'booking'
  | 'permission'
  | 'not-found'
  | 'unknown'

/**
 * Categorize errors by type for better handling
 */
export function categorizeError(error: unknown): ErrorCategory {
  const errorMessage = getErrorMessage(error)
  const errorCode = getErrorCode(error)

  if (errorCode?.startsWith('auth/') || errorMessage.toLowerCase().includes('authentication')) {
    return 'auth'
  }

  if (errorCode?.startsWith('PGRST') || errorMessage.toLowerCase().includes('database')) {
    return 'database'
  }

  if (errorCode === 'ECONNREFUSED' || errorCode === 'ETIMEDOUT' || errorCode === 'ENOTFOUND') {
    return 'network'
  }

  if (errorCode?.startsWith('validation/') || errorMessage.toLowerCase().includes('validation')) {
    return 'validation'
  }

  if (errorCode?.startsWith('booking/')) {
    return 'booking'
  }

  if (errorCode === 'PGRST301' || errorMessage.toLowerCase().includes('permission')) {
    return 'permission'
  }

  if (errorCode === 'PGRST116' || errorMessage.toLowerCase().includes('not found')) {
    return 'not-found'
  }

  return 'unknown'
}

// ============================================================================
// Error Message Utilities
// ============================================================================

/**
 * Extract error code from various error objects
 */
export function getErrorCode(error: unknown): string | undefined {
  if (!error) return undefined

  if (typeof error === 'object') {
    const err = error as any
    return err.code || err.error?.code || err.statusCode || err.status
  }

  return undefined
}

/**
 * Extract error message from various error objects
 */
export function getErrorMessage(error: unknown): string {
  if (!error) return ERROR_MESSAGES['generic/unknown']

  // String error
  if (typeof error === 'string') {
    return error
  }

  // Error object
  if (error instanceof Error) {
    return error.message
  }

  // Object with message property
  if (typeof error === 'object') {
    const err = error as any
    return err.message || err.error?.message || err.statusText || ERROR_MESSAGES['generic/unknown']
  }

  return ERROR_MESSAGES['generic/unknown']
}

/**
 * Get user-friendly error message
 * Maps technical errors to readable messages
 */
export function getUserFriendlyError(error: unknown): string {
  const code = getErrorCode(error)
  const message = getErrorMessage(error)

  // Try to find friendly message by error code
  if (code && code in ERROR_MESSAGES) {
    return ERROR_MESSAGES[code as keyof typeof ERROR_MESSAGES]
  }

  // Try to find friendly message by partial match
  for (const [key, value] of Object.entries(ERROR_MESSAGES)) {
    if (message.toLowerCase().includes(key.toLowerCase().replace(/\//g, ' '))) {
      return value
    }
  }

  // Return original message if it's already user-friendly (no stack trace, reasonable length)
  if (message.length < 200 && !message.includes('\n') && !message.includes('    at ')) {
    return message
  }

  // Default to generic error
  return ERROR_MESSAGES['generic/unknown']
}

/**
 * Format error for display in toast notifications
 */
export function formatErrorForToast(error: unknown): {
  title: string
  description: string
  category: ErrorCategory
} {
  const category = categorizeError(error)
  const message = getUserFriendlyError(error)

  const titles: Record<ErrorCategory, string> = {
    auth: 'Authentication Error',
    database: 'Data Error',
    network: 'Connection Error',
    validation: 'Validation Error',
    booking: 'Booking Error',
    permission: 'Permission Denied',
    'not-found': 'Not Found',
    unknown: 'Error'
  }

  return {
    title: titles[category],
    description: message,
    category
  }
}

/**
 * Check if error is retryable (network/timeout errors)
 */
export function isRetryableError(error: unknown): boolean {
  const code = getErrorCode(error)
  const category = categorizeError(error)

  const retryableCodes = ['ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND', 'generic/rate-limit']

  return category === 'network' || (code ? retryableCodes.includes(code) : false)
}

/**
 * Check if error requires authentication
 */
export function requiresAuth(error: unknown): boolean {
  const category = categorizeError(error)
  const message = getErrorMessage(error).toLowerCase()

  return category === 'auth' ||
         message.includes('unauthorized') ||
         message.includes('not authenticated') ||
         message.includes('session expired')
}

/**
 * Log error with context (development only)
 */
export function logError(error: unknown, context?: Record<string, any>) {
  if (process.env.NODE_ENV === 'development') {
    console.error('[Error]', {
      error,
      category: categorizeError(error),
      code: getErrorCode(error),
      message: getErrorMessage(error),
      userFriendly: getUserFriendlyError(error),
      context
    })
  }

  // In production, send to error tracking service (e.g., Sentry)
  // if (process.env.NODE_ENV === 'production') {
  //   Sentry.captureException(error, { extra: context })
  // }
}

// ============================================================================
// React Hook for Error Handling
// ============================================================================

/**
 * Format Zod validation errors for display
 */
export function formatZodError(error: any): string[] {
  if (!error?.issues) return []

  return error.issues.map((issue: any) => {
    const path = issue.path.join('.')
    return path ? `${path}: ${issue.message}` : issue.message
  })
}

/**
 * Format multiple errors into a single message
 */
export function combineErrors(errors: string[]): string {
  if (errors.length === 0) return ''
  if (errors.length === 1) return errors[0]

  return `Multiple errors occurred:\n${errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}`
}
