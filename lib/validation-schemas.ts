/**
 * Centralized Zod validation schemas for all forms
 * Task 22, Subtask 1: Comprehensive Zod Validation Schemas
 */

import * as z from 'zod'

// ============================================================================
// Auth & Profile Schemas
// ============================================================================

export const signupSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  fullName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
  role: z.enum(['student', 'tutor'], {
    message: 'Please select a role'
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const profileUpdateSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes')
    .optional(),
  email: z
    .string()
    .email('Please enter a valid email address')
    .optional(),
  timezone: z.string().optional(),
})

// ============================================================================
// Booking Schemas
// ============================================================================

export const bookingFormSchema = z.object({
  tutorId: z.string().uuid('Invalid tutor ID').min(1, 'Please select a tutor'),
  subject: z.enum([
    'mathematics',
    'physics',
    'chemistry',
    'biology',
    'computer_science',
    'english',
    'history',
    'other'
  ], {
    message: 'Please select a subject'
  }),
  duration: z.enum(['30', '60', '120'], {
    message: 'Please select a session duration'
  }),
  date: z.coerce.date({
    message: 'Please select a valid date',
  }).refine((date) => date >= new Date(new Date().setHours(0, 0, 0, 0)), {
    message: 'Date cannot be in the past',
  }),
  timeSlot: z.string().min(1, 'Please select a time slot'),
  specificRequests: z
    .string()
    .max(500, 'Specific requests must be less than 500 characters')
    .optional(),
})

export const bookingStatusUpdateSchema = z.object({
  bookingId: z.string().uuid('Invalid booking ID'),
  status: z.enum(['approved', 'rejected'], {
    message: 'Status must be approved or rejected'
  }),
  rejectionNote: z
    .string()
    .max(300, 'Rejection note must be less than 300 characters')
    .optional(),
})

// ============================================================================
// Blocked Times Schemas
// ============================================================================

export const blockedTimeSchema = z.object({
  startTime: z.string().datetime('Invalid start time format'),
  endTime: z.string().datetime('Invalid end time format'),
  reason: z
    .string()
    .max(200, 'Reason must be less than 200 characters')
    .optional(),
  isRecurring: z.boolean().default(false),
  recurringDayOfWeek: z
    .number()
    .int()
    .min(0, 'Day of week must be between 0 (Sunday) and 6 (Saturday)')
    .max(6, 'Day of week must be between 0 (Sunday) and 6 (Saturday)')
    .optional(),
}).refine((data) => new Date(data.endTime) > new Date(data.startTime), {
  message: 'End time must be after start time',
  path: ['endTime'],
}).refine((data) => {
  if (data.isRecurring && data.recurringDayOfWeek === undefined) {
    return false
  }
  return true
}, {
  message: 'Day of week is required for recurring blocked times',
  path: ['recurringDayOfWeek'],
})

// ============================================================================
// Utility Type Exports
// ============================================================================

export type SignupFormValues = z.infer<typeof signupSchema>
export type LoginFormValues = z.infer<typeof loginSchema>
export type ProfileUpdateFormValues = z.infer<typeof profileUpdateSchema>
export type BookingFormValues = z.infer<typeof bookingFormSchema>
export type BookingStatusUpdateValues = z.infer<typeof bookingStatusUpdateSchema>
export type BlockedTimeFormValues = z.infer<typeof blockedTimeSchema>

// ============================================================================
// Custom Validators
// ============================================================================

/**
 * Validates that a time is in the future
 */
export const futureTimeValidator = (date: Date) => {
  return date > new Date()
}

/**
 * Validates time slot format (HH:MM-HH:MM)
 */
export const timeSlotFormatValidator = z.string().regex(
  /^([01]\d|2[0-3]):([0-5]\d)-([01]\d|2[0-3]):([0-5]\d)$/,
  'Time slot must be in format HH:MM-HH:MM'
)

/**
 * Validates UUID format
 */
export const uuidValidator = z.string().uuid('Invalid ID format')

/**
 * Validates timezone string
 */
export const timezoneValidator = z.string().refine((tz) => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz })
    return true
  } catch {
    return false
  }
}, 'Invalid timezone')
