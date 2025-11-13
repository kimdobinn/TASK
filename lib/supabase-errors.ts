// Supabase error handling utilities

export class SupabaseError extends Error {
  code?: string
  status?: number

  constructor(message: string, code?: string, status?: number) {
    super(message)
    this.name = 'SupabaseError'
    this.code = code
    this.status = status
  }
}

export class AuthenticationError extends SupabaseError {
  constructor(message: string, code?: string) {
    super(message, code, 401)
    this.name = 'AuthenticationError'
  }
}

export class DatabaseError extends SupabaseError {
  constructor(message: string, code?: string) {
    super(message, code, 500)
    this.name = 'DatabaseError'
  }
}

export class NetworkError extends SupabaseError {
  constructor(message: string) {
    super(message, 'NETWORK_ERROR', 503)
    this.name = 'NetworkError'
  }
}

export class RateLimitError extends SupabaseError {
  constructor(message: string) {
    super(message, 'RATE_LIMIT', 429)
    this.name = 'RateLimitError'
  }
}

// Parse Supabase errors into typed errors
export function parseSupabaseError(error: any): SupabaseError {
  if (!error) {
    return new SupabaseError('Unknown error occurred')
  }

  const message = error.message || 'An error occurred'
  const code = error.code
  const status = error.status

  // Authentication errors
  if (code === 'invalid_credentials' || code === 'user_not_found') {
    return new AuthenticationError(message, code)
  }

  if (code === 'email_not_confirmed') {
    return new AuthenticationError('Please confirm your email address', code)
  }

  // Rate limiting
  if (status === 429) {
    return new RateLimitError('Too many requests. Please try again later.')
  }

  // Network errors
  if (error.message?.includes('fetch') || error.message?.includes('network')) {
    return new NetworkError('Network error. Please check your connection.')
  }

  // Database errors
  if (code?.startsWith('PGRST') || code?.startsWith('23')) {
    return new DatabaseError(message, code)
  }

  return new SupabaseError(message, code, status)
}

// Retry configuration
export interface RetryConfig {
  maxAttempts: number
  baseDelay: number
  maxDelay: number
  shouldRetry?: (error: any) => boolean
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  shouldRetry: (error: any) => {
    // Retry on network errors and rate limits
    return (
      error instanceof NetworkError ||
      error instanceof RateLimitError ||
      error?.status === 503 ||
      error?.status === 429
    )
  },
}

// Exponential backoff with jitter
function calculateDelay(attempt: number, baseDelay: number, maxDelay: number): number {
  const exponentialDelay = baseDelay * Math.pow(2, attempt)
  const jitter = Math.random() * 0.3 * exponentialDelay // Add up to 30% jitter
  return Math.min(exponentialDelay + jitter, maxDelay)
}

// Retry wrapper for Supabase operations
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config }
  let lastError: any

  for (let attempt = 0; attempt < retryConfig.maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = parseSupabaseError(error)

      const shouldRetry = retryConfig.shouldRetry?.(lastError) ?? false
      const isLastAttempt = attempt === retryConfig.maxAttempts - 1

      if (!shouldRetry || isLastAttempt) {
        throw lastError
      }

      const delay = calculateDelay(attempt, retryConfig.baseDelay, retryConfig.maxDelay)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

// User-friendly error messages
export function getUserFriendlyErrorMessage(error: any): string {
  const parsedError = parseSupabaseError(error)

  if (parsedError instanceof AuthenticationError) {
    if (parsedError.code === 'invalid_credentials') {
      return 'Invalid email or password. Please try again.'
    }
    if (parsedError.code === 'email_not_confirmed') {
      return 'Please check your email and confirm your account.'
    }
    return 'Authentication failed. Please try again.'
  }

  if (parsedError instanceof NetworkError) {
    return 'Connection error. Please check your internet connection and try again.'
  }

  if (parsedError instanceof RateLimitError) {
    return 'Too many attempts. Please wait a moment and try again.'
  }

  if (parsedError instanceof DatabaseError) {
    return 'A database error occurred. Please try again later.'
  }

  return parsedError.message || 'An unexpected error occurred. Please try again.'
}
