# Quick Start - Email Notifications Setup

**5-Minute Setup Guide for Tasks 17 & 18**

---

## 1. Enable pg_net Extension

Via **Supabase Dashboard:**
- Go to **Database** → **Extensions**
- Search for `pg_net`
- Click **Enable**

Or via CLI:
```bash
supabase db execute "CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;"
```

---

## 2. Configure Database Settings

```bash
# Replace with your actual values from Supabase Dashboard → Settings → API
supabase db execute "ALTER DATABASE postgres SET app.settings.supabase_url = 'https://xxxxx.supabase.co';"
supabase db execute "ALTER DATABASE postgres SET app.settings.supabase_anon_key = 'eyJhbGc...';"
```

---

## 3. Run Migrations

```bash
supabase db push
```

This creates:
- ✅ `email_logs` table
- ✅ Database triggers for automatic notifications

---

## 4. Deploy Edge Functions

```bash
# Deploy notification function
supabase functions deploy send-booking-notification

# Deploy reminder function
supabase functions deploy send-session-reminder

# Verify
supabase functions list
```

---

## 5. Set Secrets

Get a free API key from [Resend](https://resend.com):

```bash
supabase secrets set RESEND_API_KEY=re_xxxxx
supabase secrets set EMAIL_FROM="Tutoring Platform <noreply@yourdomain.com>"
supabase secrets set NEXT_PUBLIC_APP_URL=https://your-app.com
```

---

## 6. Test It

### Test New Booking Notification
```sql
INSERT INTO booking_requests (
    student_id, tutor_id, subject,
    requested_start_time, requested_end_time,
    duration_minutes, status
) VALUES (
    (SELECT id FROM user_profiles WHERE role = 'student' LIMIT 1),
    (SELECT id FROM user_profiles WHERE role = 'tutor' LIMIT 1),
    'mathematics',
    NOW() + INTERVAL '2 days',
    NOW() + INTERVAL '2 days 1 hour',
    60, 'pending'
);
```

### Check Email Logs
```sql
SELECT * FROM email_logs ORDER BY created_at DESC LIMIT 5;
```

---

## 7. Monitor

View Edge Function logs:
```bash
supabase functions logs send-booking-notification --follow
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `extension pg_net does not exist` | Enable pg_net extension (step 1) |
| `unrecognized configuration parameter` | Set database config (step 2) |
| Emails not sending | Check `RESEND_API_KEY` is set correctly |
| 401 errors | Verify `supabase_anon_key` is correct |

---

## What Gets Triggered?

| Event | Trigger | Recipient | Email Type |
|-------|---------|-----------|------------|
| New booking created | INSERT | Tutor | New request notification |
| Status → `approved` | UPDATE | Student | Approval notification |
| Status → `rejected` | UPDATE | Student | Rejection notification |
| 24h before session | Cron (daily 10am UTC) | Both | Session reminder |

---

## Done! 🎉

Your automatic email notification system is now live.

For detailed information, see:
- Full setup guide: `supabase/SETUP_GUIDE.md`
- Migration details: `supabase/migrations/README.md`
- Completion report: `docs/TASKS_17_18_COMPLETION.md`
