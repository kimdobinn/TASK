'use client'

import { useMemo } from 'react'
import { useAuth } from './use-auth'
import {
  detectUserTimeZone,
  convertToUTC,
  convertFromUTC,
  formatInTimeZone,
  getTimeZoneDisplay,
  isValidTimeZone,
  DATE_FORMATS,
} from '@/utils/timezone'

/**
 * Hook for managing timezone operations throughout the app
 * Provides user's timezone from profile and utility functions for conversions
 */
export function useTimezone() {
  const { profile } = useAuth()

  // Get user's timezone from profile, fallback to detected timezone
  const userTimeZone = useMemo(() => {
    if (profile?.time_zone && isValidTimeZone(profile.time_zone)) {
      return profile.time_zone
    }
    return detectUserTimeZone()
  }, [profile?.time_zone])

  // Get display name for user's timezone
  const userTimeZoneDisplay = useMemo(
    () => getTimeZoneDisplay(userTimeZone),
    [userTimeZone]
  )

  /**
   * Convert a local date/time to UTC
   * @param date - Date object or ISO string
   * @param sourceTimeZone - Optional timezone, defaults to user's timezone
   */
  const toUTC = (date: Date | string, sourceTimeZone?: string) => {
    return convertToUTC(date, sourceTimeZone || userTimeZone)
  }

  /**
   * Convert a UTC date/time to user's local timezone
   * @param date - Date object or ISO string in UTC
   * @param targetTimeZone - Optional timezone, defaults to user's timezone
   */
  const fromUTC = (date: Date | string, targetTimeZone?: string) => {
    return convertFromUTC(date, targetTimeZone || userTimeZone)
  }

  /**
   * Format a date in user's timezone
   * @param date - Date object or ISO string
   * @param formatStr - Optional format string, defaults to 'PPpp'
   * @param targetTimeZone - Optional timezone, defaults to user's timezone
   */
  const format = (
    date: Date | string,
    formatStr: string = DATE_FORMATS.MEDIUM_WITH_TIME,
    targetTimeZone?: string
  ) => {
    return formatInTimeZone(date, targetTimeZone || userTimeZone, formatStr)
  }

  /**
   * Check if a timezone string is valid
   */
  const isValid = (timeZone: string) => {
    return isValidTimeZone(timeZone)
  }

  return {
    // User's timezone info
    userTimeZone,
    userTimeZoneDisplay,

    // Conversion utilities
    toUTC,
    fromUTC,
    format,
    isValid,

    // Direct access to all timezone utilities
    detectUserTimeZone,
    convertToUTC,
    convertFromUTC,
    formatInTimeZone,
    getTimeZoneDisplay,
    isValidTimeZone,

    // Date format constants
    DATE_FORMATS,
  }
}
