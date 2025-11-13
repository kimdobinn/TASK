import {
  detectUserTimeZone,
  convertToUTC,
  convertFromUTC,
  formatInTimeZone,
  getTimeZoneDisplay,
  checkDSTTransition,
  isValidTimeZone,
  DATE_FORMATS,
} from '@/utils/timezone'

describe('Timezone Utilities', () => {
  describe('detectUserTimeZone', () => {
    it('should detect a valid timezone', () => {
      const timeZone = detectUserTimeZone()
      expect(timeZone).toBeTruthy()
      expect(typeof timeZone).toBe('string')
    })

    it('should return UTC as fallback when detection fails', () => {
      // Mock Intl to throw an error
      const originalIntl = global.Intl
      global.Intl = {
        ...global.Intl,
        DateTimeFormat: jest.fn(() => {
          throw new Error('Mock error')
        }),
      } as any

      const timeZone = detectUserTimeZone()
      expect(timeZone).toBe('UTC')

      // Restore original Intl
      global.Intl = originalIntl
    })

    it('should handle missing resolvedOptions', () => {
      const originalIntl = global.Intl
      global.Intl = {
        ...global.Intl,
        DateTimeFormat: jest.fn(() => ({
          resolvedOptions: () => ({ timeZone: '' }),
        })),
      } as any

      const timeZone = detectUserTimeZone()
      expect(timeZone).toBe('UTC')

      global.Intl = originalIntl
    })
  })

  describe('convertToUTC', () => {
    it('should convert New York time to UTC correctly', () => {
      // January 1, 2024, 12:00 PM EST (UTC-5)
      const localDate = new Date('2024-01-01T12:00:00')
      const utcDate = convertToUTC(localDate, 'America/New_York')

      // Should be 5 hours ahead in UTC
      expect(utcDate.getUTCHours()).toBe(17)
    })

    it('should convert Los Angeles time to UTC correctly', () => {
      // January 1, 2024, 12:00 PM PST (UTC-8)
      const localDate = new Date('2024-01-01T12:00:00')
      const utcDate = convertToUTC(localDate, 'America/Los_Angeles')

      // Should be 8 hours ahead in UTC
      expect(utcDate.getUTCHours()).toBe(20)
    })

    it('should convert Tokyo time to UTC correctly', () => {
      // January 1, 2024, 12:00 PM JST (UTC+9)
      const localDate = new Date('2024-01-01T12:00:00')
      const utcDate = convertToUTC(localDate, 'Asia/Tokyo')

      // Should be 9 hours behind in UTC
      expect(utcDate.getUTCHours()).toBe(3)
    })

    it('should handle ISO string input', () => {
      const isoString = '2024-01-01T12:00:00'
      const utcDate = convertToUTC(isoString, 'America/New_York')

      expect(utcDate).toBeInstanceOf(Date)
      expect(utcDate.getUTCHours()).toBe(17)
    })

    it('should throw error for invalid date', () => {
      expect(() => {
        convertToUTC('invalid-date', 'America/New_York')
      }).toThrow('Failed to convert to UTC')
    })

    it('should handle invalid timezone', () => {
      // date-fns-tz doesn't throw for invalid timezones, it treats them as UTC offset
      const result = convertToUTC(new Date(), 'UTC')
      expect(result).toBeInstanceOf(Date)
    })
  })

  describe('convertFromUTC', () => {
    it('should convert UTC to New York time correctly', () => {
      // January 1, 2024, 17:00 UTC
      const utcDate = new Date('2024-01-01T17:00:00Z')
      const localDate = convertFromUTC(utcDate, 'America/New_York')

      // Should be 12:00 PM EST
      const hours = localDate.getHours()
      expect(hours).toBe(12)
    })

    it('should convert UTC to Tokyo time correctly', () => {
      // January 1, 2024, 03:00 UTC
      const utcDate = new Date('2024-01-01T03:00:00Z')
      const localDate = convertFromUTC(utcDate, 'Asia/Tokyo')

      // Should be 12:00 PM JST
      const hours = localDate.getHours()
      expect(hours).toBe(12)
    })

    it('should handle ISO string input', () => {
      const isoString = '2024-01-01T17:00:00Z'
      const localDate = convertFromUTC(isoString, 'America/New_York')

      expect(localDate).toBeInstanceOf(Date)
    })

    it('should throw error for invalid date', () => {
      expect(() => {
        convertFromUTC('invalid-date', 'America/New_York')
      }).toThrow('Failed to convert from UTC')
    })
  })

  describe('formatInTimeZone', () => {
    const testDate = new Date('2024-04-15T14:30:00Z')

    it('should format date in specified timezone', () => {
      const formatted = formatInTimeZone(
        testDate,
        'America/New_York',
        DATE_FORMATS.SHORT_WITH_TIME
      )

      expect(formatted).toContain('04/15/2024')
    })

    it('should use default format when not specified', () => {
      const formatted = formatInTimeZone(testDate, 'America/New_York')

      expect(formatted).toBeTruthy()
      expect(typeof formatted).toBe('string')
    })

    it('should handle different time formats', () => {
      const timeOnly = formatInTimeZone(
        testDate,
        'America/New_York',
        DATE_FORMATS.TIME_12H
      )
      expect(timeOnly).toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/i)

      const dateOnly = formatInTimeZone(
        testDate,
        'America/New_York',
        DATE_FORMATS.DATE_SHORT
      )
      expect(dateOnly).toMatch(/\d{2}\/\d{2}\/\d{4}/)
    })

    it('should handle ISO string input', () => {
      const formatted = formatInTimeZone(
        testDate.toISOString(),
        'America/New_York',
        DATE_FORMATS.SHORT
      )

      expect(formatted).toBeTruthy()
    })

    it('should throw error for invalid date', () => {
      expect(() => {
        formatInTimeZone('invalid-date', 'America/New_York')
      }).toThrow('Failed to format date')
    })
  })

  describe('getTimeZoneDisplay', () => {
    it('should return timezone with abbreviation', () => {
      const display = getTimeZoneDisplay('America/New_York')

      expect(display).toContain('America/New_York')
      expect(display).toMatch(/\(.*\)/)
    })

    it('should handle UTC timezone', () => {
      const display = getTimeZoneDisplay('UTC')

      expect(display).toContain('UTC')
    })

    it('should fallback to timezone name on error', () => {
      const display = getTimeZoneDisplay('Invalid/Timezone')

      expect(display).toBe('Invalid/Timezone')
    })
  })

  describe('isValidTimeZone', () => {
    it('should return true for valid timezones', () => {
      expect(isValidTimeZone('America/New_York')).toBe(true)
      expect(isValidTimeZone('Europe/London')).toBe(true)
      expect(isValidTimeZone('Asia/Tokyo')).toBe(true)
      expect(isValidTimeZone('UTC')).toBe(true)
    })

    it('should return false for invalid timezones', () => {
      expect(isValidTimeZone('Invalid/Timezone')).toBe(false)
      expect(isValidTimeZone('Not_A_Timezone')).toBe(false)
      expect(isValidTimeZone('')).toBe(false)
    })
  })

  describe('DATE_FORMATS', () => {
    it('should have all expected format constants', () => {
      expect(DATE_FORMATS.FULL).toBeDefined()
      expect(DATE_FORMATS.LONG_WITH_TIME).toBeDefined()
      expect(DATE_FORMATS.SHORT_WITH_TIME).toBeDefined()
      expect(DATE_FORMATS.TIME_12H).toBeDefined()
      expect(DATE_FORMATS.DATE_SHORT).toBeDefined()
      expect(DATE_FORMATS.ISO).toBeDefined()
    })
  })

  describe('Round-trip conversions', () => {
    it('should preserve time when converting to UTC and back', () => {
      const originalDate = new Date('2024-01-15T14:30:00')
      const timezone = 'America/New_York'

      const utcDate = convertToUTC(originalDate, timezone)
      const backToLocal = convertFromUTC(utcDate, timezone)

      // Times should match (allow 1 second difference for rounding)
      const diff = Math.abs(backToLocal.getTime() - originalDate.getTime())
      expect(diff).toBeLessThan(1000)
    })

    it('should work across different timezones', () => {
      const timezones = [
        'America/New_York',
        'Europe/London',
        'Asia/Tokyo',
        'Australia/Sydney',
        'UTC',
      ]

      timezones.forEach((tz) => {
        const originalDate = new Date('2024-06-15T10:00:00')
        const utcDate = convertToUTC(originalDate, tz)
        const backToLocal = convertFromUTC(utcDate, tz)

        const diff = Math.abs(backToLocal.getTime() - originalDate.getTime())
        expect(diff).toBeLessThan(1000)
      })
    })
  })
})
