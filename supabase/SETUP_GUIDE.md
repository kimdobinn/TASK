# Supabase Setup Guide

This guide will help you set up and deploy the Supabase Edge Functions and database triggers for the tutoring platform notification system.

## Prerequisites

- Supabase account and project
- Supabase CLI installed (`npm install -g supabase`)
- Project linked to your Supabase project

## Step 1: Initialize Supabase (if not already done)

```bash
# Initialize Supabase in your project
supabase init

# Link to your Supabase project
supabase link --project-ref <your-project-ref>

# You can find your project ref in the Supabase dashboard URL:
# https://supabase.com/dashboard/project/<your-project-ref>
```

## Step 2: Enable Required Extensions

Before running migrations, ensure the `pg_net` extension is enabled for webhook functionality:

```bash
# Connect to your database
supabase db remote commit

# Enable the http extension (pg_net)
supabase db execute "CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;"
```

Alternatively, enable it via the Supabase Dashboard:
1. Go to Database → Extensions
2. Search for "pg_net"
3. Click "Enable"

## Step 3: Set Database Configuration

Set the required configuration for the triggers to work:

```bash
# Get your Supabase URL and anon key from the dashboard
# Dashboard → Settings → API

# Set the configuration (replace with your actual values)
supabase db execute "ALTER DATABASE postgres SET app.settings.supabase_url = 'https://your-project.supabase.co';"
supabase db execute "ALTER DATABASE postgres SET app.settings.supabase_anon_key = 'your-anon-key-here';"
```

## Step 4: Run Database Migrations

Apply the migrations to create the email logs table and notification triggers:

```bash
# Push all pending migrations to the database
supabase db push

# Or apply migrations individually
supabase migration up
```

This will create:
- `email_logs` table for tracking sent emails
- `notify_new_booking()` trigger function for Task 17
- `notify_status_update()` trigger function for Task 18
- Database triggers that automatically invoke Edge Functions

## Step 5: Configure Environment Variables

Create a `.env` file in the `supabase/functions/` directory with your email service credentials:

```bash
# supabase/functions/.env
RESEND_API_KEY=your_resend_api_key_here
EMAIL_FROM=Tutoring Platform <noreply@yourdomain.com>
NEXT_PUBLIC_APP_URL=https://your-app-url.com
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Step 6: Deploy Edge Functions

Deploy both Edge Functions to Supabase:

```bash
# Deploy the booking notification function
supabase functions deploy send-booking-notification

# Deploy the session reminder function
supabase functions deploy send-session-reminder

# Verify deployment
supabase functions list
```

## Step 7: Set Secrets for Edge Functions

Set the environment variables as secrets in Supabase:

```bash
# Set Resend API key
supabase secrets set RESEND_API_KEY=your_resend_api_key_here

# Set email from address
supabase secrets set EMAIL_FROM="Tutoring Platform <noreply@yourdomain.com>"

# Set app URL
supabase secrets set NEXT_PUBLIC_APP_URL=https://your-app-url.com

# Set Supabase URL (usually auto-configured)
supabase secrets set SUPABASE_URL=https://your-project.supabase.co

# Set service role key (usually auto-configured)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# List all secrets to verify
supabase secrets list
```

## Step 8: Test the Notification System

### Test New Booking Notification (Task 17)

```bash
# Insert a test booking to trigger the notification
supabase db execute "
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
"

# Check the email_logs table to see if the notification was sent
supabase db execute "SELECT * FROM email_logs ORDER BY created_at DESC LIMIT 5;"
```

### Test Status Update Notification (Task 18)

```bash
# Update a booking status to trigger the notification
supabase db execute "
UPDATE booking_requests
SET status = 'approved'
WHERE id = (SELECT id FROM booking_requests WHERE status = 'pending' LIMIT 1);
"

# Check the email_logs table
supabase db execute "SELECT * FROM email_logs WHERE email_type IN ('approved', 'rejected') ORDER BY created_at DESC LIMIT 5;"
```

### Test Session Reminder (Task 19)

You can manually invoke the session reminder function:

```bash
# Invoke the function directly
supabase functions invoke send-session-reminder

# Or test with curl
curl -X POST https://your-project.supabase.co/functions/v1/send-session-reminder \
  -H "Authorization: Bearer your-anon-key"
```

The cron schedule is configured to run daily at 10:00 AM UTC. You can modify the schedule in `supabase/functions/send-session-reminder/cron.yml`.

## Step 9: Monitor and Debug

### View Edge Function Logs

```bash
# View logs for booking notification function
supabase functions logs send-booking-notification

# View logs for session reminder function
supabase functions logs send-session-reminder

# Follow logs in real-time
supabase functions logs send-booking-notification --follow
```

### Check Database Triggers

```bash
# List all triggers on booking_requests table
supabase db execute "
SELECT
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'booking_requests';
"
```

### Check Email Logs

```bash
# View recent email logs
supabase db execute "
SELECT
    email_type,
    recipient_email,
    status,
    error_message,
    sent_at
FROM email_logs
ORDER BY sent_at DESC
LIMIT 10;
"
```

## Troubleshooting

### Issue: Triggers not firing

**Solution:**
- Verify the `pg_net` extension is enabled
- Check that the configuration settings are set correctly
- Ensure Edge Functions are deployed and accessible

### Issue: Emails not being sent

**Solution:**
- Verify `RESEND_API_KEY` is set correctly
- Check Edge Function logs for errors
- Ensure the `EMAIL_FROM` address is verified in Resend

### Issue: 401 Unauthorized errors

**Solution:**
- Verify the `SUPABASE_SERVICE_ROLE_KEY` is set correctly
- Check that the anon key is configured in database settings

## Architecture Overview

```
Database Change (INSERT/UPDATE booking_requests)
    ↓
Database Trigger (notify_new_booking / notify_status_update)
    ↓
HTTP POST via pg_net extension
    ↓
Edge Function (send-booking-notification)
    ↓
Email Service (Resend)
    ↓
Email Logs Table (tracking)
```

## Tasks Completed

- ✅ **Task 15**: Supabase Edge Functions Setup
- ✅ **Task 16**: Email Template System
- ✅ **Task 17**: New Booking Notification Function (with database triggers)
- ✅ **Task 18**: Status Update Notification Function (with database triggers)
- ✅ **Task 19**: Session Reminder Function (with cron scheduling)

## Next Steps

Continue with **Task 20: Database Webhooks Configuration** to add additional webhook functionality and error handling.
