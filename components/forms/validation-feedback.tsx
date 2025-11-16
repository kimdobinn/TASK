'use client'

/**
 * Validation Feedback Components
 * Task 22, Subtask 5: Visual validation feedback for form fields
 */

import { CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ValidationFeedbackProps {
  /**
   * Validation state: success, error, loading, or null (no feedback)
   */
  state: 'success' | 'error' | 'loading' | null
  /**
   * Error message to display
   */
  message?: string
  /**
   * Additional CSS classes
   */
  className?: string
}

/**
 * Visual validation feedback icon
 */
export function ValidationIcon({ state, className }: Pick<ValidationFeedbackProps, 'state' | 'className'>) {
  if (!state) return null

  const icons = {
    success: <CheckCircle2 className={cn('h-4 w-4 text-green-500', className)} />,
    error: <XCircle className={cn('h-4 w-4 text-destructive', className)} />,
    loading: <Loader2 className={cn('h-4 w-4 text-muted-foreground animate-spin', className)} />
  }

  return icons[state]
}

/**
 * Validation error message
 */
export function ValidationMessage({ message, className }: { message?: string; className?: string }) {
  if (!message) return null

  return (
    <p className={cn('text-sm text-destructive mt-1 flex items-center gap-1', className)}>
      <AlertCircle className="h-3 w-3 flex-shrink-0" />
      <span>{message}</span>
    </p>
  )
}

/**
 * Complete validation feedback (icon + message)
 */
export function ValidationFeedback({ state, message, className }: ValidationFeedbackProps) {
  return (
    <div className={cn('space-y-1', className)}>
      {state === 'error' && message && <ValidationMessage message={message} />}
    </div>
  )
}

/**
 * Password strength indicator
 */
export function PasswordStrengthIndicator({
  password,
  className
}: {
  password: string
  className?: string
}) {
  const getStrength = () => {
    let score = 0

    if (!password) return { score: 0, label: 'Weak', color: 'bg-red-500' }

    // Length
    if (password.length >= 8) score++
    if (password.length >= 12) score++

    // Complexity
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^a-zA-Z0-9]/.test(password)) score++

    const strength = Math.min(score, 4)
    const labels = ['Weak', 'Weak', 'Fair', 'Good', 'Strong']
    const colors = [
      'bg-red-500',
      'bg-red-500',
      'bg-orange-500',
      'bg-yellow-500',
      'bg-green-500'
    ]

    return {
      score: strength,
      label: labels[strength],
      color: colors[strength]
    }
  }

  const strength = getStrength()
  const percentage = (strength.score / 4) * 100

  if (!password) return null

  return (
    <div className={cn('space-y-2 mt-2', className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Password strength:</span>
        <span className={cn('text-xs font-medium', {
          'text-red-500': strength.score <= 1,
          'text-orange-500': strength.score === 2,
          'text-yellow-500': strength.score === 3,
          'text-green-500': strength.score === 4
        })}>
          {strength.label}
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full transition-all duration-300', strength.color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <ul className="text-xs text-muted-foreground space-y-1">
        <li className={password.length >= 8 ? 'text-green-600 line-through' : ''}>
          • At least 8 characters
        </li>
        <li className={/[A-Z]/.test(password) && /[a-z]/.test(password) ? 'text-green-600 line-through' : ''}>
          • Uppercase and lowercase letters
        </li>
        <li className={/[0-9]/.test(password) ? 'text-green-600 line-through' : ''}>
          • At least one number
        </li>
      </ul>
    </div>
  )
}

/**
 * Character count indicator
 */
export function CharacterCount({
  current,
  max,
  className
}: {
  current: number
  max: number
  className?: string
}) {
  const percentage = (current / max) * 100
  const isNearLimit = percentage > 80
  const isOverLimit = current > max

  return (
    <div className={cn('flex items-center justify-between text-xs mt-1', className)}>
      <span className={cn('text-muted-foreground', {
        'text-yellow-600': isNearLimit && !isOverLimit,
        'text-destructive': isOverLimit
      })}>
        {current} / {max} characters
      </span>
      {isOverLimit && (
        <span className="text-destructive font-medium">
          {current - max} over limit
        </span>
      )}
    </div>
  )
}

/**
 * Form section with validation state
 */
export function FormSection({
  title,
  description,
  error,
  children,
  className
}: {
  title: string
  description?: string
  error?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-4', className)}>
      <div>
        <h3 className="text-lg font-medium">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
        {error && <ValidationMessage message={error} className="mt-2" />}
      </div>
      {children}
    </div>
  )
}

/**
 * Input wrapper with validation feedback
 */
export function ValidatedInput({
  children,
  validationState,
  errorMessage,
  className
}: {
  children: React.ReactNode
  validationState: 'success' | 'error' | 'loading' | null
  errorMessage?: string
  className?: string
}) {
  return (
    <div className={cn('space-y-1', className)}>
      <div className="relative">
        {children}
        {validationState && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <ValidationIcon state={validationState} />
          </div>
        )}
      </div>
      {validationState === 'error' && errorMessage && (
        <ValidationMessage message={errorMessage} />
      )}
    </div>
  )
}
