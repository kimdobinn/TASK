'use client'

import { createClient } from '@/lib/supabase'
import type {
  BlockedTime,
  CreateBlockedTimeInput,
  UpdateBlockedTimeInput,
} from '@/types'
import { parseSupabaseError } from '@/lib/supabase-errors'

/**
 * Create a new blocked time for a tutor
 * @param input - Blocked time data (times must be in UTC)
 * @returns Created blocked time
 */
export async function createBlockedTime(
  input: CreateBlockedTimeInput
): Promise<BlockedTime> {
  try {
    const supabase = createClient()

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('User must be authenticated')
    }

    // Validate time range
    const startTime = new Date(input.start_time)
    const endTime = new Date(input.end_time)

    if (endTime <= startTime) {
      throw new Error('End time must be after start time')
    }

    // Create the blocked time
    const { data, error } = await supabase
      .from('blocked_times')
      .insert({
        tutor_id: user.id,
        start_time: input.start_time,
        end_time: input.end_time,
        is_recurring: input.is_recurring,
        recurrence_pattern: input.recurrence_pattern || null,
      })
      .select()
      .single()

    if (error) {
      throw parseSupabaseError(error)
    }

    return data as BlockedTime
  } catch (error) {
    console.error('Error creating blocked time:', error)
    throw error
  }
}

/**
 * Get all blocked times for a tutor
 * @param tutorId - Tutor's user ID (optional, defaults to current user)
 * @param startDate - Filter blocked times starting from this date
 * @param endDate - Filter blocked times until this date
 * @returns Array of blocked times
 */
export async function getBlockedTimes(
  tutorId?: string,
  startDate?: Date,
  endDate?: Date
): Promise<BlockedTime[]> {
  try {
    const supabase = createClient()

    // Get current user if tutorId not provided
    let targetTutorId = tutorId
    if (!targetTutorId) {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('User must be authenticated')
      }
      targetTutorId = user.id
    }

    // Build query
    let query = supabase
      .from('blocked_times')
      .select('*')
      .eq('tutor_id', targetTutorId)
      .order('start_time', { ascending: true })

    // Add date filters if provided
    if (startDate) {
      query = query.gte('end_time', startDate.toISOString())
    }
    if (endDate) {
      query = query.lte('start_time', endDate.toISOString())
    }

    const { data, error } = await query

    if (error) {
      throw parseSupabaseError(error)
    }

    return (data || []) as BlockedTime[]
  } catch (error) {
    console.error('Error fetching blocked times:', error)
    throw error
  }
}

/**
 * Get a single blocked time by ID
 * @param id - Blocked time ID
 * @returns Blocked time or null if not found
 */
export async function getBlockedTimeById(
  id: string
): Promise<BlockedTime | null> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('blocked_times')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null
      }
      throw parseSupabaseError(error)
    }

    return data as BlockedTime
  } catch (error) {
    console.error('Error fetching blocked time:', error)
    throw error
  }
}

/**
 * Update a blocked time
 * @param id - Blocked time ID
 * @param input - Updated blocked time data
 * @returns Updated blocked time
 */
export async function updateBlockedTime(
  id: string,
  input: UpdateBlockedTimeInput
): Promise<BlockedTime> {
  try {
    const supabase = createClient()

    // Validate time range if both start and end are provided
    if (input.start_time && input.end_time) {
      const startTime = new Date(input.start_time)
      const endTime = new Date(input.end_time)

      if (endTime <= startTime) {
        throw new Error('End time must be after start time')
      }
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (input.start_time !== undefined) updateData.start_time = input.start_time
    if (input.end_time !== undefined) updateData.end_time = input.end_time
    if (input.is_recurring !== undefined)
      updateData.is_recurring = input.is_recurring
    if (input.recurrence_pattern !== undefined)
      updateData.recurrence_pattern = input.recurrence_pattern

    const { data, error } = await supabase
      .from('blocked_times')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw parseSupabaseError(error)
    }

    return data as BlockedTime
  } catch (error) {
    console.error('Error updating blocked time:', error)
    throw error
  }
}

/**
 * Delete a blocked time
 * @param id - Blocked time ID
 * @returns True if successful
 */
export async function deleteBlockedTime(id: string): Promise<boolean> {
  try {
    const supabase = createClient()

    const { error } = await supabase.from('blocked_times').delete().eq('id', id)

    if (error) {
      throw parseSupabaseError(error)
    }

    return true
  } catch (error) {
    console.error('Error deleting blocked time:', error)
    throw error
  }
}

/**
 * Check if there are any blocked times overlapping with the given time range
 * @param tutorId - Tutor's user ID
 * @param startTime - Start time in UTC
 * @param endTime - End time in UTC
 * @param excludeId - Optional blocked time ID to exclude from check (for updates)
 * @returns Array of overlapping blocked times
 */
export async function checkBlockedTimeConflicts(
  tutorId: string,
  startTime: string,
  endTime: string,
  excludeId?: string
): Promise<BlockedTime[]> {
  try {
    const supabase = createClient()

    let query = supabase
      .from('blocked_times')
      .select('*')
      .eq('tutor_id', tutorId)
      .or(`start_time.lte.${endTime},end_time.gte.${startTime}`)

    // Exclude specific ID if provided (useful for updates)
    if (excludeId) {
      query = query.neq('id', excludeId)
    }

    const { data, error } = await query

    if (error) {
      throw parseSupabaseError(error)
    }

    // Filter in memory for more precise overlap detection
    const conflicts = (data || []).filter((blocked) => {
      const blockedStart = new Date(blocked.start_time)
      const blockedEnd = new Date(blocked.end_time)
      const newStart = new Date(startTime)
      const newEnd = new Date(endTime)

      return (
        (newStart >= blockedStart && newStart < blockedEnd) || // New start is within blocked period
        (newEnd > blockedStart && newEnd <= blockedEnd) || // New end is within blocked period
        (newStart <= blockedStart && newEnd >= blockedEnd) // New period completely contains blocked period
      )
    })

    return conflicts as BlockedTime[]
  } catch (error) {
    console.error('Error checking blocked time conflicts:', error)
    throw error
  }
}
