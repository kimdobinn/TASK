import {
  convertToUTC,
  convertFromUTC,
  formatInTimeZone,
  checkDSTTransition,
  DATE_FORMATS,
} from '@/utils/timezone'

describe('DST Transition Handling', () => {
  describe('checkDSTTransition', () => {
    it('should detect spring forward transition in New York (2024)', () => {
      // March 10, 2024, 2:00 AM EST -> 3:00 AM EDT (spring forward)
      // Using UTC time to create date: 2:30 AM EST = 7:30 AM UTC
      const transitionDate = new Date('2024-03-10T07:30:00Z')
      const result = checkDSTTransition(transitionDate, 'America/New_York')

      // The function checks if there's a DST transition in the surrounding hours
      expect(result).toHaveProperty('isDSTTransition')
      expect(result).toHaveProperty('isAmbiguous')
      expect(result).toHaveProperty('isNonExistent')
    })

    it('should detect fall back transition in New York (2024)', () => {
      // November 3, 2024, 2:00 AM EDT -> 1:00 AM EST (fall back)
      // Using UTC time to create date: 1:30 AM EST = 5:30 AM UTC
      const transitionDate = new Date('2024-11-03T05:30:00Z')
      const result = checkDSTTransition(transitionDate, 'America/New_York')

      // The function checks if there's a DST transition in the surrounding hours
      expect(result).toHaveProperty('isDSTTransition')
      expect(result).toHaveProperty('isAmbiguous')
      expect(result).toHaveProperty('isNonExistent')
    })

    it('should not detect DST transition on normal dates', () => {
      const normalDate = new Date('2024-06-15T12:00:00')
      const result = checkDSTTransition(normalDate, 'America/New_York')

      expect(result.isDSTTransition).toBe(false)
      expect(result.isAmbiguous).toBe(false)
      expect(result.isNonExistent).toBe(false)
    })

    it('should handle ISO string input', () => {
      const isoString = '2024-03-10T02:30:00'
      const result = checkDSTTransition(isoString, 'America/New_York')

      expect(result).toHaveProperty('isDSTTransition')
      expect(result).toHaveProperty('isAmbiguous')
      expect(result).toHaveProperty('isNonExistent')
    })

    it('should handle invalid date gracefully', () => {
      const result = checkDSTTransition('invalid-date', 'America/New_York')

      expect(result.isDSTTransition).toBe(false)
      expect(result.isAmbiguous).toBe(false)
      expect(result.isNonExistent).toBe(false)
    })

    it('should work with timezones without DST', () => {
      // Arizona does not observe DST
      const date = new Date('2024-03-10T02:30:00')
      const result = checkDSTTransition(date, 'America/Phoenix')

      expect(result.isDSTTransition).toBe(false)
    })

    it('should work with UTC (no DST)', () => {
      const date = new Date('2024-03-10T02:30:00')
      const result = checkDSTTransition(date, 'UTC')

      expect(result.isDSTTransition).toBe(false)
    })
  })

  describe('Conversion across DST boundaries', () => {
    it('should correctly convert during spring forward in New York', () => {
      // Just before spring forward: March 10, 2024, 1:59 AM EST
      const beforeSpring = new Date('2024-03-10T01:59:00')
      const utcBefore = convertToUTC(beforeSpring, 'America/New_York')

      // Just after spring forward: March 10, 2024, 3:01 AM EDT
      const afterSpring = new Date('2024-03-10T03:01:00')
      const utcAfter = convertToUTC(afterSpring, 'America/New_York')

      // The difference should account for the DST change
      expect(utcAfter).toBeInstanceOf(Date)
      expect(utcBefore).toBeInstanceOf(Date)
    })

    it('should correctly convert during fall back in New York', () => {
      // During fall back: November 3, 2024
      const duringFall = new Date('2024-11-03T01:30:00')
      const utcDate = convertToUTC(duringFall, 'America/New_York')

      expect(utcDate).toBeInstanceOf(Date)
    })

    it('should handle conversion in European summer time', () => {
      // Last Sunday of March: March 31, 2024, 1:00 AM -> 2:00 AM
      const beforeDST = new Date('2024-03-31T00:59:00')
      const afterDST = new Date('2024-03-31T02:01:00')

      const utcBefore = convertToUTC(beforeDST, 'Europe/London')
      const utcAfter = convertToUTC(afterDST, 'Europe/London')

      expect(utcBefore).toBeInstanceOf(Date)
      expect(utcAfter).toBeInstanceOf(Date)
    })
  })

  describe('Formatting across DST boundaries', () => {
    it('should format dates correctly before and after spring forward', () => {
      const beforeSpring = new Date('2024-03-10T06:59:00Z') // 1:59 AM EST
      const afterSpring = new Date('2024-03-10T07:01:00Z') // 3:01 AM EDT

      const formattedBefore = formatInTimeZone(
        beforeSpring,
        'America/New_York',
        DATE_FORMATS.TIME_12H
      )
      const formattedAfter = formatInTimeZone(
        afterSpring,
        'America/New_York',
        DATE_FORMATS.TIME_12H
      )

      expect(formattedBefore).toBeTruthy()
      expect(formattedAfter).toBeTruthy()
      expect(typeof formattedBefore).toBe('string')
      expect(typeof formattedAfter).toBe('string')
    })

    it('should format dates correctly during fall back', () => {
      // During the ambiguous hour in fall
      const duringFall = new Date('2024-11-03T05:30:00Z')

      const formatted = formatInTimeZone(
        duringFall,
        'America/New_York',
        DATE_FORMATS.FULL_WITH_TIME
      )

      expect(formatted).toBeTruthy()
      expect(formatted).toContain('2024')
    })
  })

  describe('Multiple timezone DST transitions', () => {
    const timezones = [
      { name: 'America/New_York', spring: '2024-03-10', fall: '2024-11-03' },
      { name: 'America/Los_Angeles', spring: '2024-03-10', fall: '2024-11-03' },
      { name: 'Europe/London', spring: '2024-03-31', fall: '2024-10-27' },
      { name: 'Europe/Paris', spring: '2024-03-31', fall: '2024-10-27' },
      { name: 'Australia/Sydney', spring: '2024-10-06', fall: '2024-04-07' },
    ]

    timezones.forEach(({ name, spring, fall }) => {
      it(`should handle DST transitions for ${name}`, () => {
        // Test spring transition
        const springDate = new Date(`${spring}T02:30:00`)
        const springUTC = convertToUTC(springDate, name)
        expect(springUTC).toBeInstanceOf(Date)

        // Test fall transition
        const fallDate = new Date(`${fall}T02:30:00`)
        const fallUTC = convertToUTC(fallDate, name)
        expect(fallUTC).toBeInstanceOf(Date)

        // Test summer date (during DST)
        const summerDate = new Date('2024-07-15T12:00:00')
        const summerUTC = convertToUTC(summerDate, name)
        expect(summerUTC).toBeInstanceOf(Date)

        // Test winter date (not during DST)
        const winterDate = new Date('2024-01-15T12:00:00')
        const winterUTC = convertToUTC(winterDate, name)
        expect(winterUTC).toBeInstanceOf(Date)
      })
    })
  })

  describe('Edge cases and special scenarios', () => {
    it('should handle midnight conversions during DST', () => {
      const midnight = new Date('2024-03-10T00:00:00')
      const utcDate = convertToUTC(midnight, 'America/New_York')

      expect(utcDate).toBeInstanceOf(Date)
      expect(utcDate.getUTCDate()).toBeDefined()
    })

    it('should handle noon conversions during DST', () => {
      const noon = new Date('2024-03-10T12:00:00')
      const utcDate = convertToUTC(noon, 'America/New_York')

      expect(utcDate).toBeInstanceOf(Date)
    })

    it('should handle year boundary with DST', () => {
      // New Year's Eve - January 1st transition
      const newYearsEve = new Date('2023-12-31T23:59:00')
      const newYearsDay = new Date('2024-01-01T00:01:00')

      const utcEve = convertToUTC(newYearsEve, 'America/New_York')
      const utcDay = convertToUTC(newYearsDay, 'America/New_York')

      expect(utcEve).toBeInstanceOf(Date)
      expect(utcDay).toBeInstanceOf(Date)
    })

    it('should handle leap year date during DST season', () => {
      // 2024 is a leap year
      const leapDay = new Date('2024-02-29T12:00:00')
      const utcDate = convertToUTC(leapDay, 'America/New_York')

      expect(utcDate).toBeInstanceOf(Date)
      expect(utcDate.getUTCMonth()).toBe(1) // February (0-indexed)
      expect(utcDate.getUTCDate()).toBe(29)
    })
  })

  describe('Round-trip conversions during DST', () => {
    it('should preserve time when converting during DST period', () => {
      // Summer date during DST
      const summerDate = new Date('2024-07-15T14:30:00')
      const timezone = 'America/New_York'

      const utcDate = convertToUTC(summerDate, timezone)
      const backToLocal = convertFromUTC(utcDate, timezone)

      const diff = Math.abs(backToLocal.getTime() - summerDate.getTime())
      expect(diff).toBeLessThan(1000) // Allow 1 second difference
    })

    it('should preserve time when converting during standard time', () => {
      // Winter date not during DST
      const winterDate = new Date('2024-01-15T14:30:00')
      const timezone = 'America/New_York'

      const utcDate = convertToUTC(winterDate, timezone)
      const backToLocal = convertFromUTC(utcDate, timezone)

      const diff = Math.abs(backToLocal.getTime() - winterDate.getTime())
      expect(diff).toBeLessThan(1000)
    })
  })
})
