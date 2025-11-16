# Session Reminder Function

## Overview

The session reminder function automatically sends reminder emails to both students and tutors 24 hours before their scheduled tutoring sessions. It runs on a cron schedule and includes deduplication to prevent sending duplicate reminders.

**Task:** 19 - Session Reminder Function
**Type:** Scheduled Edge Function (Cron Job)
**Schedule:** Daily at 10:00 AM UTC
**Purpose:** Improve session attendance by sending timely reminders

## Features

✅ **Automated Scheduling** - Runs daily via cron schedule
✅ **24-Hour Window** - Sends reminders exactly 24 hours before sessions
✅ **Dual Recipients** - Reminds both student and tutor
✅ **Deduplication** - Prevents sending duplicate reminders
✅ **Comprehensive Logging** - All attempts logged to database
✅ **Error Resilience** - Continues processing even if individual sends fail
✅ **Detailed Reporting** - Returns complete summary of execution

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│           Cron Scheduler (Supabase Platform)               │
│              Triggers at 10:00 AM UTC Daily                 │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│        send-session-reminder Edge Function                  │
├─────────────────────────────────────────────────────────────┤
│  1. Calculate 24-hour time window (23.5-24.5 hrs)          │
│  2. Query approved bookings in window                       │
│  3. For each booking:                                       │
│     - Check if reminder already sent (deduplication)        │
│     - Send to student (if not sent)                         │
│     - Send to tutor (if not sent)                           │
│  4. Return execution summary                                │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│        send-booking-notification Edge Function              │
│        (type: 'reminder', recipientType: 'student'|'tutor') │
├─────────────────────────────────────────────────────────────┤
│  1. Fetch booking details                                   │
│  2. Generate reminder email template                        │
│  3. Send via Resend API                                     │
│  4. Log to email_logs table                                 │
└─────────────────────────────────────────────────────────────┘
                          │
                ┌─────────┴──────────┐
                │                    │
                ▼                    ▼
┌────────────────────────┐  ┌───────────────────┐
│   Student Inbox        │  │   Tutor Inbox     │
│   (Reminder Email)     │  │   (Reminder Email)│
└────────────────────────┘  └───────────────────┘
```

## Cron Schedule

**File:** `supabase/functions/send-session-reminder/cron.yml`

```yaml
# Run daily at 10:00 AM UTC
schedule: "0 10 * * *"
```

### Cron Expression Format

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday to Saturday)
│ │ │ │ │
│ │ │ │ │
* * * * *
```

### Common Schedules

```yaml
# Every day at 10:00 AM UTC
schedule: "0 10 * * *"

# Twice daily (6 AM and 6 PM UTC)
schedule: "0 6,18 * * *"

# Every 6 hours
schedule: "0 */6 * * *"

# Every hour (for testing)
schedule: "0 * * * *"

# Every 15 minutes (for development)
schedule: "*/15 * * * *"
```

## Query Logic

### Time Window Calculation

The function sends reminders for sessions approximately 24 hours away using a window:

```typescript
const now = new Date()
const reminderWindowStart = new Date(now.getTime() + 23.5 * 60 * 60 * 1000) // 23.5 hours
const reminderWindowEnd = new Date(now.getTime() + 24.5 * 60 * 60 * 1000)   // 24.5 hours
```

**Why a window?**
- Accounts for cron timing variations
- Ensures no sessions are missed
- Catches sessions that might fall between cron runs

### Database Query

```sql
SELECT
  booking_requests.*,
  student:user_profiles!booking_requests_student_id_fkey(full_name, email),
  tutor:user_profiles!booking_requests_tutor_id_fkey(full_name, email)
FROM booking_requests
WHERE status = 'approved'
  AND requested_start_time >= '2024-11-15T10:00:00Z'  -- 23.5 hours from now
  AND requested_start_time <= '2024-11-15T11:00:00Z'  -- 24.5 hours from now
```

**Filters:**
- `status = 'approved'` - Only send reminders for confirmed sessions
- `requested_start_time >= start` - Sessions after window start
- `requested_start_time <= end` - Sessions before window end

## Deduplication

To prevent sending duplicate reminders (e.g., if cron runs multiple times or function is manually invoked):

```typescript
async function wasReminderSent(
  supabase: any,
  bookingId: string,
  recipientEmail: string
): Promise<boolean> {
  const { data } = await supabase
    .from('email_logs')
    .select('id')
    .eq('booking_id', bookingId)
    .eq('recipient_email', recipientEmail)
    .eq('email_type', 'reminder')
    .eq('status', 'sent')
    .limit(1)

  return data && data.length > 0
}
```

**How it works:**
1. Before sending each reminder, check `email_logs` table
2. If a successful reminder was already sent for this booking + recipient, skip
3. Only checks for `status = 'sent'` (failed attempts don't count)
4. Prevents duplicate emails to the same person

## Email Templates

Reminders use the `sessionReminderTemplate()` from the shared email templates.

### Student Reminder

**Color:** Amber (#F59E0B)
**Subject:** "Reminder: Your Tutoring Session Tomorrow"

**Content:**
- Friendly reminder message
- Tutor name
- Session details (subject, date, time, duration)
- "View Your Schedule" button

### Tutor Reminder

**Color:** Amber (#F59E0B)
**Subject:** "Reminder: Tutoring Session Tomorrow"

**Content:**
- Reminder message
- Student name
- Session details
- Student's special requests (if any)
- "View Your Dashboard" button

## API Reference

### Endpoint

```
POST /functions/v1/send-session-reminder
```

### Request

No request body required - the function determines which reminders to send automatically.

### Response (Success)

```json
{
  "success": true,
  "message": "Processed 3 session(s)",
  "summary": {
    "totalSessions": 3,
    "remindersSent": 5,
    "remindersSkipped": 1,
    "remindersFailed": 0
  },
  "details": [
    {
      "bookingId": "uuid",
      "subject": "mathematics",
      "startTime": "2024-11-15T14:00:00Z",
      "student": {
        "sent": true,
        "skipped": false,
        "error": null
      },
      "tutor": {
        "sent": true,
        "skipped": false,
        "error": null
      }
    }
  ]
}
```

### Response (No Sessions)

```json
{
  "success": true,
  "message": "No sessions to remind about",
  "remindersCount": 0
}
```

### Response (Error)

```json
{
  "success": false,
  "error": "Missing Supabase credentials"
}
```

## Execution Flow

### Step-by-Step Process

1. **Initialization**
   ```typescript
   const supabase = createSupabaseClient(supabaseUrl, supabaseKey)
   ```

2. **Calculate Time Window**
   ```typescript
   const reminderWindowStart = new Date(now.getTime() + 23.5 * 60 * 60 * 1000)
   const reminderWindowEnd = new Date(now.getTime() + 24.5 * 60 * 60 * 1000)
   ```

3. **Query Upcoming Sessions**
   ```typescript
   const { data: upcomingSessions } = await supabase
     .from('booking_requests')
     .select('*, student:user_profiles(...), tutor:user_profiles(...)')
     .eq('status', 'approved')
     .gte('requested_start_time', reminderWindowStart)
     .lte('requested_start_time', reminderWindowEnd)
   ```

4. **Process Each Session**
   ```typescript
   for (const booking of upcomingSessions) {
     // Check & send to student
     if (!await wasReminderSent(booking.id, student.email)) {
       await sendReminderEmail(booking, 'student', student.email)
     }

     // Check & send to tutor
     if (!await wasReminderSent(booking.id, tutor.email)) {
       await sendReminderEmail(booking, 'tutor', tutor.email)
     }
   }
   ```

5. **Return Summary**
   ```typescript
   return {
     totalSessions: 3,
     remindersSent: 5,
     remindersSkipped: 1,
     remindersFailed: 0
   }
   ```

## Logging

### Console Output

```
🔔 Session Reminder Function started
📅 Checking for sessions between:
   Start: 2024-11-15T10:00:00.000Z
   End: 2024-11-15T11:00:00.000Z
📧 Found 3 session(s) to send reminders for

📖 Processing booking abc123:
   Subject: mathematics
   Start: 2024-11-15T14:00:00Z
   Student: Alex Chen
   Tutor: Dr. Sarah Johnson
   📤 Sending reminder to student: alex@example.com
   ✅ Student reminder sent: resend_msg_123
   📤 Sending reminder to tutor: sarah@example.com
   ✅ Tutor reminder sent: resend_msg_456

📊 Summary:
   Total sessions: 3
   Reminders sent: 5
   Skipped (already sent): 1
   Failed: 0
```

### Database Logging

All reminder attempts are logged to the `email_logs` table:

```sql
SELECT * FROM email_logs
WHERE email_type = 'reminder'
ORDER BY sent_at DESC;
```

## Development

### Local Testing

1. **Start Supabase:**
   ```bash
   supabase start
   ```

2. **Serve the function:**
   ```bash
   supabase functions serve send-session-reminder --env-file supabase/functions/.env.local
   ```

3. **Create test data:**
   ```sql
   -- Insert a test booking 24 hours from now
   INSERT INTO booking_requests (
     student_id,
     tutor_id,
     subject,
     requested_start_time,
     requested_end_time,
     duration_minutes,
     status
   ) VALUES (
     'student-uuid',
     'tutor-uuid',
     'mathematics',
     NOW() + INTERVAL '24 hours',
     NOW() + INTERVAL '25 hours',
     60,
     'approved'
   );
   ```

4. **Invoke manually:**
   ```bash
   curl -X POST http://127.0.0.1:54321/functions/v1/send-session-reminder
   ```

5. **Check results:**
   ```sql
   SELECT * FROM email_logs
   WHERE email_type = 'reminder'
   ORDER BY sent_at DESC;
   ```

### Testing Different Scenarios

**Scenario 1: No upcoming sessions**
```sql
-- Ensure no bookings in the 24-hour window
DELETE FROM booking_requests
WHERE requested_start_time BETWEEN NOW() + INTERVAL '23.5 hours'
                               AND NOW() + INTERVAL '24.5 hours';
```

**Scenario 2: Multiple sessions**
```sql
-- Insert multiple bookings
INSERT INTO booking_requests (...) VALUES (...);  -- Session 1
INSERT INTO booking_requests (...) VALUES (...);  -- Session 2
INSERT INTO booking_requests (...) VALUES (...);  -- Session 3
```

**Scenario 3: Already sent reminder (deduplication test)**
```sql
-- Manually insert an email log
INSERT INTO email_logs (
  booking_id,
  recipient_email,
  email_type,
  status,
  message_id
) VALUES (
  'booking-uuid',
  'student@example.com',
  'reminder',
  'sent',
  'test-msg-id'
);

-- Then invoke function - should skip this recipient
```

**Scenario 4: Missing email addresses**
```sql
-- Set email to null for testing
UPDATE user_profiles
SET email = NULL
WHERE id = 'student-uuid';
```

## Deployment

### Deploy Function

```bash
supabase functions deploy send-session-reminder
```

### Verify Deployment

```bash
# Check function exists
supabase functions list

# View recent logs
supabase functions logs send-session-reminder --tail

# Check cron schedule
supabase inspect db scheduled-jobs
```

### Set Environment Variables

The function uses the same environment variables as other Edge Functions:

```bash
supabase secrets set SUPABASE_URL=https://your-project.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
supabase secrets set RESEND_API_KEY=re_your_api_key
supabase secrets set EMAIL_FROM="Tutoring Platform <noreply@yourdomain.com>"
```

## Monitoring

### Check Cron Execution

```bash
# View function logs
supabase functions logs send-session-reminder --tail

# Filter for specific date
supabase functions logs send-session-reminder --since="2024-11-15"
```

### Query Execution History

```sql
-- Reminder emails sent today
SELECT
  COUNT(*) as total_reminders,
  COUNT(*) FILTER (WHERE status = 'sent') as successful,
  COUNT(*) FILTER (WHERE status = 'failed') as failed
FROM email_logs
WHERE email_type = 'reminder'
  AND DATE(sent_at) = CURRENT_DATE;

-- Breakdown by recipient type
SELECT
  CASE
    WHEN recipient_email IN (SELECT email FROM user_profiles WHERE role = 'student')
    THEN 'student'
    ELSE 'tutor'
  END as recipient_type,
  COUNT(*) as count,
  status
FROM email_logs
WHERE email_type = 'reminder'
  AND DATE(sent_at) = CURRENT_DATE
GROUP BY recipient_type, status;

-- Sessions with reminders sent
SELECT
  br.id,
  br.subject,
  br.requested_start_time,
  COUNT(el.id) as reminders_sent
FROM booking_requests br
LEFT JOIN email_logs el ON el.booking_id = br.id
  AND el.email_type = 'reminder'
  AND el.status = 'sent'
WHERE br.status = 'approved'
  AND br.requested_start_time > NOW()
GROUP BY br.id
HAVING COUNT(el.id) > 0
ORDER BY br.requested_start_time;
```

### Performance Metrics

Track key metrics:

1. **Execution Success Rate**
   ```sql
   SELECT
     DATE(sent_at) as date,
     COUNT(*) FILTER (WHERE status = 'sent') * 100.0 / COUNT(*) as success_rate
   FROM email_logs
   WHERE email_type = 'reminder'
   GROUP BY DATE(sent_at)
   ORDER BY date DESC;
   ```

2. **Average Reminders Per Day**
   ```sql
   SELECT
     AVG(daily_count) as avg_reminders_per_day
   FROM (
     SELECT DATE(sent_at), COUNT(*) as daily_count
     FROM email_logs
     WHERE email_type = 'reminder'
     GROUP BY DATE(sent_at)
   ) subquery;
   ```

3. **Deduplication Effectiveness**
   ```sql
   -- Check for any duplicate reminder attempts
   SELECT
     booking_id,
     recipient_email,
     COUNT(*) as attempt_count
   FROM email_logs
   WHERE email_type = 'reminder'
   GROUP BY booking_id, recipient_email
   HAVING COUNT(*) > 1;
   ```

## Error Handling

### Function-Level Errors

```typescript
try {
  // Main execution
} catch (error) {
  console.error('❌ Error in send-session-reminder function:', error)
  return Response(500, { error: error.message })
}
```

### Session-Level Errors

Individual session failures don't stop processing:

```typescript
for (const booking of upcomingSessions) {
  try {
    await sendReminderEmail(...)
  } catch (error) {
    console.error('Failed for booking:', booking.id, error)
    // Continue to next booking
  }
}
```

### Common Issues

**Issue:** No reminders sent despite upcoming sessions

**Solutions:**
1. Check cron schedule is correct
2. Verify time zone calculations
3. Ensure bookings have `status = 'approved'`
4. Check user profiles have email addresses
5. Review function logs for errors

**Issue:** Duplicate reminders sent

**Solutions:**
1. Verify deduplication logic is working
2. Check email_logs table for duplicates
3. Ensure cron isn't running multiple times
4. Review manual invocation history

**Issue:** Reminders sent at wrong time

**Solutions:**
1. Verify cron schedule timezone (UTC)
2. Check 24-hour window calculation
3. Ensure booking times are stored in UTC
4. Review time zone handling

## Best Practices

1. **Timing**
   - Run during low-traffic hours (10 AM UTC)
   - Avoid peak email sending times
   - Account for time zones when choosing schedule

2. **Reliability**
   - Always use deduplication
   - Log all attempts to database
   - Continue processing even if individual sends fail
   - Return detailed execution summary

3. **Performance**
   - Use efficient database queries
   - Batch email sending when possible
   - Limit query window to necessary range
   - Index email_logs for fast deduplication checks

4. **Monitoring**
   - Review logs daily
   - Track success/failure rates
   - Monitor for duplicate sends
   - Alert on high failure rates

5. **Testing**
   - Test with manual invocation first
   - Verify deduplication works
   - Check email template rendering
   - Test edge cases (no sessions, missing emails)

## Future Enhancements

- [ ] Configurable reminder timing (12h, 24h, 48h options)
- [ ] User preference for reminder timing
- [ ] Multiple reminder schedule (24h and 2h before)
- [ ] SMS reminders as alternative/addition
- [ ] Calendar invite attachments (.ics files)
- [ ] Reminder delivery confirmation tracking
- [ ] Opt-out functionality for users
- [ ] A/B testing for reminder timing effectiveness
- [ ] Analytics dashboard for reminder engagement
- [ ] Retry logic for failed sends

## Related Documentation

- [Email Templates](../_shared/EMAIL_TEMPLATES.md)
- [send-booking-notification Function](../send-booking-notification/README.md)
- [Supabase Cron Jobs](https://supabase.com/docs/guides/functions/schedule-functions)

---

**Task:** 19 - Session Reminder Function
**Status:** ✅ Complete
**Version:** 1.0.0
**Last Updated:** 2024-11-14
