// Supabase Edge Function for sending booking notification emails
// Task 17: New Booking Notification Function - Email sending implementation

import { createSupabaseClient } from '../_shared/supabase.ts'
import { handleCors, corsHeaders } from '../_shared/cors.ts'
import {
  newBookingRequestTemplate,
  bookingApprovedTemplate,
  bookingRejectedTemplate,
  sessionReminderTemplate,
  type BookingEmailData,
} from '../_shared/email-templates.ts'

interface RequestBody {
  type: 'new_request' | 'approved' | 'rejected' | 'reminder'
  bookingId: string
  recipientEmail: string
  recipientType?: 'student' | 'tutor' // For reminder emails
}

/**
 * Send email using Resend API
 * Task 17, Subtask 3: Email sending integration
 */
async function sendEmail(params: {
  to: string
  subject: string
  html: string
  text: string
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY')

  // If no API key configured, log and return success (for development)
  if (!resendApiKey) {
    console.log('⚠️  RESEND_API_KEY not configured. Email would be sent to:', params.to)
    console.log('Subject:', params.subject)
    console.log('Preview:', params.text.substring(0, 200))

    return {
      success: true,
      messageId: 'dev-mode-' + Date.now(),
      error: undefined,
    }
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: Deno.env.get('EMAIL_FROM') || 'Tutoring Platform <noreply@yourdomain.com>',
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Failed to send email')
    }

    return {
      success: true,
      messageId: data.id,
    }
  } catch (error) {
    console.error('Email sending error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    // Parse request body
    const { type, bookingId, recipientEmail, recipientType }: RequestBody =
      await req.json()

    // Validate required fields
    if (!type || !bookingId || !recipientEmail) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: type, bookingId, recipientEmail',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Initialize Supabase client (Task 17, Subtask 1: Database integration)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials')
    }

    const supabase = createSupabaseClient(supabaseUrl, supabaseKey)

    // Fetch booking details from database (Task 17, Subtask 2: Data extraction)
    const { data: booking, error: bookingError } = await supabase
      .from('booking_requests')
      .select(`
        *,
        student:user_profiles!booking_requests_student_id_fkey(full_name),
        tutor:user_profiles!booking_requests_tutor_id_fkey(full_name)
      `)
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      console.error('Booking not found:', bookingError)
      return new Response(
        JSON.stringify({ error: 'Booking not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Prepare email data (Task 17, Subtask 2: Data formatting)
    const emailData: BookingEmailData = {
      tutorName: booking.tutor.full_name,
      studentName: booking.student.full_name,
      subject: booking.subject,
      startTime: booking.requested_start_time,
      endTime: booking.requested_end_time,
      duration: booking.duration_minutes,
      specificRequests: booking.specific_requests,
      rejectionNote: booking.rejection_note,
    }

    // Generate email content based on type (Task 17, Subtask 3: Email composition)
    let emailContent: { subject: string; html: string; text: string }

    switch (type) {
      case 'new_request':
        emailContent = newBookingRequestTemplate(emailData)
        break
      case 'approved':
        emailContent = bookingApprovedTemplate(emailData)
        break
      case 'rejected':
        emailContent = bookingRejectedTemplate(emailData)
        break
      case 'reminder':
        if (!recipientType) {
          return new Response(
            JSON.stringify({
              error: 'recipientType is required for reminder emails',
            }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          )
        }
        emailContent = sessionReminderTemplate(emailData, recipientType)
        break
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid notification type' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
    }

    // Send email (Task 17, Subtask 3: Email sending)
    console.log(`📧 Sending ${type} email to ${recipientEmail}`)
    const emailResult = await sendEmail({
      to: recipientEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    })

    // Log the attempt (Task 17, Subtask 4: Logging)
    if (emailResult.success) {
      console.log('✅ Email sent successfully:', emailResult.messageId)

      // Optionally log to database for tracking
      try {
        await supabase.from('email_logs').insert({
          booking_id: bookingId,
          recipient_email: recipientEmail,
          email_type: type,
          message_id: emailResult.messageId,
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
      } catch (logError) {
        console.warn('Failed to log email send:', logError)
        // Don't fail the request if logging fails
      }
    } else {
      console.error('❌ Email sending failed:', emailResult.error)

      // Log failure to database
      try {
        await supabase.from('email_logs').insert({
          booking_id: bookingId,
          recipient_email: recipientEmail,
          email_type: type,
          status: 'failed',
          error_message: emailResult.error,
          sent_at: new Date().toISOString(),
        })
      } catch (logError) {
        console.warn('Failed to log email failure:', logError)
      }
    }

    // Return response (Task 17, Subtask 4: Error handling)
    const response = {
      success: emailResult.success,
      message: emailResult.success
        ? 'Email sent successfully'
        : 'Email sending failed',
      messageId: emailResult.messageId,
      error: emailResult.error,
      booking: {
        id: bookingId,
        type,
        recipient: recipientEmail,
      },
    }

    return new Response(JSON.stringify(response), {
      status: emailResult.success ? 200 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    // Task 17, Subtask 4: Error handling
    console.error('❌ Error in send-booking-notification function:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

/*
 * Usage Examples:
 *
 * 1. Send new booking request notification:
 *    curl -X POST http://127.0.0.1:54321/functions/v1/send-booking-notification \
 *      -H "Content-Type: application/json" \
 *      -d '{
 *        "type": "new_request",
 *        "bookingId": "123e4567-e89b-12d3-a456-426614174000",
 *        "recipientEmail": "tutor@example.com"
 *      }'
 *
 * 2. Send approval notification:
 *    curl -X POST http://127.0.0.1:54321/functions/v1/send-booking-notification \
 *      -H "Content-Type: application/json" \
 *      -d '{
 *        "type": "approved",
 *        "bookingId": "123e4567-e89b-12d3-a456-426614174000",
 *        "recipientEmail": "student@example.com"
 *      }'
 *
 * 3. Send rejection notification:
 *    curl -X POST http://127.0.0.1:54321/functions/v1/send-booking-notification \
 *      -H "Content-Type: application/json" \
 *      -d '{
 *        "type": "rejected",
 *        "bookingId": "123e4567-e89b-12d3-a456-426614174000",
 *        "recipientEmail": "student@example.com"
 *      }'
 */
