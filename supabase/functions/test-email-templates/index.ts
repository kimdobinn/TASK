// Test/Preview Edge Function for Email Templates
// Task 16: Email Template System - Testing and Preview Tool

import { handleCors, corsHeaders } from '../_shared/cors.ts'
import {
  newBookingRequestTemplate,
  bookingApprovedTemplate,
  bookingRejectedTemplate,
  sessionReminderTemplate,
  type BookingEmailData,
} from '../_shared/email-templates.ts'

// Sample test data for previewing templates
const sampleBookingData: BookingEmailData = {
  tutorName: 'Dr. Sarah Johnson',
  studentName: 'Alex Chen',
  subject: 'mathematics',
  startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
  endTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(), // Tomorrow + 1 hour
  duration: 60,
  specificRequests: 'Please focus on calculus and derivatives. I have an exam next week.',
  rejectionNote: 'Sorry, I have a conflicting appointment at this time. Please try booking for next week.',
}

interface RequestBody {
  templateType?: 'new_request' | 'approved' | 'rejected' | 'reminder'
  recipientType?: 'student' | 'tutor'
  customData?: Partial<BookingEmailData>
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    // Parse request body (optional)
    let body: RequestBody = {}
    try {
      body = await req.json()
    } catch {
      // Use default values if no body provided
    }

    const {
      templateType = 'new_request',
      recipientType = 'student',
      customData,
    } = body

    // Merge custom data with sample data
    const data: BookingEmailData = {
      ...sampleBookingData,
      ...customData,
    }

    // Generate templates
    const templates = {
      new_request: newBookingRequestTemplate(data),
      approved: bookingApprovedTemplate(data),
      rejected: bookingRejectedTemplate(data),
      reminder_student: sessionReminderTemplate(data, 'student'),
      reminder_tutor: sessionReminderTemplate(data, 'tutor'),
    }

    // If specific template requested, return just that one
    if (req.url.includes('/preview')) {
      let selectedTemplate
      if (templateType === 'reminder') {
        selectedTemplate = recipientType === 'tutor'
          ? templates.reminder_tutor
          : templates.reminder_student
      } else {
        selectedTemplate = templates[templateType]
      }

      // Return HTML for browser preview
      return new Response(selectedTemplate.html, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html',
        },
      })
    }

    // Return all templates as JSON
    const response = {
      message: 'Email templates generated successfully',
      sampleData: data,
      templates: {
        new_request: {
          description: 'Sent to tutor when a student creates a new booking request',
          subject: templates.new_request.subject,
          htmlPreview: templates.new_request.html.substring(0, 500) + '...',
          textPreview: templates.new_request.text.substring(0, 200) + '...',
          fullHtml: templates.new_request.html,
          fullText: templates.new_request.text,
        },
        approved: {
          description: 'Sent to student when tutor approves their booking request',
          subject: templates.approved.subject,
          htmlPreview: templates.approved.html.substring(0, 500) + '...',
          textPreview: templates.approved.text.substring(0, 200) + '...',
          fullHtml: templates.approved.html,
          fullText: templates.approved.text,
        },
        rejected: {
          description: 'Sent to student when tutor rejects their booking request',
          subject: templates.rejected.subject,
          htmlPreview: templates.rejected.html.substring(0, 500) + '...',
          textPreview: templates.rejected.text.substring(0, 200) + '...',
          fullHtml: templates.rejected.html,
          fullText: templates.rejected.text,
        },
        reminder_student: {
          description: 'Sent to student 24 hours before their session',
          subject: templates.reminder_student.subject,
          htmlPreview: templates.reminder_student.html.substring(0, 500) + '...',
          textPreview: templates.reminder_student.text.substring(0, 200) + '...',
          fullHtml: templates.reminder_student.html,
          fullText: templates.reminder_student.text,
        },
        reminder_tutor: {
          description: 'Sent to tutor 24 hours before their session',
          subject: templates.reminder_tutor.subject,
          htmlPreview: templates.reminder_tutor.html.substring(0, 500) + '...',
          textPreview: templates.reminder_tutor.text.substring(0, 200) + '...',
          fullHtml: templates.reminder_tutor.html,
          fullText: templates.reminder_tutor.text,
        },
      },
      usage: {
        previewInBrowser: 'Add /preview?templateType=approved to URL to view HTML in browser',
        availableTypes: ['new_request', 'approved', 'rejected', 'reminder'],
        recipientTypes: ['student', 'tutor'],
        customization: 'Send POST request with customData to override sample values',
      },
    }

    return new Response(JSON.stringify(response, null, 2), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('Error in test-email-templates:', error)

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )
  }
})

/*
Usage Examples:

1. View all templates as JSON:
   curl http://127.0.0.1:54321/functions/v1/test-email-templates

2. Preview a specific template in browser:
   http://127.0.0.1:54321/functions/v1/test-email-templates/preview?templateType=approved

3. Test with custom data:
   curl -X POST http://127.0.0.1:54321/functions/v1/test-email-templates \
     -H "Content-Type: application/json" \
     -d '{
       "templateType": "new_request",
       "customData": {
         "tutorName": "Custom Tutor",
         "studentName": "Custom Student"
       }
     }'

4. Preview reminder for tutor:
   http://127.0.0.1:54321/functions/v1/test-email-templates/preview?templateType=reminder&recipientType=tutor
*/
