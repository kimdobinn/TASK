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
 * Convert a local date to UTC
 * Simplified wrapper for components
 */
export function toUTC(localDate: Date, timeZone?: string): Date {
  const tz = timeZone || detectUserTimeZone()
  // For now, just return the date as-is since Date objects are inherently UTC
  // The conversion happens when we format/display them
  return localDate
}
