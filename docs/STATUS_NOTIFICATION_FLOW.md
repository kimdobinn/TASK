# Status Update Notification Flow

## Overview

This document describes the complete flow for sending notifications when a tutor updates the status of a booking request (approve or reject). This implements **Task 18: Status Update Notification Function**.

## Architecture

The notification system uses a dual-channel approach:
1. **In-app notifications** stored in the `notifications` table
2. **Email notifications** sent via Resend API through Edge Functions

```
┌─────────────────────────────────────────────────────────────────┐
│                        Tutor Dashboard                          │
│           (Approve/Reject Booking Request)                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│        PATCH /api/booking-requests/[id]/status                  │
│        (app/api/booking-requests/[id]/status/route.ts:11)       │
├─────────────────────────────────────────────────────────────────┤
│  1. Verify authentication (tutor only)                          │
│  2. Validate booking ownership                                  │
│  3. Check booking status (must be pending)                      │
│  4. Validate new status (approved/rejected)                     │
│  5. Check for conflicts (if approving)                          │
│  6. Call updateBookingRequestStatus()                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│        updateBookingRequestStatus()                             │
│        (lib/booking-requests.ts:277)                            │
├─────────────────────────────────────────────────────────────────┤
│  1. Validate user authentication & tutor role                   │
│  2. Verify booking ownership                                    │
│  3. Check status transition validity                            │
│  4. Check for scheduling conflicts (if approving)               │
│  5. Update booking_requests table                               │
│  6. Trigger notification functions                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴──────────────┐
                │                            │
                ▼                            ▼
┌──────────────────────────┐    ┌──────────────────────────┐
│ notifyStudentOfApproval  │    │ notifyStudentOfRejection │
│ (lib/notifications.ts:84)│    │ (lib/notifications.ts:150)│
└──────────────────────────┘    └──────────────────────────┘
                │                            │
                ▼                            ▼
┌─────────────────────────────────────────────────────────────────┐
│             Dual Notification Channels                          │
├─────────────────────────────────────────────────────────────────┤
│  Channel 1: In-App Notification                                 │
│    - createNotification() → notifications table                 │
│    - Visible in dashboard immediately                           │
│    - Used for real-time alerts                                  │
│                                                                  │
│  Channel 2: Email Notification                                  │
│    - supabase.functions.invoke('send-booking-notification')     │
│    - Async call to Edge Function                                │
│    - Sends professional HTML email                              │
│    - Logs to email_logs table                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│        send-booking-notification Edge Function                  │
│        (supabase/functions/send-booking-notification/index.ts:1)│
├─────────────────────────────────────────────────────────────────┤
│  1. Validate request parameters                                 │
│  2. Fetch booking details from database                         │
│  3. Generate email content (approved/rejected template)         │
│  4. Send email via Resend API                                   │
│  5. Log result to email_logs table                              │
│  6. Return success/error response                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
                ▼                           ▼
┌───────────────────────┐      ┌────────────────────────┐
│    Resend API         │      │   email_logs Table     │
│  (Email Delivery)     │      │   (Audit Trail)        │
└───────────────────────┘      └────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────────┐
│           Student Receives Notification                       │
├───────────────────────────────────────────────────────────────┤
│  1. Email arrives in inbox (professional HTML template)       │
│  2. In-app notification appears in dashboard                  │
│  3. Student can view details and take action                  │
└───────────────────────────────────────────────────────────────┘
```

## Implementation Details

### 1. API Route (app/api/booking-requests/[id]/status/route.ts:11)

**Responsibilities:**
- Authentication & authorization
- Input validation
- Business logic validation (conflicts, status transitions)
- Delegates to service layer

**Key Validations:**
```typescript
// Only tutors can update status
if (profile.role !== 'tutor') {
  return 403 Forbidden
}

// Verify booking belongs to this tutor
if (booking.tutor_id !== user.id) {
  return 403 Forbidden
}

// Booking must be pending
if (booking.status !== 'pending') {
  return 400 Bad Request
}

// Check for time conflicts when approving
if (status === 'approved') {
  // Query for overlapping approved bookings
  // Return 409 Conflict if overlap detected
}
```

### 2. Service Layer (lib/booking-requests.ts:277)

**Function:** `updateBookingRequestStatus()`

**Responsibilities:**
- Database interaction
- Status update logic
- Trigger notifications

**Code Flow:**
```typescript
export async function updateBookingRequestStatus(
  id: string,
  status: BookingStatus,
  rejectionNote?: string
): Promise<BookingRequest> {
  // 1. Validate authentication
  const { user } = await supabase.auth.getUser()

  // 2. Verify tutor role
  const profile = await fetchUserProfile(user.id)
  if (profile.role !== 'tutor') throw Error

  // 3. Validate ownership
  const booking = await fetchBooking(id)
  if (booking.tutor_id !== user.id) throw Error

  // 4. Check conflicts (if approving)
  if (status === 'approved') {
    const conflicts = await checkBookingConflicts(...)
    if (conflicts.length > 0) throw Error
  }

  // 5. Update database
  const updated = await supabase
    .from('booking_requests')
    .update({ status, rejection_note })
    .eq('id', id)

  // 6. Send notifications
  if (status === 'approved') {
    notifyStudentOfApproval(...)
  } else if (status === 'rejected') {
    notifyStudentOfRejection(...)
  }

  return updated
}
```

### 3. Notification Layer (lib/notifications.ts)

#### Approval Notification (lib/notifications.ts:84)

```typescript
export async function notifyStudentOfApproval(
  studentId: string,
  tutorName: string,
  subject: string,
  startTime: string,
  bookingId: string
): Promise<void> {
  // Channel 1: In-app notification
  await createNotification({
    user_id: studentId,
    title: 'Booking Approved',
    message: `Your ${subject} session with ${tutorName}...`,
    type: 'booking_approved',
    related_booking_id: bookingId,
  })

  // Channel 2: Email notification
  const { data: studentProfile } = await supabase
    .from('user_profiles')
    .select('email')
    .eq('id', studentId)
    .single()

  if (studentProfile?.email) {
    supabase.functions.invoke('send-booking-notification', {
      body: {
        type: 'approved',
        bookingId,
        recipientEmail: studentProfile.email,
      },
    })
  }
}
```

#### Rejection Notification (lib/notifications.ts:150)

```typescript
export async function notifyStudentOfRejection(
  studentId: string,
  tutorName: string,
  subject: string,
  startTime: string,
  rejectionNote: string,
  bookingId: string
): Promise<void> {
  // Channel 1: In-app notification
  await createNotification({
    user_id: studentId,
    title: 'Booking Not Approved',
    message: `Your ${subject} session... Reason: ${rejectionNote}`,
    type: 'booking_rejected',
    related_booking_id: bookingId,
  })

  // Channel 2: Email notification
  const { data: studentProfile } = await supabase
    .from('user_profiles')
    .select('email')
    .eq('id', studentId)
    .single()

  if (studentProfile?.email) {
    supabase.functions.invoke('send-booking-notification', {
      body: {
        type: 'rejected',
        bookingId,
        recipientEmail: studentProfile.email,
      },
    })
  }
}
```

### 4. Email Sending (supabase/functions/send-booking-notification/index.ts:1)

**Process:**
1. Validate request body (type, bookingId, recipientEmail)
2. Fetch booking with joined profiles:
   ```sql
   SELECT booking_requests.*,
          student:user_profiles.full_name,
          tutor:user_profiles.full_name
   FROM booking_requests
   WHERE id = bookingId
   ```
3. Generate email content using template:
   - `bookingApprovedTemplate()` for approved status
   - `bookingRejectedTemplate()` for rejected status
4. Send via Resend API (or dev mode fallback)
5. Log to `email_logs` table with status and message_id

## Database Schema

### notifications Table

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,  -- 'booking_approved', 'booking_rejected', etc.
  related_booking_id UUID REFERENCES booking_requests(id),
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### email_logs Table

```sql
CREATE TABLE email_logs (
  id UUID PRIMARY KEY,
  booking_id UUID REFERENCES booking_requests(id),
  recipient_email TEXT NOT NULL,
  email_type TEXT NOT NULL,  -- 'approved', 'rejected', 'new_request', 'reminder'
  message_id TEXT,  -- Resend message ID
  status TEXT NOT NULL,  -- 'sent', 'failed', 'pending'
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Email Templates

### Approval Email

**Color:** Green (#10B981)
**Subject:** "Your Tutoring Session has been Approved!"

**Content:**
- Success header with checkmark
- "Great news!" message
- Tutor name
- Session details (subject, date, time, duration)
- "View Your Schedule" button
- Reminder notification notice

**Template:** `bookingApprovedTemplate()` in `supabase/functions/_shared/email-templates.ts`

### Rejection Email

**Color:** Red (#EF4444)
**Subject:** "Update on Your Tutoring Session Request"

**Content:**
- Polite rejection message
- Tutor name
- Original booking details
- Rejection note (if provided)
- "Book Another Session" button
- Encouragement to try different time

**Template:** `bookingRejectedTemplate()` in `supabase/functions/_shared/email-templates.ts`

## Error Handling

### API Route Level
```typescript
// Returns appropriate HTTP status codes
400 Bad Request - Invalid input
401 Unauthorized - Not logged in
403 Forbidden - Wrong role or ownership
404 Not Found - Booking doesn't exist
409 Conflict - Time slot conflict
500 Internal Server Error - Database/system error
```

### Service Layer
```typescript
// Throws descriptive errors
throw new Error('Only tutors can update booking status')
throw new Error('Cannot approve - time slot conflicts')
throw new Error('Rejection note is too long')
```

### Notification Layer
```typescript
// Non-critical failures - log but don't throw
try {
  await createNotification(...)
  await sendEmail(...)
} catch (error) {
  console.error('Error notifying student:', error)
  // Don't throw - notifications are non-critical
}
```

### Email Function
```typescript
// Graceful degradation
if (!RESEND_API_KEY) {
  console.log('Dev mode - email logged to console')
  return { success: true, messageId: 'dev-mode-...' }
}

try {
  const response = await resend.send(...)
} catch (error) {
  // Log to email_logs with status: 'failed'
  return { success: false, error: error.message }
}
```

## Testing

### Manual Testing Flow

1. **Setup:**
   ```bash
   # Start local Supabase
   supabase start

   # Run Next.js dev server
   npm run dev
   ```

2. **Test Approval:**
   - Log in as tutor
   - Navigate to tutor dashboard
   - Find pending booking request
   - Click "Approve"
   - Verify:
     - ✓ Booking status updates to 'approved'
     - ✓ In-app notification created for student
     - ✓ Email sent to student (check console if dev mode)
     - ✓ email_logs entry created
     - ✓ Student sees notification in dashboard

3. **Test Rejection:**
   - Log in as tutor
   - Find another pending request
   - Click "Reject" and provide note
   - Verify:
     - ✓ Booking status updates to 'rejected'
     - ✓ Rejection note saved
     - ✓ In-app notification created
     - ✓ Email sent with rejection note
     - ✓ email_logs entry created

### API Testing

```bash
# Approve booking
curl -X PATCH http://localhost:3000/api/booking-requests/BOOKING_ID/status \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "status": "approved"
  }'

# Reject booking
curl -X PATCH http://localhost:3000/api/booking-requests/BOOKING_ID/status \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "status": "rejected",
    "rejection_note": "Sorry, I have a conflict at this time"
  }'
```

### Database Verification

```sql
-- Check in-app notifications
SELECT * FROM notifications
WHERE related_booking_id = 'BOOKING_ID'
ORDER BY created_at DESC;

-- Check email logs
SELECT * FROM email_logs
WHERE booking_id = 'BOOKING_ID'
ORDER BY sent_at DESC;

-- Check booking status
SELECT status, rejection_note, updated_at
FROM booking_requests
WHERE id = 'BOOKING_ID';
```

## Performance Considerations

1. **Async Email Sending:**
   - Email function called with `.then()` (fire and forget)
   - Doesn't block API response
   - Student gets immediate feedback

2. **Database Queries:**
   - Uses single UPDATE query with SELECT
   - Indexed lookups on booking_id
   - Efficient conflict checking query

3. **Error Resilience:**
   - In-app notification always succeeds
   - Email failure doesn't break user flow
   - All attempts logged for debugging

## Security

1. **Authentication:**
   - Verified at API route level
   - Rechecked in service layer
   - Edge Function uses service role key

2. **Authorization:**
   - Only tutors can update status
   - Must own the booking request
   - RLS policies protect data access

3. **Input Validation:**
   - Status must be 'approved' or 'rejected'
   - Rejection note length limited (500 chars)
   - Booking must be in 'pending' status

4. **Email Security:**
   - Email addresses fetched from verified profiles
   - No user-provided email addresses
   - Edge Function validates all inputs

## Monitoring

### Key Metrics

1. **Notification Success Rate:**
   ```sql
   SELECT
     COUNT(*) FILTER (WHERE status = 'sent') * 100.0 / COUNT(*) as success_rate
   FROM email_logs
   WHERE email_type IN ('approved', 'rejected')
     AND sent_at > NOW() - INTERVAL '7 days';
   ```

2. **Average Response Time:**
   - Monitor API route execution time
   - Track Edge Function duration
   - Measure email delivery latency

3. **Error Rates:**
   ```sql
   SELECT
     error_message,
     COUNT(*) as occurrences
   FROM email_logs
   WHERE status = 'failed'
     AND email_type IN ('approved', 'rejected')
   GROUP BY error_message
   ORDER BY occurrences DESC;
   ```

## Future Enhancements

- [ ] Batch email sending for efficiency
- [ ] Email delivery webhooks from Resend
- [ ] Retry logic for failed emails
- [ ] User email preference settings
- [ ] SMS notifications option
- [ ] Push notifications for mobile
- [ ] Template A/B testing
- [ ] Analytics dashboard
- [ ] Email open/click tracking

## Related Tasks

- **Task 14:** Booking Status Management (API route, validation)
- **Task 17:** New Booking Notification Function (email infrastructure)
- **Task 18:** Status Update Notification Function (this document)
- **Task 19:** Session Reminder Function (upcoming)
- **Task 20:** Database Webhooks Configuration (upcoming)

---

**Task:** 18 - Status Update Notification Function
**Status:** ✅ Complete
**Last Updated:** 2024-11-14
**Version:** 1.0.0
