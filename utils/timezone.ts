// Time zone utilities for handling conversions and formatting

import { format, formatInTimeZone as formatInTZ, toZonedTime, fromZonedTime } from 'date-fns-tz'
import { parseISO, isValid } from 'date-fns'

/**
 * Detect the user's current time zone
 * Uses Intl API with fallback to UTC
 */
export function detectUserTimeZone(): string {
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (timeZone) {
      return timeZone
    }
  } catch (error) {
    console.error('Failed to detect timezone:', error)
  }

  // Fallback to UTC if detection fails
  return 'UTC'
}

/**
 * Convert a local date/time to UTC
 * @param date - Date object or ISO string
 * @param timeZone - IANA timezone (e.g., 'America/New_York')
 * @returns Date object in UTC
 */
export function convertToUTC(date: Date | string, timeZone: string): Date {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date

    if (!isValid(dateObj)) {
      throw new Error('Invalid date provided')
    }

    // Convert from the specified timezone to UTC
    return fromZonedTime(dateObj, timeZone)
  } catch (error) {
    console.error('Error converting to UTC:', error)
    throw new Error(`Failed to convert to UTC: ${error}`)
  }
}

/**
 * Convert a UTC date/time to a specific time zone
 * @param date - Date object or ISO string in UTC
 * @param timeZone - IANA timezone (e.g., 'America/New_York')
 * @returns Date object in the specified timezone
 */
export function convertFromUTC(date: Date | string, timeZone: string): Date {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date

    if (!isValid(dateObj)) {
      throw new Error('Invalid date provided')
    }

    // Convert from UTC to the specified timezone
    return toZonedTime(dateObj, timeZone)
  } catch (error) {
    console.error('Error converting from UTC:', error)
    throw new Error(`Failed to convert from UTC: ${error}`)
  }
}

/**
 * Format a date in a specific time zone
 * @param date - Date object or ISO string
 * @param timeZone - IANA timezone
 * @param formatStr - date-fns format string
 * @returns Formatted date string
 */
export function formatInTimeZone(
  date: Date | string,
  timeZone: string,
  formatStr: string = 'PPpp'
): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date

    if (!isValid(dateObj)) {
      throw new Error('Invalid date provided')
    }

    return formatInTZ(dateObj, timeZone, formatStr)
  } catch (error) {
    console.error('Error formatting date:', error)
    throw new Error(`Failed to format date: ${error}`)
  }
}

/**
 * Common date format patterns
 */
export const DATE_FORMATS = {
  // Long formats
  FULL: 'PPPP', // Monday, April 29th, 2024
  LONG: 'PPP',  // April 29th, 2024
  LONG_WITH_TIME: 'PPPp', // April 29th, 2024 at 12:00 PM
  FULL_WITH_TIME: 'PPPPp', // Monday, April 29th, 2024 at 12:00 PM

  // Medium formats
  MEDIUM: 'PP',     // Apr 29, 2024
  MEDIUM_WITH_TIME: 'PPpp', // Apr 29, 2024, 12:00:00 PM

  // Short formats
  SHORT: 'P',       // 04/29/2024
  SHORT_WITH_TIME: 'Pp', // 04/29/2024, 12:00 PM

  // Time only
  TIME_12H: 'p',    // 12:00 PM
  TIME_24H: 'HH:mm', // 12:00
  TIME_WITH_SECONDS: 'pp', // 12:00:00 PM

  // Date only
  DATE_SHORT: 'MM/dd/yyyy',   // 04/29/2024
  DATE_MEDIUM: 'MMM d, yyyy', // Apr 29, 2024
  DATE_LONG: 'MMMM d, yyyy',  // April 29, 2024

  // ISO
  ISO: "yyyy-MM-dd'T'HH:mm:ssXXX", // 2024-04-29T12:00:00-04:00
  ISO_DATE: 'yyyy-MM-dd',          // 2024-04-29
  ISO_TIME: 'HH:mm:ss',            // 12:00:00
} as const

/**
 * Get a user-friendly timezone name
 * @param timeZone - IANA timezone
 * @returns Formatted timezone string with offset
 */
export function getTimeZoneDisplay(timeZone: string): string {
  try {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'short',
    })

    const parts = formatter.formatToParts(now)
    const timeZonePart = parts.find((part) => part.type === 'timeZoneName')

    if (timeZonePart) {
      return `${timeZone} (${timeZonePart.value})`
    }

    return timeZone
  } catch (error) {
    console.error('Error getting timezone display:', error)
    return timeZone
  }
}

/**
 * Check if a date/time is during a DST transition
 * @param date - Date to check
 * @param timeZone - IANA timezone
 * @returns Object with transition info
 */
export function checkDSTTransition(
  date: Date | string,
  timeZone: string
): {
  isDSTTransition: boolean
  isAmbiguous: boolean
  isNonExistent: boolean
} {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date

    if (!isValid(dateObj)) {
      throw new Error('Invalid date provided')
    }

    // Get the offset before and after the date
    const beforeDate = new Date(dateObj.getTime() - 1000 * 60 * 60) // 1 hour before
    const afterDate = new Date(dateObj.getTime() + 1000 * 60 * 60)  // 1 hour after

    const offsetBefore = getTimeZoneOffset(beforeDate, timeZone)
    const offsetCurrent = getTimeZoneOffset(dateObj, timeZone)
    const offsetAfter = getTimeZoneOffset(afterDate, timeZone)

    // Check for DST transition
    const isDSTTransition = offsetBefore !== offsetCurrent || offsetCurrent !== offsetAfter

    // Ambiguous time: when clocks fall back (same time occurs twice)
    const isAmbiguous = offsetBefore > offsetCurrent

    // Non-existent time: when clocks spring forward (time is skipped)
    const isNonExistent = offsetBefore < offsetCurrent

    return {
      isDSTTransition,
      isAmbiguous,
      isNonExistent,
    }
  } catch (error) {
    console.error('Error checking DST transition:', error)
    return {
      isDSTTransition: false,
      isAmbiguous: false,
      isNonExistent: false,
    }
  }
}

/**
 * Get timezone offset in minutes
 * @param date - Date object
 * @param timeZone - IANA timezone
 * @returns Offset in minutes
 */
function getTimeZoneOffset(date: Date, timeZone: string): number {
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }))
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone }))
  return (tzDate.getTime() - utcDate.getTime()) / 60000
}

/**
 * Validate if a time zone string is valid
 * @param timeZone - IANA timezone to validate
 * @returns Boolean indicating if timezone is valid
 */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat('en-US', { timeZone })
    return true
  } catch {
    return false
  }
}
