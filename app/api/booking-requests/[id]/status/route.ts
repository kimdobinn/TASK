import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { updateBookingRequestStatus } from '@/lib/booking-requests'
import type { BookingStatus } from '@/types'

/**
 * PATCH /api/booking-requests/[id]/status
 * Update the status of a booking request (tutor only)
 * Task 14, Subtask 1: API endpoint for booking status updates
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - You must be logged in' },
        { status: 401 }
      )
    }

    // Get user profile to verify role
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Only tutors can update booking status
    if (profile.role !== 'tutor') {
      return NextResponse.json(
        { error: 'Forbidden - Only tutors can update booking status' },
        { status: 403 }
      )
    }

    // Get booking request to verify ownership
    const { data: booking, error: bookingError } = await supabase
      .from('booking_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking request not found' },
        { status: 404 }
      )
    }

    // Verify the booking belongs to this tutor
    if (booking.tutor_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden - You can only update your own booking requests' },
        { status: 403 }
      )
    }

    // Verify booking is still pending
    if (booking.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot update booking - status is already ${booking.status}` },
        { status: 400 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { status, rejection_note } = body

    // Validate status
    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status - must be "approved" or "rejected"' },
        { status: 400 }
      )
    }

    // Validate rejection note is provided when rejecting
    if (status === 'rejected' && rejection_note && rejection_note.length > 500) {
      return NextResponse.json(
        { error: 'Rejection note is too long - maximum 500 characters' },
        { status: 400 }
      )
    }

    // For approve action, check for time conflicts
    if (status === 'approved') {
      const { data: conflicts } = await supabase
        .from('booking_requests')
        .select('*')
        .eq('tutor_id', user.id)
        .eq('status', 'approved')
        .neq('id', id)

      if (conflicts && conflicts.length > 0) {
        // Check for overlapping times
        const hasConflict = conflicts.some((existingBooking) => {
          const existingStart = new Date(existingBooking.requested_start_time)
          const existingEnd = new Date(existingBooking.requested_end_time)
          const newStart = new Date(booking.requested_start_time)
          const newEnd = new Date(booking.requested_end_time)

          return (
            (newStart >= existingStart && newStart < existingEnd) ||
            (newEnd > existingStart && newEnd <= existingEnd) ||
            (newStart <= existingStart && newEnd >= existingEnd)
          )
        })

        if (hasConflict) {
          return NextResponse.json(
            { error: 'Cannot approve - this time slot conflicts with another approved booking' },
            { status: 409 }
          )
        }
      }
    }

    // Update the booking status with notifications
    const updatedBooking = await updateBookingRequestStatus(
      id,
      status as BookingStatus,
      rejection_note
    )

    return NextResponse.json(
      {
        success: true,
        booking: updatedBooking,
        message: `Booking request ${status} successfully`,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error updating booking status:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update booking status' },
      { status: 500 }
    )
  }
}
