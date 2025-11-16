'use client'

/**
 * Custom Hook for Error Handling
 * Task 22, Subtask 4: React hook for centralized error handling with toast notifications
 */

import { useCallback } from 'react'
import { toast } from 'sonner'
import {
  formatErrorForToast,
  getUserFriendlyError,
  isRetryableError,
  requiresAuth,
  logError,
  type ErrorCategory
} from '@/lib/error-messages'
import { useRouter } from 'next/navigation'

interface ErrorHandlerOptions {
  /**
   * Show toast notification automatically
   * @default true
   */
  showToast?: boolean

  /**
   * Redirect to login if authentication required
   * @default true
   */
  redirectOnAuth?: boolean

  /**
   * Custom error message to display instead of auto-generated
   */
  customMessage?: string

  /**
   * Additional context for error logging
   */
  context?: Record<string, any>

  /**
   * Callback to execute after error is handled
   */
  onError?: (error: unknown, category: ErrorCategory) => void
}

/**
 * Hook for handling errors with toast notifications and logging
 */
export function useErrorHandler() {
  const router = useRouter()

  /**
   * Handle error with automatic toast notification and logging
   */
  const handleError = useCallback(
    (error: unknown, options: ErrorHandlerOptions = {}) => {
      const {
        showToast = true,
        redirectOnAuth = true,
        customMessage,
        context,
        onError
      } = options

      // Log error in development
      logError(error, context)

      // Format error for display
      const { title, description, category } = formatErrorForToast(error)
      const message = customMessage || description

      // Show toast notification
      if (showToast) {
        if (isRetryableError(error)) {
          toast.error(title, {
            description: `${message}. Please try again.`,
            action: {
              label: 'Retry',
              onClick: () => {
                // Callback for retry logic (can be passed via context)
                if (context?.retry && typeof context.retry === 'function') {
                  context.retry()
                }
              }
            }
          })
        } else {
          toast.error(title, { description: message })
        }
      }

      // Redirect to login if authentication required
      if (redirectOnAuth && requiresAuth(error)) {
        setTimeout(() => {
          router.push('/auth/login')
        }, 1500) // Small delay to show error toast first
      }

      // Execute custom callback
      onError?.(error, category)

      return {
        category,
        message,
        isRetryable: isRetryableError(error),
        needsAuth: requiresAuth(error)
      }
    },
    [router]
  )

  /**
   * Handle success with toast notification
   */
  const handleSuccess = useCallback((message: string, description?: string) => {
    toast.success(message, { description })
  }, [])

  /**
   * Handle warning with toast notification
   */
  const handleWarning = useCallback((message: string, description?: string) => {
    toast.warning(message, { description })
  }, [])

  /**
   * Handle info with toast notification
   */
  const handleInfo = useCallback((message: string, description?: string) => {
    toast.info(message, { description })
  }, [])

  /**
   * Show loading toast
   */
  const showLoading = useCallback((message: string) => {
    return toast.loading(message)
  }, [])

  /**
   * Dismiss a specific toast by ID
   */
  const dismissToast = useCallback((toastId: string | number) => {
    toast.dismiss(toastId)
  }, [])

  /**
   * Dismiss all toasts
   */
  const dismissAll = useCallback(() => {
    toast.dismiss()
  }, [])

  return {
    handleError,
    handleSuccess,
    handleWarning,
    handleInfo,
    showLoading,
    dismissToast,
    dismissAll
  }
}

/**
 * Higher-order function to wrap async functions with error handling
 */
export function withErrorHandler<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: ErrorHandlerOptions = {}
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args)
    } catch (error) {
      const { handleError } = useErrorHandler()
      handleError(error, options)
      throw error // Re-throw to allow caller to handle if needed
    }
  }) as T
}
