import { getBlockedTimes } from '@/lib/blocked-times'
import { checkBookingConflicts } from '@/lib/booking-requests'
import type { BlockedTime } from '@/types'
import { addMinutes, isWithinInterval, startOfDay, endOfDay, eachDayOfInterval } from 'date-fns'

export interface TimeSlot {
  start: Date
  end: Date
  isAvailable: boolean
  conflictReason?: 'blocked' | 'booked'
}

export interface AvailabilityOptions {
  tutorId: string
  startDate: Date
  endDate: Date
  slotDurationMinutes?: number // Default: 30
  businessHoursOnly?: boolean // Default: true
  businessHoursStart?: number // Default: 9 (9am)
  businessHoursEnd?: number // Default: 17 (5pm)
}

/**
 * Generate all possible time slots within a date range
 * Subtask 9.1 & 9.3: Core algorithm and slot generation
 */
function generateTimeSlots(
  startDate: Date,
  endDate: Date,
  slotDurationMinutes: number = 30,
  businessHoursOnly: boolean = true,
  businessHoursStart: number = 9,
  businessHoursEnd: number = 17
): TimeSlot[] {
  const slots: TimeSlot[] = []
  const days = eachDayOfInterval({ start: startDate, end: endDate })

  for (const day of days) {
    // Determine start and end times for the day
    const dayStart = businessHoursOnly
      ? new Date(day.setHours(businessHoursStart, 0, 0, 0))
      : startOfDay(day)

    const dayEnd = businessHoursOnly
      ? new Date(day.setHours(businessHoursEnd, 0, 0, 0))
      : endOfDay(day)

    // Generate slots for this day
    let currentSlotStart = dayStart

    while (currentSlotStart < dayEnd) {
      const currentSlotEnd = addMinutes(currentSlotStart, slotDurationMinutes)

      // Only add slot if it fits within the day's end time
      if (currentSlotEnd <= dayEnd) {
        slots.push({
          start: new Date(currentSlotStart),
          end: new Date(currentSlotEnd),
          isAvailable: true, // Will be marked unavailable later
        })
      }

      currentSlotStart = currentSlotEnd
    }
  }

  return slots
}

/**
 * Check if a time slot overlaps with a blocked time or booking
 * Subtask 9.4: Overlap detection
 */
function isSlotBlocked(slot: TimeSlot, blockedTime: BlockedTime): boolean {
  const slotStart = slot.start.getTime()
  const slotEnd = slot.end.getTime()
  const blockedStart = new Date(blockedTime.start_time).getTime()
  const blockedEnd = new Date(blockedTime.end_time).getTime()

  // Check for any overlap
  return (
    (slotStart >= blockedStart && slotStart < blockedEnd) ||
    (slotEnd > blockedStart && slotEnd <= blockedEnd) ||
    (slotStart <= blockedStart && slotEnd >= blockedEnd)
  )
}

/**
 * Handle recurring blocked times
 * Subtask 9.6: Edge cases - recurring patterns
 */
function expandRecurringBlockedTime(
  blockedTime: BlockedTime,
  startDate: Date,
  endDate: Date
): BlockedTime[] {
  if (!blockedTime.is_recurring || !blockedTime.recurrence_pattern) {
    return [blockedTime]
  }

  const pattern = blockedTime.recurrence_pattern
  const expanded: BlockedTime[] = []
  const originalStart = new Date(blockedTime.start_time)
  const originalEnd = new Date(blockedTime.end_time)
  const duration = originalEnd.getTime() - originalStart.getTime()

  // Determine recurrence end date
  const recurrenceEndDate = pattern.end_date
    ? new Date(pattern.end_date)
    : endDate

  let currentDate = new Date(originalStart)

  while (currentDate <= recurrenceEndDate && currentDate <= endDate) {
    // Check if this occurrence should be included
    let shouldInclude = false

    if (pattern.frequency === 'daily') {
      shouldInclude = true
    } else if (pattern.frequency === 'weekly' && pattern.days_of_week) {
      const dayOfWeek = currentDate.getDay()
      shouldInclude = pattern.days_of_week.includes(dayOfWeek)
    } else if (pattern.frequency === 'monthly') {
      shouldInclude = currentDate.getDate() === originalStart.getDate()
    }

    if (shouldInclude && currentDate >= startDate) {
      expanded.push({
        ...blockedTime,
        start_time: currentDate.toISOString(),
        end_time: new Date(currentDate.getTime() + duration).toISOString(),
        is_recurring: false, // Mark as non-recurring to avoid infinite recursion
      })
    }

    // Move to next occurrence
    if (pattern.frequency === 'daily') {
      currentDate = addMinutes(currentDate, (pattern.interval || 1) * 24 * 60)
    } else if (pattern.frequency === 'weekly') {
      currentDate = addMinutes(currentDate, (pattern.interval || 1) * 7 * 24 * 60)
    } else if (pattern.frequency === 'monthly') {
      const nextMonth = new Date(currentDate)
      nextMonth.setMonth(nextMonth.getMonth() + (pattern.interval || 1))
      currentDate = nextMonth
    }
  }

  return expanded
}

/**
 * Mark slots as unavailable based on blocked times
 * Subtask 9.2: Blocked time exclusion
 */
function applyBlockedTimes(slots: TimeSlot[], blockedTimes: BlockedTime[]): TimeSlot[] {
  return slots.map((slot) => {
    // Check if slot conflicts with any blocked time
    for (const blockedTime of blockedTimes) {
      if (isSlotBlocked(slot, blockedTime)) {
        return {
          ...slot,
          isAvailable: false,
          conflictReason: 'blocked',
        }
      }
    }
    return slot
  })
}

/**
 * Get available time slots for a tutor
 * Main entry point for availability calculation
 */
export async function getAvailableSlots(
  options: AvailabilityOptions
): Promise<TimeSlot[]> {
  const {
    tutorId,
    startDate,
    endDate,
    slotDurationMinutes = 30,
    businessHoursOnly = true,
    businessHoursStart = 9,
    businessHoursEnd = 17,
  } = options

  try {
    // Step 1: Generate all possible time slots
    let slots = generateTimeSlots(
      startDate,
      endDate,
      slotDurationMinutes,
      businessHoursOnly,
      businessHoursStart,
      businessHoursEnd
    )

    // Step 2: Fetch blocked times for the tutor
    const blockedTimes = await getBlockedTimes(tutorId, startDate, endDate)

    // Step 3: Expand recurring blocked times
    const expandedBlockedTimes: BlockedTime[] = []
    for (const blockedTime of blockedTimes) {
      expandedBlockedTimes.push(...expandRecurringBlockedTime(blockedTime, startDate, endDate))
    }

    // Step 4: Apply blocked times to mark slots as unavailable
    slots = applyBlockedTimes(slots, expandedBlockedTimes)

    // Step 5: Check for booking conflicts
    // For each slot, check if there's an approved booking
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i]
      if (!slot.isAvailable) continue // Skip already blocked slots

      const conflicts = await checkBookingConflicts(
        tutorId,
        slot.start.toISOString(),
        slot.end.toISOString()
      )

      if (conflicts.length > 0) {
        slots[i] = {
          ...slot,
          isAvailable: false,
          conflictReason: 'booked',
        }
      }
    }

    return slots
  } catch (error) {
    console.error('Error calculating availability:', error)
    throw new Error('Failed to calculate availability')
  }
}

/**
 * Get only available (non-conflicted) slots
 */
export async function getOnlyAvailableSlots(
  options: AvailabilityOptions
): Promise<TimeSlot[]> {
  const allSlots = await getAvailableSlots(options)
  return allSlots.filter((slot) => slot.isAvailable)
}

/**
 * Group slots by day for easier UI rendering
 */
export function groupSlotsByDay(slots: TimeSlot[]): Map<string, TimeSlot[]> {
  const grouped = new Map<string, TimeSlot[]>()

  for (const slot of slots) {
    const dayKey = slot.start.toISOString().split('T')[0] // YYYY-MM-DD
    if (!grouped.has(dayKey)) {
      grouped.set(dayKey, [])
    }
    grouped.get(dayKey)!.push(slot)
  }

  return grouped
}

/**
 * Check if a specific time range is available
 * Useful for validating booking requests
 */
export async function isTimeRangeAvailable(
  tutorId: string,
  startTime: Date,
  endTime: Date
): Promise<{ available: boolean; reason?: string }> {
  try {
    // Get slots for the specific time range
    const slots = await getAvailableSlots({
      tutorId,
      startDate: startTime,
      endDate: endTime,
      slotDurationMinutes: Math.floor((endTime.getTime() - startTime.getTime()) / 60000),
      businessHoursOnly: false, // Don't restrict to business hours for validation
    })

    // Check if all slots in the range are available
    const unavailableSlot = slots.find((slot) => !slot.isAvailable)

    if (unavailableSlot) {
      return {
        available: false,
        reason: unavailableSlot.conflictReason === 'blocked'
          ? 'This time conflicts with a blocked time slot'
          : 'This time has already been booked',
      }
    }

    return { available: true }
  } catch (error) {
    console.error('Error checking time range availability:', error)
    return {
      available: false,
      reason: 'Failed to check availability',
    }
  }
}
