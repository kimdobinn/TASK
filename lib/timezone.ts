// Re-export timezone utilities with simplified names for component use
import { convertFromUTC, DATE_FORMATS as FORMATS, detectUserTimeZone } from '@/utils/timezone'

export { FORMATS as DATE_FORMATS }

/**
 * Convert a UTC date string to local timezone
 * Simplified wrapper around convertFromUTC that uses user's detected timezone
 */
export function fromUTC(utcDate: string | Date): Date {
  const userTz = detectUserTimeZone()
  return convertFromUTC(utcDate, userTz)
}

/**
 * Convert a local date to UTC ISO string
 * Simplified wrapper for components
 */
export function toUTC(localDate: Date, timeZone?: string): string {
  const tz = timeZone || detectUserTimeZone()
  // Convert to ISO string for database storage
  return localDate.toISOString()
}
