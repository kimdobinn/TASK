import { createClient } from '@/lib/supabase'
import { parseSupabaseError } from '@/lib/supabase-errors'
import type { Notification, NotificationType } from '@/types'

/**
 * Create a notification for a user
 * Subtask 11.5: Notification system integration
 */
export async function createNotification(input: {
  user_id: string
  title: string
  message: string
  type: NotificationType
  related_booking_id?: string
}): Promise<Notification | null> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: input.user_id,
        title: input.title,
        message: input.message,
        type: input.type,
        related_booking_id: input.related_booking_id,
        read: false,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating notification:', error)
      // Don't throw - notifications are non-critical
      return null
    }

    return data as Notification
  } catch (error) {
    console.error('Error creating notification:', error)
    // Don't throw - notifications are non-critical
    return null
  }
}

/**
 * Create notification for new booking request (sent to tutor)
 */
export async function notifyTutorOfBookingRequest(
  tutorId: string,
  studentName: string,
  subject: string,
  startTime: string,
  bookingId: string
): Promise<void> {
  try {
    const startDate = new Date(startTime)
    const formattedTime = startDate.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    await createNotification({
      user_id: tutorId,
      title: 'New Booking Request',
      message: `${studentName} has requested a ${subject} tutoring session on ${formattedTime}.`,
      type: 'booking_request',
      related_booking_id: bookingId,
    })
  } catch (error) {
    console.error('Error notifying tutor:', error)
    // Non-critical, don't throw
  }
}

/**
 * Create notification for booking approval (sent to student)
 * Task 18: Status Update Notification Function - Send email on approval
 */
export async function notifyStudentOfApproval(
  studentId: string,
  tutorName: string,
  subject: string,
  startTime: string,
  bookingId: string
): Promise<void> {
  try {
    const startDate = new Date(startTime)
    const formattedTime = startDate.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    // Create in-app notification
    await createNotification({
      user_id: studentId,
      title: 'Booking Approved',
      message: `Your ${subject} tutoring session with ${tutorName} on ${formattedTime} has been approved!`,
      type: 'booking_approved',
      related_booking_id: bookingId,
    })

    // Send email notification via Edge Function
    const supabase = createClient()

    // Get student email
    const { data: studentProfile } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('id', studentId)
      .single()

    if (studentProfile?.email) {
      // Call send-booking-notification Edge Function
      supabase.functions
        .invoke('send-booking-notification', {
          body: {
            type: 'approved',
            bookingId,
            recipientEmail: studentProfile.email,
          },
        })
        .then(({ data, error }) => {
          if (error) {
            console.error('Failed to send approval email:', error)
          } else {
            console.log('✅ Approval email sent successfully:', data)
          }
        })
        .catch(err => console.error('Error invoking email function:', err))
    }
  } catch (error) {
    console.error('Error notifying student:', error)
    // Non-critical, don't throw
  }
}

/**
 * Create notification for booking rejection (sent to student)
 * Task 18: Status Update Notification Function - Send email on rejection
 */
export async function notifyStudentOfRejection(
  studentId: string,
  tutorName: string,
  subject: string,
  startTime: string,
  rejectionNote: string,
  bookingId: string
): Promise<void> {
  try {
    const startDate = new Date(startTime)
    const formattedTime = startDate.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    const message = rejectionNote
      ? `Your ${subject} tutoring session with ${tutorName} on ${formattedTime} was not approved. Reason: ${rejectionNote}`
      : `Your ${subject} tutoring session with ${tutorName} on ${formattedTime} was not approved.`

    // Create in-app notification
    await createNotification({
      user_id: studentId,
      title: 'Booking Not Approved',
      message,
      type: 'booking_rejected',
      related_booking_id: bookingId,
    })

    // Send email notification via Edge Function
    const supabase = createClient()

    // Get student email
    const { data: studentProfile } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('id', studentId)
      .single()

    if (studentProfile?.email) {
      // Call send-booking-notification Edge Function
      supabase.functions
        .invoke('send-booking-notification', {
          body: {
            type: 'rejected',
            bookingId,
            recipientEmail: studentProfile.email,
          },
        })
        .then(({ data, error }) => {
          if (error) {
            console.error('Failed to send rejection email:', error)
          } else {
            console.log('✅ Rejection email sent successfully:', data)
          }
        })
        .catch(err => console.error('Error invoking email function:', err))
    }
  } catch (error) {
    console.error('Error notifying student:', error)
    // Non-critical, don't throw
  }
}

/**
 * Get unread notifications for current user
 */
export async function getUnreadNotifications(): Promise<Notification[]> {
  try {
    const supabase = createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return []
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('read', false)
      .order('created_at', { ascending: false })

    if (error) {
      throw parseSupabaseError(error)
    }

    return (data || []) as Notification[]
  } catch (error) {
    console.error('Error fetching unread notifications:', error)
    return []
  }
}

/**
 * Get all notifications for current user
 */
export async function getAllNotifications(limit: number = 50): Promise<Notification[]> {
  try {
    const supabase = createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return []
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw parseSupabaseError(error)
    }

    return (data || []) as Notification[]
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return []
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    const supabase = createClient()

    const { error } = await supabase
      .from('notifications')
      .update({
        read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', notificationId)

    if (error) {
      throw parseSupabaseError(error)
    }

    return true
  } catch (error) {
    console.error('Error marking notification as read:', error)
    return false
  }
}

/**
 * Mark all notifications as read for current user
 */
export async function markAllNotificationsAsRead(): Promise<boolean> {
  try {
    const supabase = createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return false
    }

    const { error } = await supabase
      .from('notifications')
      .update({
        read: true,
        read_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('read', false)

    if (error) {
      throw parseSupabaseError(error)
    }

    return true
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    return false
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string): Promise<boolean> {
  try {
    const supabase = createClient()

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)

    if (error) {
      throw parseSupabaseError(error)
    }

    return true
  } catch (error) {
    console.error('Error deleting notification:', error)
    return false
  }
}
