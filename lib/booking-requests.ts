import { createClient } from '@/lib/supabase'
import { parseSupabaseError } from '@/lib/supabase-errors'
import type { BookingRequest, BookingStatus } from '@/types'

/**
 * Create a new booking request
 */
export async function createBookingRequest(input: {
  tutor_id: string
  subject: string
  duration_minutes: 30 | 60 | 120
  requested_start_time: string // ISO string in UTC
  requested_end_time: string // ISO string in UTC
  specific_requests?: string
}): Promise<BookingRequest> {
  try {
    const supabase = createClient()

    // Get current user (student)
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      throw new Error('User must be authenticated')
    }

    // Validate time range
    const startTime = new Date(input.requested_start_time)
    const endTime = new Date(input.requested_end_time)

    if (endTime <= startTime) {
      throw new Error('End time must be after start time')
    }

    // Validate duration matches time range
    const durationMs = endTime.getTime() - startTime.getTime()
    const expectedDurationMs = input.duration_minutes * 60 * 1000

    if (Math.abs(durationMs - expectedDurationMs) > 60000) { // Allow 1 minute tolerance
      throw new Error('Duration does not match the time range')
    }

    // Create booking request
    const { data, error } = await supabase
      .from('booking_requests')
      .insert({
        student_id: user.id,
        tutor_id: input.tutor_id,
        subject: input.subject,
        duration_minutes: input.duration_minutes,
        requested_start_time: input.requested_start_time,
        requested_end_time: input.requested_end_time,
        specific_requests: input.specific_requests || '',
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      throw parseSupabaseError(error)
    }

    return data as BookingRequest
  } catch (error) {
    console.error('Error creating booking request:', error)
    throw error
  }
}

/**
 * Get booking requests for the current user (student or tutor)
 */
export async function getBookingRequests(filters?: {
  status?: BookingStatus
  tutorId?: string
  studentId?: string
}): Promise<BookingRequest[]> {
  try {
    const supabase = createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      throw new Error('User must be authenticated')
    }

    let query = supabase.from('booking_requests').select('*').order('created_at', { ascending: false })

    // If no specific filters, show user's own requests
    if (!filters?.tutorId && !filters?.studentId) {
      // Get user profile to determine role
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role === 'tutor') {
        query = query.eq('tutor_id', user.id)
      } else {
        query = query.eq('student_id', user.id)
      }
    } else {
      if (filters.tutorId) {
        query = query.eq('tutor_id', filters.tutorId)
      }
      if (filters.studentId) {
        query = query.eq('student_id', filters.studentId)
      }
    }

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    const { data, error } = await query

    if (error) {
      throw parseSupabaseError(error)
    }

    return (data || []) as BookingRequest[]
  } catch (error) {
    console.error('Error fetching booking requests:', error)
    throw error
  }
}

/**
 * Get a single booking request by ID
 */
export async function getBookingRequestById(id: string): Promise<BookingRequest | null> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('booking_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw parseSupabaseError(error)
    }

    return data as BookingRequest
  } catch (error) {
    console.error('Error fetching booking request:', error)
    throw error
  }
}

/**
 * Update booking request status (tutor only)
 */
export async function updateBookingRequestStatus(
  id: string,
  status: BookingStatus,
  rejectionNote?: string
): Promise<BookingRequest> {
  try {
    const supabase = createClient()

    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    }

    if (status === 'rejected' && rejectionNote) {
      updateData.rejection_note = rejectionNote
    }

    const { data, error } = await supabase
      .from('booking_requests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw parseSupabaseError(error)
    }

    return data as BookingRequest
  } catch (error) {
    console.error('Error updating booking request:', error)
    throw error
  }
}

/**
 * Cancel a booking request (student only)
 */
export async function cancelBookingRequest(id: string): Promise<boolean> {
  try {
    const supabase = createClient()

    const { error } = await supabase.from('booking_requests').delete().eq('id', id)

    if (error) {
      throw parseSupabaseError(error)
    }

    return true
  } catch (error) {
    console.error('Error canceling booking request:', error)
    throw error
  }
}

/**
 * Check if a time slot conflicts with existing approved bookings
 */
export async function checkBookingConflicts(
  tutorId: string,
  startTime: string,
  endTime: string,
  excludeId?: string
): Promise<BookingRequest[]> {
  try {
    const supabase = createClient()

    let query = supabase
      .from('booking_requests')
      .select('*')
      .eq('tutor_id', tutorId)
      .eq('status', 'approved')

    if (excludeId) {
      query = query.neq('id', excludeId)
    }

    const { data, error } = await query

    if (error) {
      throw parseSupabaseError(error)
    }

    // Check for time overlaps
    const conflicts = (data || []).filter((booking) => {
      const bookingStart = new Date(booking.requested_start_time)
      const bookingEnd = new Date(booking.requested_end_time)
      const newStart = new Date(startTime)
      const newEnd = new Date(endTime)

      return (
        (newStart >= bookingStart && newStart < bookingEnd) ||
        (newEnd > bookingStart && newEnd <= bookingEnd) ||
        (newStart <= bookingStart && newEnd >= bookingEnd)
      )
    })

    return conflicts as BookingRequest[]
  } catch (error) {
    console.error('Error checking booking conflicts:', error)
    throw error
  }
}
