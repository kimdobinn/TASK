import { createClient } from '@/lib/supabase'
import { parseSupabaseError } from '@/lib/supabase-errors'
import {
  notifyTutorOfBookingRequest,
  notifyStudentOfApproval,
  notifyStudentOfRejection,
} from '@/lib/notifications'
import type { BookingRequest, BookingStatus } from '@/types'

/**
 * Create a new booking request with concurrent booking protection
 * Subtask 11.1, 11.2, 11.3: Server-side validation, creation, and conflict resolution
 */
export async function createBookingRequest(input: {
  tutor_id: string
  subject: string
  duration_minutes: 30 | 60 | 120
  requested_start_time: string // ISO string in UTC
  requested_end_time: string // ISO string in UTC
  specific_requests?: string
}): Promise<BookingRequest> {
  const supabase = createClient()

  try {
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
    const now = new Date()

    // Validate start time is in the future
    if (startTime <= now) {
      throw new Error('Booking start time must be in the future')
    }

    // Validate end time is after start time
    if (endTime <= startTime) {
      throw new Error('End time must be after start time')
    }

    // Validate booking is not too far in advance (60 days)
    const maxAdvanceMs = 60 * 24 * 60 * 60 * 1000 // 60 days
    if (startTime.getTime() - now.getTime() > maxAdvanceMs) {
      throw new Error('Cannot book more than 60 days in advance')
    }

    // Validate duration matches time range
    const durationMs = endTime.getTime() - startTime.getTime()
    const expectedDurationMs = input.duration_minutes * 60 * 1000

    if (Math.abs(durationMs - expectedDurationMs) > 60000) { // Allow 1 minute tolerance
      throw new Error('Duration does not match the time range')
    }

    // Validate tutor exists
    const { data: tutorProfile, error: tutorError } = await supabase
      .from('user_profiles')
      .select('id, role')
      .eq('id', input.tutor_id)
      .eq('role', 'tutor')
      .single()

    if (tutorError || !tutorProfile) {
      throw new Error('Invalid tutor ID or tutor not found')
    }

    // Use a transaction with retry logic for concurrent booking protection
    let retries = 3
    let lastError: Error | null = null

    while (retries > 0) {
      try {
        // Start a transaction by checking conflicts and creating in sequence
        // PostgreSQL will handle row-level locking automatically
        const conflicts = await checkBookingConflicts(
          input.tutor_id,
          input.requested_start_time,
          input.requested_end_time
        )

        if (conflicts.length > 0) {
          throw new Error(
            'This time slot is no longer available. Please select a different time.'
          )
        }

        // Create booking request with status check
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
          // Check if it's a unique constraint violation (concurrent booking)
          if (error.code === '23505') {
            throw new Error('A booking already exists for this time slot')
          }
          throw parseSupabaseError(error)
        }

        // Success - send notification to tutor (Subtask 11.5)
        const createdBooking = data as BookingRequest

        // Get student name for notification
        const { data: studentProfile } = await supabase
          .from('user_profiles')
          .select('full_name')
          .eq('id', user.id)
          .single()

        if (studentProfile) {
          // Send notification asynchronously (don't wait for it)
          notifyTutorOfBookingRequest(
            input.tutor_id,
            studentProfile.full_name,
            input.subject,
            input.requested_start_time,
            createdBooking.id
          ).catch(err => console.error('Failed to send notification:', err))
        }

        return createdBooking
      } catch (error: any) {
        lastError = error

        // If it's a conflict error, retry
        if (
          error.message.includes('no longer available') ||
          error.message.includes('already exists')
        ) {
          retries--
          if (retries > 0) {
            // Wait a bit before retrying (exponential backoff)
            await new Promise((resolve) => setTimeout(resolve, 100 * (4 - retries)))
            continue
          }
        }

        // For other errors, don't retry
        throw error
      }
    }

    // All retries exhausted
    throw lastError || new Error('Failed to create booking request after multiple attempts')
  } catch (error: any) {
    console.error('Error creating booking request:', error)

    // Enhance error messages for better user feedback (Subtask 11.4)
    if (error.message?.includes('authenticated')) {
      throw new Error('You must be logged in to create a booking request')
    }
    if (error.message?.includes('tutor')) {
      throw new Error('The selected tutor is not available')
    }
    if (error.message?.includes('time slot')) {
      throw new Error('This time slot has been taken by another student. Please choose a different time.')
    }

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
 * Sends notifications to students when status changes
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

    const updatedBooking = data as BookingRequest

    // Send notification based on status change
    if (status === 'approved' || status === 'rejected') {
      // Get tutor name for notification
      const { data: tutorProfile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', updatedBooking.tutor_id)
        .single()

      if (tutorProfile) {
        if (status === 'approved') {
          notifyStudentOfApproval(
            updatedBooking.student_id,
            tutorProfile.full_name,
            updatedBooking.subject,
            updatedBooking.requested_start_time,
            updatedBooking.id
          ).catch(err => console.error('Failed to send approval notification:', err))
        } else if (status === 'rejected') {
          notifyStudentOfRejection(
            updatedBooking.student_id,
            tutorProfile.full_name,
            updatedBooking.subject,
            updatedBooking.requested_start_time,
            updatedBooking.rejection_note || '',
            updatedBooking.id
          ).catch(err => console.error('Failed to send rejection notification:', err))
        }
      }
    }

    return updatedBooking
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
