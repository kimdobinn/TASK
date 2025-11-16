// Email template system for booking notifications
// Task 15, Subtask 3: Email template system

export interface BookingEmailData {
  tutorName: string
  studentName: string
  subject: string
  startTime: string
  endTime: string
  duration: number
  specificRequests?: string
  rejectionNote?: string
}

/**
 * Template for new booking request notification (sent to tutor)
 */
export function newBookingRequestTemplate(data: BookingEmailData): {
  subject: string
  html: string
  text: string
} {
  const formattedDate = new Date(data.startTime).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const formattedTime = new Date(data.startTime).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return {
    subject: `New Booking Request from ${data.studentName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9fafb; padding: 30px; }
          .details { background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
          .detail-row { margin: 10px 0; }
          .label { font-weight: bold; color: #6B7280; }
          .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
          .footer { text-align: center; padding: 20px; color: #6B7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Booking Request</h1>
          </div>
          <div class="content">
            <p>Hi ${data.tutorName},</p>
            <p>You have received a new booking request from <strong>${data.studentName}</strong>.</p>

            <div class="details">
              <div class="detail-row">
                <span class="label">Subject:</span> ${data.subject.replace('_', ' ')}
              </div>
              <div class="detail-row">
                <span class="label">Date:</span> ${formattedDate}
              </div>
              <div class="detail-row">
                <span class="label">Time:</span> ${formattedTime}
              </div>
              <div class="detail-row">
                <span class="label">Duration:</span> ${data.duration} minutes
              </div>
              ${data.specificRequests ? `
              <div class="detail-row">
                <span class="label">Special Requests:</span><br/>
                <p style="margin: 10px 0; padding: 10px; background-color: #f3f4f6; border-radius: 4px;">
                  ${data.specificRequests}
                </p>
              </div>
              ` : ''}
            </div>

            <p style="text-align: center; margin: 30px 0;">
              <a href="${Deno.env.get('NEXT_PUBLIC_APP_URL')}/dashboard/tutor/requests" class="button">
                View Booking Request
              </a>
            </p>

            <p style="color: #6B7280; font-size: 14px;">
              Please review and respond to this request as soon as possible.
            </p>
          </div>
          <div class="footer">
            <p>This is an automated email from your tutoring platform.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
New Booking Request from ${data.studentName}

Hi ${data.tutorName},

You have received a new booking request.

Details:
- Subject: ${data.subject.replace('_', ' ')}
- Date: ${formattedDate}
- Time: ${formattedTime}
- Duration: ${data.duration} minutes
${data.specificRequests ? `- Special Requests: ${data.specificRequests}` : ''}

Please log in to review and respond to this request.

Visit: ${Deno.env.get('NEXT_PUBLIC_APP_URL')}/dashboard/tutor/requests
    `.trim(),
  }
}

/**
 * Template for booking approval notification (sent to student)
 */
export function bookingApprovedTemplate(data: BookingEmailData): {
  subject: string
  html: string
  text: string
} {
  const formattedDate = new Date(data.startTime).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const formattedTime = new Date(data.startTime).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return {
    subject: `Booking Approved - ${data.subject} Session with ${data.tutorName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #10B981; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9fafb; padding: 30px; }
          .details { background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
          .detail-row { margin: 10px 0; }
          .label { font-weight: bold; color: #6B7280; }
          .success-icon { font-size: 48px; text-align: center; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 24px; background-color: #10B981; color: white; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
          .footer { text-align: center; padding: 20px; color: #6B7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✓ Booking Approved!</h1>
          </div>
          <div class="content">
            <div class="success-icon">🎉</div>
            <p>Hi ${data.studentName},</p>
            <p>Great news! Your booking request has been approved by <strong>${data.tutorName}</strong>.</p>

            <div class="details">
              <div class="detail-row">
                <span class="label">Subject:</span> ${data.subject.replace('_', ' ')}
              </div>
              <div class="detail-row">
                <span class="label">Date:</span> ${formattedDate}
              </div>
              <div class="detail-row">
                <span class="label">Time:</span> ${formattedTime}
              </div>
              <div class="detail-row">
                <span class="label">Duration:</span> ${data.duration} minutes
              </div>
            </div>

            <p style="text-align: center; margin: 30px 0;">
              <a href="${Deno.env.get('NEXT_PUBLIC_APP_URL')}/dashboard/student" class="button">
                View Your Schedule
              </a>
            </p>

            <p style="color: #6B7280; font-size: 14px;">
              We'll send you a reminder before your session begins.
            </p>
          </div>
          <div class="footer">
            <p>This is an automated email from your tutoring platform.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Booking Approved!

Hi ${data.studentName},

Great news! Your booking request has been approved by ${data.tutorName}.

Session Details:
- Subject: ${data.subject.replace('_', ' ')}
- Date: ${formattedDate}
- Time: ${formattedTime}
- Duration: ${data.duration} minutes

We'll send you a reminder before your session begins.

Visit: ${Deno.env.get('NEXT_PUBLIC_APP_URL')}/dashboard/student
    `.trim(),
  }
}

/**
 * Template for booking rejection notification (sent to student)
 */
export function bookingRejectedTemplate(data: BookingEmailData): {
  subject: string
  html: string
  text: string
} {
  const formattedDate = new Date(data.startTime).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const formattedTime = new Date(data.startTime).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return {
    subject: `Booking Update - ${data.subject} Session`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #EF4444; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9fafb; padding: 30px; }
          .details { background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
          .detail-row { margin: 10px 0; }
          .label { font-weight: bold; color: #6B7280; }
          .note { background-color: #FEF2F2; padding: 15px; border-left: 4px solid #EF4444; margin: 20px 0; border-radius: 4px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
          .footer { text-align: center; padding: 20px; color: #6B7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Booking Update</h1>
          </div>
          <div class="content">
            <p>Hi ${data.studentName},</p>
            <p>Unfortunately, ${data.tutorName} was unable to approve your booking request for the following session:</p>

            <div class="details">
              <div class="detail-row">
                <span class="label">Subject:</span> ${data.subject.replace('_', ' ')}
              </div>
              <div class="detail-row">
                <span class="label">Date:</span> ${formattedDate}
              </div>
              <div class="detail-row">
                <span class="label">Time:</span> ${formattedTime}
              </div>
              <div class="detail-row">
                <span class="label">Duration:</span> ${data.duration} minutes
              </div>
            </div>

            ${data.rejectionNote ? `
            <div class="note">
              <strong>Note from ${data.tutorName}:</strong><br/>
              <p style="margin: 10px 0 0 0;">${data.rejectionNote}</p>
            </div>
            ` : ''}

            <p>Don't worry! You can book another session with ${data.tutorName} or choose a different time slot.</p>

            <p style="text-align: center; margin: 30px 0;">
              <a href="${Deno.env.get('NEXT_PUBLIC_APP_URL')}/dashboard/student/book-session" class="button">
                Book Another Session
              </a>
            </p>
          </div>
          <div class="footer">
            <p>This is an automated email from your tutoring platform.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Booking Update

Hi ${data.studentName},

Unfortunately, ${data.tutorName} was unable to approve your booking request for the following session:

- Subject: ${data.subject.replace('_', ' ')}
- Date: ${formattedDate}
- Time: ${formattedTime}
- Duration: ${data.duration} minutes

${data.rejectionNote ? `Note from ${data.tutorName}:\n${data.rejectionNote}\n\n` : ''}

You can book another session with ${data.tutorName} or choose a different time slot.

Visit: ${Deno.env.get('NEXT_PUBLIC_APP_URL')}/dashboard/student/book-session
    `.trim(),
  }
}

/**
 * Template for session reminder notification (sent to both student and tutor)
 */
export function sessionReminderTemplate(
  data: BookingEmailData,
  recipientType: 'student' | 'tutor'
): {
  subject: string
  html: string
  text: string
} {
  const formattedDate = new Date(data.startTime).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const formattedTime = new Date(data.startTime).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const recipientName = recipientType === 'student' ? data.studentName : data.tutorName
  const otherPersonName = recipientType === 'student' ? data.tutorName : data.studentName
  const otherPersonRole = recipientType === 'student' ? 'tutor' : 'student'

  return {
    subject: `Reminder: ${data.subject} Session Tomorrow`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #F59E0B; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9fafb; padding: 30px; }
          .details { background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
          .detail-row { margin: 10px 0; }
          .label { font-weight: bold; color: #6B7280; }
          .reminder-icon { font-size: 48px; text-align: center; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 24px; background-color: #F59E0B; color: white; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
          .footer { text-align: center; padding: 20px; color: #6B7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Session Reminder</h1>
          </div>
          <div class="content">
            <div class="reminder-icon">📚</div>
            <p>Hi ${recipientName},</p>
            <p>This is a friendly reminder about your upcoming tutoring session with <strong>${otherPersonName}</strong>.</p>

            <div class="details">
              <div class="detail-row">
                <span class="label">Subject:</span> ${data.subject.replace('_', ' ')}
              </div>
              <div class="detail-row">
                <span class="label">Date:</span> ${formattedDate}
              </div>
              <div class="detail-row">
                <span class="label">Time:</span> ${formattedTime}
              </div>
              <div class="detail-row">
                <span class="label">Duration:</span> ${data.duration} minutes
              </div>
              ${recipientType === 'tutor' && data.specificRequests ? `
              <div class="detail-row">
                <span class="label">Student Requests:</span><br/>
                <p style="margin: 10px 0; padding: 10px; background-color: #f3f4f6; border-radius: 4px;">
                  ${data.specificRequests}
                </p>
              </div>
              ` : ''}
            </div>

            <p style="text-align: center; margin: 30px 0;">
              <a href="${Deno.env.get('NEXT_PUBLIC_APP_URL')}/dashboard/${recipientType}" class="button">
                View Dashboard
              </a>
            </p>

            <p style="color: #6B7280; font-size: 14px;">
              See you soon!
            </p>
          </div>
          <div class="footer">
            <p>This is an automated email from your tutoring platform.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Session Reminder

Hi ${recipientName},

This is a friendly reminder about your upcoming tutoring session with ${otherPersonName}.

Session Details:
- Subject: ${data.subject.replace('_', ' ')}
- Date: ${formattedDate}
- Time: ${formattedTime}
- Duration: ${data.duration} minutes
${recipientType === 'tutor' && data.specificRequests ? `- Student Requests: ${data.specificRequests}` : ''}

See you soon!

Visit: ${Deno.env.get('NEXT_PUBLIC_APP_URL')}/dashboard/${recipientType}
    `.trim(),
  }
}
