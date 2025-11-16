# Webhook Testing Guide

**Task 20, Subtask 3: Function Invocation Testing and Debugging**

This guide provides comprehensive test scenarios for the database triggers and webhook system.

---

## Prerequisites

Before testing, ensure:
- ✅ Migrations are applied (`supabase db push`)
- ✅ Edge Functions are deployed
- ✅ Secrets are configured (RESEND_API_KEY, etc.)
- ✅ Test users exist (student and tutor)

---

## Test Scenario 1: New Booking Notification (Task 17)

### Setup Test Data

```sql
-- Ensure you have test users
SELECT id, full_name, email, role
FROM user_profiles
WHERE role IN ('student', 'tutor')
LIMIT 5;
```

### Test 1.1: Basic New Booking Trigger

```sql
-- Insert a new booking to trigger notification
INSERT INTO booking_requests (
    student_id,
    tutor_id,
    subject,
    requested_start_time,
    requested_end_time,
    duration_minutes,
    specific_requests,
    status
) VALUES (
    (SELECT id FROM user_profiles WHERE role = 'student' LIMIT 1),
    (SELECT id FROM user_profiles WHERE role = 'tutor' LIMIT 1),
    'mathematics',
    NOW() + INTERVAL '2 days',
    NOW() + INTERVAL '2 days 1 hour',
    60,
    'Please focus on calculus derivatives',
    'pending'
) RETURNING id, student_id, tutor_id;
```

### Expected Result:
1. Trigger `trigger_new_booking_notification` fires
2. Function `notify_new_booking()` executes
3. HTTP POST sent to Edge Function
4. Email sent to tutor
5. Entry logged in `email_logs` table

### Verification:

```sql
-- Check email logs
SELECT
    email_type,
    recipient_email,
    status,
    error_message,
    sent_at,
    created_at
FROM email_logs
WHERE email_type = 'new_request'
ORDER BY created_at DESC
LIMIT 5;

-- Get the booking details
SELECT
    br.id,
    br.subject,
    br.status,
    student.full_name as student_name,
    student.email as student_email,
    tutor.full_name as tutor_name,
    tutor.email as tutor_email
FROM booking_requests br
JOIN user_profiles student ON br.student_id = student.id
JOIN user_profiles tutor ON br.tutor_id = tutor.id
ORDER BY br.created_at DESC
LIMIT 1;
```

### Test 1.2: Missing Tutor Email (Edge Case)

```sql
-- Create a tutor profile without email
INSERT INTO user_profiles (id, full_name, role)
VALUES (gen_random_uuid(), 'Test Tutor No Email', 'tutor')
RETURNING id;

-- Try to create booking with this tutor
INSERT INTO booking_requests (
    student_id,
    tutor_id,
    subject,
    requested_start_time,
    requested_end_time,
    duration_minutes,
    status
) VALUES (
    (SELECT id FROM user_profiles WHERE role = 'student' LIMIT 1),
    (SELECT id FROM user_profiles WHERE full_name = 'Test Tutor No Email' LIMIT 1),
    'physics',
    NOW() + INTERVAL '3 days',
    NOW() + INTERVAL '3 days 1 hour',
    60,
    'pending'
);
```

### Expected Result:
- Trigger fires but skips notification (tutor has no email)
- No entry in `email_logs`
- No error thrown

---

## Test Scenario 2: Status Update Notification (Task 18)

### Test 2.1: Booking Approval

```sql
-- Update a pending booking to approved
UPDATE booking_requests
SET status = 'approved'
WHERE id = (
    SELECT id
    FROM booking_requests
    WHERE status = 'pending'
    LIMIT 1
)
RETURNING id, student_id, tutor_id, status;
```

### Expected Result:
1. Trigger `trigger_status_update_notification` fires
2. Function `notify_status_update()` executes
3. HTTP POST sent to Edge Function with type='approved'
4. Approval email sent to student
5. Entry logged in `email_logs` with email_type='approved'

### Verification:

```sql
SELECT
    email_type,
    recipient_email,
    status,
    sent_at
FROM email_logs
WHERE email_type = 'approved'
ORDER BY created_at DESC
LIMIT 5;
```

### Test 2.2: Booking Rejection with Note

```sql
-- Update a pending booking to rejected with rejection note
UPDATE booking_requests
SET
    status = 'rejected',
    rejection_note = 'Unfortunately, I am not available at this time. Please try booking for next week.'
WHERE id = (
    SELECT id
    FROM booking_requests
    WHERE status = 'pending'
    LIMIT 1
)
RETURNING id, student_id, status, rejection_note;
```

### Expected Result:
1. Trigger fires
2. Rejection email sent to student with rejection note
3. Entry logged with email_type='rejected'

### Test 2.3: Status Change to 'pending' (Should NOT trigger)

```sql
-- Change status from approved back to pending
UPDATE booking_requests
SET status = 'pending'
WHERE id = (
    SELECT id
    FROM booking_requests
    WHERE status = 'approved'
    LIMIT 1
)
RETURNING id, status;

-- Check email_logs - should NOT have new entry
SELECT COUNT(*) as should_be_zero
FROM email_logs
WHERE created_at > NOW() - INTERVAL '1 minute';
```

### Expected Result:
- Trigger does NOT fire (only approved/rejected trigger notifications)
- No new email log entry

---

## Test Scenario 3: Concurrent Operations

### Test 3.1: Multiple Simultaneous Bookings

```sql
-- Create multiple bookings at once
WITH new_bookings AS (
    INSERT INTO booking_requests (
        student_id,
        tutor_id,
        subject,
        requested_start_time,
        requested_end_time,
        duration_minutes,
        status
    )
    SELECT
        (SELECT id FROM user_profiles WHERE role = 'student' LIMIT 1),
        (SELECT id FROM user_profiles WHERE role = 'tutor' OFFSET i LIMIT 1),
        CASE i
            WHEN 0 THEN 'mathematics'
            WHEN 1 THEN 'physics'
            ELSE 'chemistry'
        END,
        NOW() + (i || ' days')::INTERVAL,
        NOW() + (i || ' days')::INTERVAL + INTERVAL '1 hour',
        60,
        'pending'
    FROM generate_series(0, 2) i
    RETURNING id
)
SELECT COUNT(*) as bookings_created FROM new_bookings;
```

### Verification:

```sql
-- Check that all notifications were sent
SELECT
    COUNT(*) as total_notifications,
    COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_count,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count
FROM email_logs
WHERE created_at > NOW() - INTERVAL '1 minute';
```

---

## Test Scenario 4: Error Handling

### Test 4.1: Invalid Data

```sql
-- Try to insert with NULL required fields (should fail at DB level)
INSERT INTO booking_requests (
    student_id,
    tutor_id,
    subject,
    requested_start_time,
    requested_end_time,
    duration_minutes,
    status
) VALUES (
    NULL,  -- Invalid: NULL student_id
    (SELECT id FROM user_profiles WHERE role = 'tutor' LIMIT 1),
    'mathematics',
    NOW() + INTERVAL '2 days',
    NOW() + INTERVAL '2 days 1 hour',
    60,
    'pending'
);
```

### Expected Result:
- Database constraint violation
- Trigger does NOT fire
- No email sent

### Test 4.2: Edge Function Unreachable (Simulation)

To test this, you'll need to temporarily disable the Edge Function or use an invalid URL:

```sql
-- Temporarily change the URL to an invalid one
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://invalid-url.example.com';

-- Try to create a booking
INSERT INTO booking_requests (
    student_id,
    tutor_id,
    subject,
    requested_start_time,
    requested_end_time,
    duration_minutes,
    status
) VALUES (
    (SELECT id FROM user_profiles WHERE role = 'student' LIMIT 1),
    (SELECT id FROM user_profiles WHERE role = 'tutor' LIMIT 1),
    'mathematics',
    NOW() + INTERVAL '2 days',
    NOW() + INTERVAL '2 days 1 hour',
    60,
    'pending'
);

-- Restore the correct URL
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://your-project.supabase.co';
```

### Expected Result:
- HTTP POST fails (network error)
- Booking still created (trigger failure doesn't rollback)
- Error logged in pg_net logs

---

## Test Scenario 5: Performance Testing

### Test 5.1: Bulk Operations

```sql
-- Create 10 bookings rapidly
DO $$
DECLARE
    i INTEGER;
BEGIN
    FOR i IN 1..10 LOOP
        INSERT INTO booking_requests (
            student_id,
            tutor_id,
            subject,
            requested_start_time,
            requested_end_time,
            duration_minutes,
            status
        ) VALUES (
            (SELECT id FROM user_profiles WHERE role = 'student' LIMIT 1),
            (SELECT id FROM user_profiles WHERE role = 'tutor' LIMIT 1),
            'mathematics',
            NOW() + (i || ' days')::INTERVAL,
            NOW() + (i || ' days')::INTERVAL + INTERVAL '1 hour',
            60,
            'pending'
        );
    END LOOP;
END $$;
```

### Verification:

```sql
-- Check processing time and success rate
SELECT
    COUNT(*) as total,
    AVG(EXTRACT(EPOCH FROM (sent_at - created_at))) as avg_processing_seconds,
    MIN(sent_at - created_at) as min_time,
    MAX(sent_at - created_at) as max_time
FROM email_logs
WHERE created_at > NOW() - INTERVAL '1 minute';
```

---

## Debugging Tools

### View Trigger Information

```sql
-- List all triggers on booking_requests
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'booking_requests'
ORDER BY trigger_name;
```

### View Function Source Code

```sql
-- View the trigger function code
SELECT pg_get_functiondef('notify_new_booking'::regproc);
SELECT pg_get_functiondef('notify_status_update'::regproc);
```

### Monitor pg_net Queue

```sql
-- Check pending HTTP requests (if pg_net extension has this view)
SELECT * FROM net.http_request_queue
ORDER BY created_at DESC
LIMIT 10;
```

### View Recent Email Logs with Full Details

```sql
SELECT
    el.id,
    el.email_type,
    el.recipient_email,
    el.status,
    el.error_message,
    el.sent_at,
    br.subject,
    br.status as booking_status,
    student.full_name as student_name,
    tutor.full_name as tutor_name
FROM email_logs el
LEFT JOIN booking_requests br ON el.booking_id = br.id
LEFT JOIN user_profiles student ON br.student_id = student.id
LEFT JOIN user_profiles tutor ON br.tutor_id = tutor.id
ORDER BY el.created_at DESC
LIMIT 20;
```

---

## Edge Function Logs

### View Real-time Logs

```bash
# Follow logs for booking notification function
supabase functions logs send-booking-notification --follow

# View last 100 log entries
supabase functions logs send-booking-notification --limit 100
```

### Test Edge Function Directly

```bash
# Test new booking notification
curl -X POST https://your-project.supabase.co/functions/v1/send-booking-notification \
  -H "Authorization: Bearer your-anon-key" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "new_request",
    "bookingId": "your-booking-uuid",
    "recipientEmail": "tutor@example.com"
  }'

# Test approval notification
curl -X POST https://your-project.supabase.co/functions/v1/send-booking-notification \
  -H "Authorization: Bearer your-anon-key" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "approved",
    "bookingId": "your-booking-uuid",
    "recipientEmail": "student@example.com"
  }'
```

---

## Success Criteria

✅ **Task 20.3 Complete When:**
1. All test scenarios pass successfully
2. Triggers fire on correct events
3. Emails are sent and logged properly
4. Edge cases handled gracefully
5. Error handling works as expected
6. Performance is acceptable (<2 seconds per notification)

---

## Cleanup Test Data

```sql
-- Delete test bookings created during testing
DELETE FROM booking_requests
WHERE created_at > NOW() - INTERVAL '1 hour'
AND specific_requests LIKE '%test%';

-- Or delete by specific IDs
DELETE FROM booking_requests
WHERE id IN ('uuid1', 'uuid2', 'uuid3');

-- Clean up email logs
DELETE FROM email_logs
WHERE sent_at > NOW() - INTERVAL '1 hour'
AND recipient_email LIKE '%test%';
```

---

## Next Steps

After testing completes successfully:
1. Mark subtask 20.3 as done
2. Proceed to subtask 20.4 (Error Handling and Retry Mechanisms)
3. Document any issues found during testing
4. Update trigger functions if needed based on test results
