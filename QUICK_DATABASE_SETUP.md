# Quick Database Setup - Reference Guide

**✅ GOOD NEWS: The database is already fully configured!**

All migrations have been applied and the database is ready to use. You can start testing the app immediately by creating a new account at http://localhost:3000/auth/signup.

---

## Database Status

**Current State:** ✅ Fully Configured

**Applied Migrations:**
- ✅ `20251113035419_create_enums_and_subjects`
- ✅ `20251113035442_create_user_profiles`
- ✅ `20251113035505_create_booking_and_blocked_times`
- ✅ `20251113035855_enable_rls_and_create_policies`
- ✅ `20251113040330_fix_handle_new_user_search_path`
- ✅ `20251113064543_create_notifications_table`
- ✅ `20251113082113_allow_students_view_tutors`

**Existing Tables:**
- ✅ `user_profiles` - User information and roles
- ✅ `subjects` - Available subjects for tutoring
- ✅ `booking_requests` - Session bookings
- ✅ `blocked_times` - Tutor unavailable periods
- ✅ `notifications` - In-app notifications

---

## Quick Start

Instead of setting up the database (already done), just:

1. **Create an account**: Visit http://localhost:3000/auth/signup
2. **Sign in**: Visit http://localhost:3000/auth/login
3. **Start testing**: Browse features based on your role

---

## Reference: Manual Setup (NOT NEEDED)

The information below is for reference only. **You don't need to do this** as the database is already configured.

## Option 1: Via Supabase Dashboard (Easiest - 2 minutes)

1. **Go to your Supabase Dashboard:**
   - Visit: https://supabase.com/dashboard/project/fuxjduuqtjmwdthrqipn

2. **Open SQL Editor:**
   - Click "SQL Editor" in the left sidebar
   - Click "+ New Query"

3. **Run the initial schema:**
   - Copy the contents of `supabase/migrations/20241114000000_initial_schema.sql`
   - Paste into the SQL editor
   - Click "Run" (or press Cmd+Enter)
   - Wait for "Success" message

4. **Run the other migrations in order:**
   - `20241114000001_create_email_logs_table.sql`
   - `20241114000002_create_notification_triggers.sql`
   - `20241114000003_add_webhook_retry_mechanism.sql`

5. **Refresh your browser at localhost:3000** - Login should work now!

## Option 2: Via Supabase CLI (If logged in)

```bash
# Login to Supabase (one-time setup)
supabase login

# Link your project
supabase link --project-ref fuxjduuqtjmwdthrqipn

# Push all migrations
supabase db push
```

## Option 3: Manual SQL (Copy-paste each file)

Use the Supabase Dashboard → SQL Editor and run each migration file in order:

1. `20241114000000_initial_schema.sql` ← **THIS ONE FIRST!**
2. `20241114000001_create_email_logs_table.sql`
3. `20241114000002_create_notification_triggers.sql`
4. `20241114000003_add_webhook_retry_mechanism.sql`

---

## What This Does

The initial schema creates:
- ✅ User profiles table
- ✅ Tutor profiles table
- ✅ Availability slots table
- ✅ Blocked times table
- ✅ Booking requests table
- ✅ All necessary indexes
- ✅ Row Level Security policies

---

## After Setup

Once migrations are applied, you can:

1. **Sign Up** - Create a new account
2. **Login** - Use your new account
3. **Choose Role** - Student or Tutor
4. **Start Using** - Book sessions or manage availability

---

## Test It Works

After running migrations:

```bash
# Check tables were created
# Go to Supabase Dashboard → Table Editor
# You should see: user_profiles, tutor_profiles, booking_requests, etc.
```

---

## Still Not Working?

Check:
1. Migrations ran without errors
2. Tables appear in Table Editor
3. RLS is enabled on tables
4. Browser console for specific errors

---

**Quick Start:** Just run the SQL from `20241114000000_initial_schema.sql` in Supabase Dashboard → SQL Editor and you're good to go! 🚀
