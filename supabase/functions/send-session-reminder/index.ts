// Supabase Edge Function for sending session reminder emails
// Task 19: Session Reminder Function - Scheduled reminders 24 hours before sessions
// This function runs on a cron schedule to send reminders to both students and tutors

import { createSupabaseClient } from '../_shared/supabase.ts'
import { handleCors, corsHeaders } from '../_shared/cors.ts'

interface BookingWithProfiles {
  id: string
  student_id: string
  tutor_id: string
  subject: string
  requested_start_time: string
  requested_end_time: string
  duration_minutes: number
  specific_requests: string | null
  student: {
    full_name: string
    email: string
  }
  tutor: {
    full_name: string
    email: string
  }
}

/**
 * Send reminder email to a recipient
 * Task 19, Subtask 3: Dual recipient email sending
 */
async function sendReminderEmail(
  supabase: any,
  booking: BookingWithProfiles,
  recipientType: 'student' | 'tutor',
  recipientEmail: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-booking-notification', {
      body: {
        type: 'reminder',
        bookingId: booking.id,
        recipientEmail,
        recipientType,
      },
    })

    if (error) {
      console.error(`Failed to send reminder to ${recipientType}:`, error)
      return { success: false, error: error.message }
    }

    return { success: true, messageId: data?.messageId }
  } catch (error) {
    console.error(`Error sending reminder to ${recipientType}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Check if reminder was already sent for this booking
 * Task 19, Subtask 4: Deduplication to prevent duplicate reminders
 */
async function wasReminderSent(
  supabase: any,
  bookingId: string,
  recipientEmail: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('email_logs')
      .select('id')
      .eq('booking_id', bookingId)
      .eq('recipient_email', recipientEmail)
      .eq('email_type', 'reminder')
      .eq('status', 'sent')
      .limit(1)

    if (error) {
      console.warn('Error checking for existing reminders:', error)
      return false // If we can't check, allow sending to be safe
    }

    return data && data.length > 0
  } catch (error) {
    console.warn('Error in wasReminderSent check:', error)
    return false
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    console.log('🔔 Session Reminder Function started')

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials')
    }

    const supabase = createSupabaseClient(supabaseUrl, supabaseKey)

    // Task 19, Subtask 2: Query for upcoming sessions (24 hours from now)
    // Calculate time window: 23.5 to 24.5 hours from now to catch sessions
    const now = new Date()
    const reminderWindowStart = new Date(now.getTime() + 23.5 * 60 * 60 * 1000) // 23.5 hours
    const reminderWindowEnd = new Date(now.getTime() + 24.5 * 60 * 60 * 1000) // 24.5 hours

    console.log(`📅 Checking for sessions between:`)
    console.log(`   Start: ${reminderWindowStart.toISOString()}`)
    console.log(`   End: ${reminderWindowEnd.toISOString()}`)

    // Query for approved bookings in the reminder window
    const { data: upcomingSessions, error: queryError } = await supabase
      .from('booking_requests')
      .select(`
        *,
        student:user_profiles!booking_requests_student_id_fkey(full_name, email),
        tutor:user_profiles!booking_requests_tutor_id_fkey(full_name, email)
      `)
      .eq('status', 'approved')
      .gte('requested_start_time', reminderWindowStart.toISOString())
      .lte('requested_start_time', reminderWindowEnd.toISOString())

    if (queryError) {
      console.error('Error querying upcoming sessions:', queryError)
      throw queryError
    }

    if (!upcomingSessions || upcomingSessions.length === 0) {
      console.log('✅ No upcoming sessions found in reminder window')
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No sessions to remind about',
          remindersCount: 0,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log(`📧 Found ${upcomingSessions.length} session(s) to send reminders for`)

    // Send reminders for each session
    const results = {
      total: upcomingSessions.length,
      sent: 0,
      skipped: 0,
      failed: 0,
      details: [] as any[],
    }

    for (const booking of upcomingSessions as BookingWithProfiles[]) {
      console.log(`\n📖 Processing booking ${booking.id}:`)
      console.log(`   Subject: ${booking.subject}`)
      console.log(`   Start: ${booking.requested_start_time}`)
      console.log(`   Student: ${booking.student.full_name}`)
      console.log(`   Tutor: ${booking.tutor.full_name}`)

      const sessionResult = {
        bookingId: booking.id,
        subject: booking.subject,
        startTime: booking.requested_start_time,
        student: {
          sent: false,
          skipped: false,
          error: null as string | null,
        },
        tutor: {
          sent: false,
          skipped: false,
          error: null as string | null,
        },
      }

      // Send reminder to student
      if (booking.student.email) {
        const alreadySent = await wasReminderSent(supabase, booking.id, booking.student.email)

        if (alreadySent) {
          console.log(`   ⏭️  Student reminder already sent, skipping`)
          sessionResult.student.skipped = true
          results.skipped++
        } else {
          console.log(`   📤 Sending reminder to student: ${booking.student.email}`)
          const studentResult = await sendReminderEmail(
            supabase,
            booking,
            'student',
            booking.student.email
          )

          if (studentResult.success) {
            console.log(`   ✅ Student reminder sent: ${studentResult.messageId}`)
            sessionResult.student.sent = true
            results.sent++
          } else {
            console.error(`   ❌ Student reminder failed: ${studentResult.error}`)
            sessionResult.student.error = studentResult.error || 'Unknown error'
            results.failed++
          }
        }
      } else {
        console.warn(`   ⚠️  Student has no email address`)
        sessionResult.student.skipped = true
        results.skipped++
      }

      // Send reminder to tutor
      if (booking.tutor.email) {
        const alreadySent = await wasReminderSent(supabase, booking.id, booking.tutor.email)

        if (alreadySent) {
          console.log(`   ⏭️  Tutor reminder already sent, skipping`)
          sessionResult.tutor.skipped = true
          results.skipped++
        } else {
          console.log(`   📤 Sending reminder to tutor: ${booking.tutor.email}`)
          const tutorResult = await sendReminderEmail(
            supabase,
            booking,
            'tutor',
            booking.tutor.email
          )

          if (tutorResult.success) {
            console.log(`   ✅ Tutor reminder sent: ${tutorResult.messageId}`)
            sessionResult.tutor.sent = true
            results.sent++
          } else {
            console.error(`   ❌ Tutor reminder failed: ${tutorResult.error}`)
            sessionResult.tutor.error = tutorResult.error || 'Unknown error'
            results.failed++
          }
        }
      } else {
        console.warn(`   ⚠️  Tutor has no email address`)
        sessionResult.tutor.skipped = true
        results.skipped++
      }

      results.details.push(sessionResult)
    }

    console.log(`\n📊 Summary:`)
    console.log(`   Total sessions: ${results.total}`)
    console.log(`   Reminders sent: ${results.sent}`)
    console.log(`   Skipped (already sent): ${results.skipped}`)
    console.log(`   Failed: ${results.failed}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.total} session(s)`,
        summary: {
          totalSessions: results.total,
          remindersSent: results.sent,
          remindersSkipped: results.skipped,
          remindersFailed: results.failed,
        },
        details: results.details,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('❌ Error in send-session-reminder function:', error)

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
 * Usage:
 *
 * 1. Manual invocation (testing):
 *    curl -X POST http://127.0.0.1:54321/functions/v1/send-session-reminder
 *
 * 2. Scheduled via cron (in supabase/functions/send-session-reminder/cron.yml):
 *    schedule: "0 10 * * *"  # Daily at 10:00 AM UTC
 *
 * 3. View logs:
 *    supabase functions logs send-session-reminder
 *
 * The function will:
 * - Query for approved sessions 24 hours from now
 * - Send reminder emails to both student and tutor
 * - Skip if reminder was already sent (deduplication)
 * - Log all attempts to email_logs table
 */
