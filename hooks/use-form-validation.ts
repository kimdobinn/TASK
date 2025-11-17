'use client'

/**
 * Enhanced Form Validation Hook
 * Task 22, Subtask 5: Real-time validation feedback with debouncing
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { UseFormReturn, FieldValues, Path } from 'react-hook-form'
import { z } from 'zod'

interface ValidationFeedback {
  isValid: boolean
  error?: string
  isValidating: boolean
}

interface UseFormValidationOptions<T extends FieldValues> {
  form: UseFormReturn<T>
  /**
   * Debounce delay in milliseconds for real-time validation
   * @default 300
   */
  debounceMs?: number
  /**
   * Validate on blur
   * @default true
   */
  validateOnBlur?: boolean
  /**
   * Validate on change (with debounce)
   * @default true
   */
  validateOnChange?: boolean
}

/**
 * Hook for enhanced form validation with real-time feedback
 */
export function useFormValidation<T extends FieldValues>(
  options: UseFormValidationOptions<T>
) {
  const { form, debounceMs = 300, validateOnBlur = true, validateOnChange = true } = options
  const [fieldFeedback, setFieldFeedback] = useState<Record<string, ValidationFeedback>>({})
  const timeoutRefs = useRef<Record<string, NodeJS.Timeout>>({})

  /**
   * Clear timeout for a specific field
   */
  const clearFieldTimeout = useCallback((fieldName: string) => {
    if (timeoutRefs.current[fieldName]) {
      clearTimeout(timeoutRefs.current[fieldName])
      delete timeoutRefs.current[fieldName]
    }
  }, [])

  /**
   * Validate a specific field with debouncing
   */
  const validateField = useCallback(
    async (fieldName: Path<T>) => {
      clearFieldTimeout(fieldName)

      // Set validating state
      setFieldFeedback(prev => ({
        ...prev,
        [fieldName]: { isValid: false, isValidating: true }
      }))

      // Debounce validation
      timeoutRefs.current[fieldName] = setTimeout(async () => {
        const result = await form.trigger(fieldName)
        const error = form.formState.errors[fieldName]

        setFieldFeedback(prev => ({
          ...prev,
          [fieldName]: {
            isValid: result,
            error: error?.message as string | undefined,
            isValidating: false
          }
        }))
      }, debounceMs)
    },
    [form, debounceMs, clearFieldTimeout]
  )

  /**
   * Get validation state for a specific field
   */
  const getFieldState = useCallback(
    (fieldName: Path<T>): ValidationFeedback => {
      return fieldFeedback[fieldName] || {
        isValid: !form.formState.errors[fieldName],
        error: form.formState.errors[fieldName]?.message as string | undefined,
        isValidating: false
      }
    },
    [fieldFeedback, form.formState.errors]
  )

  /**
   * Check if field has been touched
   */
  const isFieldTouched = useCallback(
    (fieldName: Path<T>): boolean => {
      return !!(form.formState.touchedFields as any)[fieldName]
    },
    [form.formState.touchedFields]
  )

  /**
   * Check if field is dirty (modified)
   */
  const isFieldDirty = useCallback(
    (fieldName: Path<T>): boolean => {
      return !!(form.formState.dirtyFields as any)[fieldName]
    },
    [form.formState.dirtyFields]
  )

  /**
   * Get validation icon for field (checkmark, error, loading)
   */
  const getValidationIcon = useCallback(
    (fieldName: Path<T>): 'success' | 'error' | 'loading' | null => {
      const state = getFieldState(fieldName)
      const touched = isFieldTouched(fieldName)

      if (!touched) return null
      if (state.isValidating) return 'loading'
      if (state.error) return 'error'
      if (state.isValid) return 'success'

      return null
    },
    [getFieldState, isFieldTouched]
  )

  /**
   * Cleanup timeouts on unmount
   */
  useEffect(() => {
    return () => {
      Object.values(timeoutRefs.current).forEach(timeout => clearTimeout(timeout))
    }
  }, [])

  return {
    validateField,
    getFieldState,
    getValidationIcon,
    isFieldTouched,
    isFieldDirty,
    fieldFeedback
  }
}

/**
 * Hook for field-level validation with custom validators
 */
export function useFieldValidator<T extends FieldValues>(
  form: UseFormReturn<T>,
  fieldName: Path<T>,
  validators?: Array<(value: any) => string | undefined>
) {
  const [error, setError] = useState<string | undefined>()
  const [isValidating, setIsValidating] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  const validate = useCallback(
    async (value: any) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      setIsValidating(true)

      timeoutRef.current = setTimeout(async () => {
        let validationError: string | undefined

        // Run custom validators
        if (validators) {
          for (const validator of validators) {
            const result = validator(value)
            if (result) {
              validationError = result
              break
            }
          }
        }

        // Run form validation
        if (!validationError) {
          await form.trigger(fieldName)
          validationError = form.formState.errors[fieldName]?.message as string | undefined
        }

        setError(validationError)
        setIsValidating(false)
      }, 300)
    },
    [form, fieldName, validators]
  )

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return { error, isValidating, validate }
}

/**
 * Custom validators for common patterns
 */
export const validators = {
  /**
   * Check if value is not empty
   */
  required: (fieldName: string) => (value: any) => {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return `${fieldName} is required`
    }
    return undefined
  },

  /**
   * Check minimum length
   */
  minLength: (min: number, fieldName: string) => (value: string) => {
    if (value && value.length < min) {
      return `${fieldName} must be at least ${min} characters`
    }
    return undefined
  },

  /**
   * Check maximum length
   */
  maxLength: (max: number, fieldName: string) => (value: string) => {
    if (value && value.length > max) {
      return `${fieldName} must be less than ${max} characters`
    }
    return undefined
  },

  /**
   * Check email format
   */
  email: (value: string) => {
    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return 'Please enter a valid email address'
    }
    return undefined
  },

  /**
   * Check password strength
   */
  passwordStrength: (value: string) => {
    if (!value) return undefined

    if (value.length < 8) {
      return 'Password must be at least 8 characters'
    }
    if (!/[A-Z]/.test(value)) {
      return 'Password must contain at least one uppercase letter'
    }
    if (!/[a-z]/.test(value)) {
      return 'Password must contain at least one lowercase letter'
    }
    if (!/[0-9]/.test(value)) {
      return 'Password must contain at least one number'
    }

    return undefined
  },

  /**
   * Check if passwords match
   */
  passwordMatch: (password: string) => (confirmPassword: string) => {
    if (confirmPassword && confirmPassword !== password) {
      return 'Passwords do not match'
    }
    return undefined
  },

  /**
   * Check URL format
   */
  url: (value: string) => {
    if (value && !/^https?:\/\/.+/.test(value)) {
      return 'Please enter a valid URL'
    }
    return undefined
  },

  /**
   * Check phone number (basic)
   */
  phone: (value: string) => {
    if (value && !/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/.test(value)) {
      return 'Please enter a valid phone number'
    }
    return undefined
  },

  /**
   * Custom async validator (e.g., check if email exists)
   */
  async: (
    fn: (value: any) => Promise<string | undefined>
  ) => async (value: any) => {
    return await fn(value)
  }
}

/**
 * Password strength indicator
 */
export function getPasswordStrength(password: string): {
  score: number // 0-4
  label: 'Weak' | 'Fair' | 'Good' | 'Strong'
  color: 'red' | 'orange' | 'yellow' | 'green'
} {
  let score = 0

  if (!password) {
    return { score: 0, label: 'Weak', color: 'red' }
  }

  // Length
  if (password.length >= 8) score++
  if (password.length >= 12) score++

  // Complexity
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++

  const strength = Math.min(score, 4)

  const labels: Array<'Weak' | 'Fair' | 'Good' | 'Strong'> = ['Weak', 'Weak', 'Fair', 'Good', 'Strong']
  const colors: Array<'red' | 'orange' | 'yellow' | 'green'> = ['red', 'red', 'orange', 'yellow', 'green']

  return {
    score: strength,
    label: labels[strength],
    color: colors[strength]
  }
}
