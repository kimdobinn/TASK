/**
 * Custom hook for Supabase real-time booking subscriptions
 * Task 21, Subtask 1: Supabase Real-time Subscription Setup
 */

'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import type { BookingRequest } from '@/types'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error'

interface UseRealtimeBookingsOptions {
  /**
   * User role determines which events to subscribe to
   * - student: subscribes to status updates on their bookings
   * - tutor: subscribes to new booking requests assigned to them
   */
  userRole: 'student' | 'tutor'

  /**
   * Current user ID to filter relevant events
   */
  userId: string

  /**
   * Callback when a booking is inserted (new booking request)
   * Only fires for tutors
   */
  onInsert?: (booking: BookingRequest) => void

  /**
   * Callback when a booking is updated (status change, etc.)
   */
  onUpdate?: (booking: BookingRequest) => void

  /**
   * Callback when a booking is deleted
   */
  onDelete?: (bookingId: string) => void

  /**
   * Callback when connection state changes
   */
  onConnectionStateChange?: (state: ConnectionState) => void

  /**
   * Enable debug logging
   */
  debug?: boolean
}

/**
 * Hook to subscribe to real-time booking updates
 *
 * @example
 * // Student dashboard
 * const { connectionState, error } = useRealtimeBookings({
 *   userRole: 'student',
 *   userId: user.id,
 *   onUpdate: (booking) => {
 *     // Refresh booking list when status changes
 *     refreshBookings()
 *   }
 * })
 *
 * @example
 * // Tutor dashboard
 * const { connectionState } = useRealtimeBookings({
 *   userRole: 'tutor',
 *   userId: user.id,
 *   onInsert: (booking) => {
 *     // Show notification for new booking request
 *     toast.success('New booking request received!')
 *     refreshRequests()
 *   },
 *   onUpdate: (booking) => {
 *     // Refresh when booking is updated
 *     refreshRequests()
 *   }
 * })
 */
export function useRealtimeBookings(options: UseRealtimeBookingsOptions) {
  const {
    userRole,
    userId,
    onInsert,
    onUpdate,
    onDelete,
    onConnectionStateChange,
    debug = false
  } = options

  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting')
  const [error, setError] = useState<Error | null>(null)

  // Use ref to avoid recreating channel on every render
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabaseRef = useRef(createClient())

  // Update connection state and notify callback
  const updateConnectionState = useCallback((state: ConnectionState) => {
    setConnectionState(state)
    onConnectionStateChange?.(state)
    if (debug) {
      console.log(`[useRealtimeBookings] Connection state: ${state}`)
    }
  }, [onConnectionStateChange, debug])

  // Handle INSERT events (new bookings)
  const handleInsert = useCallback((payload: RealtimePostgresChangesPayload<BookingRequest>) => {
    if (debug) {
      console.log('[useRealtimeBookings] INSERT event:', payload)
    }

    const newBooking = payload.new as BookingRequest

    // Only notify tutors about new bookings assigned to them
    if (userRole === 'tutor' && newBooking.tutor_id === userId) {
      onInsert?.(newBooking)
    }
  }, [userRole, userId, onInsert, debug])

  // Handle UPDATE events (status changes, etc.)
  const handleUpdate = useCallback((payload: RealtimePostgresChangesPayload<BookingRequest>) => {
    if (debug) {
      console.log('[useRealtimeBookings] UPDATE event:', payload)
    }

    const updatedBooking = payload.new as BookingRequest
    const oldBooking = payload.old as Partial<BookingRequest>

    // Students: notify about their booking updates
    if (userRole === 'student' && updatedBooking.student_id === userId) {
      onUpdate?.(updatedBooking)
    }

    // Tutors: notify about updates to their bookings
    if (userRole === 'tutor' && updatedBooking.tutor_id === userId) {
      onUpdate?.(updatedBooking)
    }
  }, [userRole, userId, onUpdate, debug])

  // Handle DELETE events
  const handleDelete = useCallback((payload: RealtimePostgresChangesPayload<BookingRequest>) => {
    if (debug) {
      console.log('[useRealtimeBookings] DELETE event:', payload)
    }

    const deletedBooking = payload.old as BookingRequest

    // Notify if the deleted booking belonged to this user
    if (
      (userRole === 'student' && deletedBooking.student_id === userId) ||
      (userRole === 'tutor' && deletedBooking.tutor_id === userId)
    ) {
      onDelete?.(deletedBooking.id)
    }
  }, [userRole, userId, onDelete, debug])

  useEffect(() => {
    // Don't subscribe if userId is not provided
    if (!userId) {
      if (debug) {
        console.warn('[useRealtimeBookings] No userId provided, skipping subscription')
      }
      return
    }

    updateConnectionState('connecting')

    try {
      const supabase = supabaseRef.current

      // Create a unique channel name based on user role and ID
      const channelName = `booking-updates:${userRole}:${userId}`

      if (debug) {
        console.log(`[useRealtimeBookings] Subscribing to channel: ${channelName}`)
      }

      // Create channel with postgres changes configuration
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'booking_requests',
            // Filter: only for bookings where this user is the tutor (for tutors)
            filter: userRole === 'tutor' ? `tutor_id=eq.${userId}` : undefined
          },
          handleInsert
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'booking_requests',
            // Filter: bookings where this user is student or tutor
            filter: userRole === 'student'
              ? `student_id=eq.${userId}`
              : `tutor_id=eq.${userId}`
          },
          handleUpdate
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'booking_requests',
            // Filter: bookings where this user is student or tutor
            filter: userRole === 'student'
              ? `student_id=eq.${userId}`
              : `tutor_id=eq.${userId}`
          },
          handleDelete
        )
        .subscribe((status, err) => {
          if (debug) {
            console.log(`[useRealtimeBookings] Subscription status: ${status}`, err)
          }

          if (status === 'SUBSCRIBED') {
            updateConnectionState('connected')
            setError(null)
          } else if (status === 'CHANNEL_ERROR') {
            updateConnectionState('error')
            setError(err || new Error('Channel error'))
          } else if (status === 'TIMED_OUT') {
            updateConnectionState('error')
            setError(new Error('Connection timed out'))
          } else if (status === 'CLOSED') {
            updateConnectionState('disconnected')
          }
        })

      // Store channel ref for cleanup
      channelRef.current = channel

    } catch (err) {
      console.error('[useRealtimeBookings] Setup error:', err)
      updateConnectionState('error')
      setError(err instanceof Error ? err : new Error('Unknown error'))
    }

    // Cleanup function
    return () => {
      if (debug) {
        console.log('[useRealtimeBookings] Cleaning up subscription')
      }

      if (channelRef.current) {
        supabaseRef.current.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [
    userId,
    userRole,
    handleInsert,
    handleUpdate,
    handleDelete,
    updateConnectionState,
    debug
  ])

  return {
    connectionState,
    error,
    isConnected: connectionState === 'connected',
    isConnecting: connectionState === 'connecting',
    isDisconnected: connectionState === 'disconnected',
    hasError: connectionState === 'error'
  }
}
