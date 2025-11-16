# Database Migrations

This directory contains Supabase database migrations for the tutoring platform.

## Migrations Overview

### 20241114000001_create_email_logs_table.sql
**Task 17: New Booking Notification Function**

Creates the `email_logs` table to track all email notifications sent through the platform.

**Features:**
- Tracks email type (new_request, approved, rejected, reminder)
- Records delivery status (sent, failed, pending)
- Links to booking_requests via foreign key
- Includes RLS policies for secure access
- Indexed for fast lookups

**Tables Created:**
- `email_logs`

**Indexes:**
- `idx_email_logs_booking_id`
- `idx_email_logs_recipient_email`
- `idx_email_logs_sent_at`
- `idx_email_logs_status`

---

### 20241114000002_create_notification_triggers.sql
**Tasks 17 & 18: Automatic Email Notifications**

Creates database triggers that automatically send email notifications when bookings are created or updated.

**Features:**
- **Task 17**: Trigger for new booking requests → notifies tutor
- **Task 18**: Trigger for status updates (approved/rejected) → notifies student
- Uses pg_net extension for HTTP calls to Edge Functions
- Secure invocation using Supabase authentication

**Functions Created:**
- `notify_new_booking()` - Sends email when new booking is created
- `notify_status_update()` - Sends email when booking status changes

**Triggers Created:**
- `trigger_new_booking_notification` - AFTER INSERT on booking_requests
- `trigger_status_update_notification` - AFTER UPDATE on booking_requests

**Requirements:**
1. `pg_net` extension must be enabled
2. Database configuration settings must be set:
   - `app.settings.supabase_url`
   - `app.settings.supabase_anon_key`
3. Edge Functions must be deployed:
   - `send-booking-notification`

---

## Running Migrations

### Using Supabase CLI

```bash
# Apply all pending migrations
supabase db push

# Or apply migrations sequentially
supabase migration up
```

### Manual Application

If you need to apply migrations manually via the Supabase Dashboard:

1. Go to SQL Editor in your Supabase Dashboard
2. Copy the contents of each migration file
3. Run them in order (by filename)

---

## Migration Dependencies

```
20241114000001_create_email_logs_table.sql
    ↓
20241114000002_create_notification_triggers.sql
```

The triggers migration depends on the email_logs table existing.

---

## Rollback

If you need to rollback migrations:

### Remove Triggers

```sql
DROP TRIGGER IF EXISTS trigger_new_booking_notification ON booking_requests;
DROP TRIGGER IF EXISTS trigger_status_update_notification ON booking_requests;
DROP FUNCTION IF EXISTS notify_new_booking();
DROP FUNCTION IF EXISTS notify_status_update();
```

### Remove Email Logs Table

```sql
DROP TABLE IF EXISTS email_logs CASCADE;
```

**Warning:** This will delete all email tracking history!

---

## Testing Migrations

After applying migrations, test that triggers work correctly:

```sql
-- Test new booking notification
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

-- Test status update notification
UPDATE booking_requests
SET status = 'approved'
WHERE status = 'pending'
LIMIT 1;

-- Check email_logs to verify notifications were logged
SELECT * FROM email_logs ORDER BY created_at DESC LIMIT 5;
```

---

## Troubleshooting

### "extension pg_net does not exist"

**Solution:**
```sql
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
```

Or enable via Supabase Dashboard → Database → Extensions

### "unrecognized configuration parameter app.settings"

**Solution:**
```sql
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://your-project.supabase.co';
ALTER DATABASE postgres SET app.settings.supabase_anon_key = 'your-anon-key';
```

### Triggers not firing

**Solution:**
1. Check that Edge Functions are deployed
2. Verify database configuration is set
3. Check Edge Function logs for errors
4. Ensure user_profiles table has email column

---

## Best Practices

1. **Always backup** before running migrations in production
2. **Test migrations** in a development environment first
3. **Monitor logs** after deploying to catch any issues
4. **Document changes** in this README when adding new migrations
