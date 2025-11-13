'use client'

import { useMemo } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { detectUserTimeZone, getTimeZoneDisplay } from '@/utils/timezone'

// Common timezones organized by region
const COMMON_TIMEZONES = [
  // US & Canada
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'America/Toronto',
  'America/Vancouver',

  // Europe
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Amsterdam',
  'Europe/Brussels',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Stockholm',
  'Europe/Warsaw',

  // Asia
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Asia/Singapore',
  'Asia/Bangkok',
  'Asia/Dubai',
  'Asia/Kolkata',

  // Pacific
  'Australia/Sydney',
  'Australia/Melbourne',
  'Pacific/Auckland',

  // Other Americas
  'America/Sao_Paulo',
  'America/Mexico_City',
  'America/Argentina/Buenos_Aires',

  // UTC
  'UTC',
]

interface TimeZoneSelectorProps {
  value?: string
  onChange: (timezone: string) => void
  disabled?: boolean
  className?: string
}

export function TimeZoneSelector({
  value,
  onChange,
  disabled = false,
  className,
}: TimeZoneSelectorProps) {
  // Get the current detected timezone
  const detectedTimeZone = useMemo(() => detectUserTimeZone(), [])

  // Sort timezones with detected one first, then alphabetically
  const sortedTimezones = useMemo(() => {
    const timezones = [...COMMON_TIMEZONES]

    // Add detected timezone if not in list
    if (!timezones.includes(detectedTimeZone)) {
      timezones.unshift(detectedTimeZone)
    }

    // Sort by display name
    return timezones.sort((a, b) => {
      // Keep detected timezone at top
      if (a === detectedTimeZone) return -1
      if (b === detectedTimeZone) return 1

      // Sort alphabetically by timezone name
      return a.localeCompare(b)
    })
  }, [detectedTimeZone])

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Select your time zone" />
      </SelectTrigger>
      <SelectContent>
        {sortedTimezones.map((tz) => (
          <SelectItem key={tz} value={tz}>
            {tz === detectedTimeZone && '🌍 '}
            {getTimeZoneDisplay(tz)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
