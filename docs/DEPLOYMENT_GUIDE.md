# Deployment Guide - Class Scheduler

This guide provides step-by-step instructions for deploying the Class Scheduler application to production.

---

## Prerequisites

- Node.js 20+ installed
- Supabase account (https://supabase.com)
- Vercel account (https://vercel.com)
- GitHub repository with the code

---

## Part 1: Supabase Setup

### 1.1 Create Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in project details:
   - Name: `class-scheduler-prod`
   - Database Password: (save this securely)
   - Region: Choose closest to your users
4. Wait for project creation (~2 minutes)

### 1.2 Run Database Migrations

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Apply all migrations
supabase db push
```

### 1.3 Enable Realtime

1. Go to Database → Replication
2. Enable replication for `booking_requests` table
3. Run SQL:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE booking_requests;
```

### 1.4 Configure Database Settings

In Supabase Dashboard → Database → Database Settings:

```sql
-- Set configuration for webhook URLs
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://YOUR_PROJECT_REF.supabase.co';
ALTER DATABASE postgres SET app.settings.supabase_anon_key = 'YOUR_ANON_KEY';
```

### 1.5 Deploy Edge Functions

```bash
# Deploy email notification function
supabase functions deploy send-booking-notification

# Deploy all other Edge Functions
supabase functions deploy send-status-update
supabase functions deploy send-reminder
```

### 1.6 Set Edge Function Secrets

```bash
# Configure email service credentials
supabase secrets set RESEND_API_KEY=your_resend_api_key
supabase secrets set SENDGRID_API_KEY=your_sendgrid_api_key
```

---

## Part 2: Vercel Deployment

### 2.1 Connect GitHub Repository

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Select the repository containing the code

### 2.2 Configure Build Settings

- **Framework Preset:** Next.js
- **Build Command:** `npm run build`
- **Output Directory:** `.next`
- **Install Command:** `npm install`

### 2.3 Set Environment Variables

Add the following environment variables in Vercel:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Optional: Analytics
NEXT_PUBLIC_ANALYTICS_ID=your_analytics_id
```

### 2.4 Deploy

1. Click "Deploy"
2. Wait for build to complete (~2-3 minutes)
3. Visit your deployment URL

---

## Part 3: Post-Deployment Verification

### 3.1 Test Critical Flows

**Student Flow:**
1. ✅ Sign up as student
2. ✅ Browse tutors
3. ✅ Book a session
4. ✅ Receive confirmation email
5. ✅ View booking in dashboard

**Tutor Flow:**
1. ✅ Sign up as tutor
2. ✅ Set availability
3. ✅ Receive booking notification email
4. ✅ Approve/reject booking
5. ✅ Student receives status update email

### 3.2 Verify Email Delivery

1. Test student signup email
2. Test booking confirmation email
3. Test tutor notification email
4. Test status update email
5. Check spam folder if emails not received

### 3.3 Test Real-time Updates

1. Open student dashboard in one browser
2. Open tutor dashboard in another browser
3. Tutor approves booking
4. Verify student dashboard updates automatically
5. Verify toast notification appears

### 3.4 Check Database Webhooks

1. Create test booking
2. Check Supabase logs for webhook execution
3. Verify Edge Function was triggered
4. Check for any errors in logs

---

## Part 4: Monitoring Setup

### 4.1 Supabase Monitoring

1. Enable database logs
2. Set up slow query alerts
3. Monitor Edge Function execution
4. Check webhook failure logs

### 4.2 Vercel Monitoring

1. Enable Analytics
2. Set up error tracking
3. Monitor build logs
4. Check deployment status

---

## Part 5: Custom Domain (Optional)

### 5.1 Add Domain to Vercel

1. Go to Project Settings → Domains
2. Add your domain (e.g., `classscheduler.com`)
3. Configure DNS records as shown

### 5.2 SSL Certificate

- Vercel automatically provisions SSL certificates
- Wait ~1 minute for certificate generation
- Verify HTTPS works

---

## Environment Variables Reference

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGc...` |

### Optional

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_ANALYTICS_ID` | Analytics tracking ID | `G-XXXXXXXXXX` |

---

## Troubleshooting

### Issue: Build Fails

**Solution:**
1. Check build logs in Vercel
2. Verify all dependencies are in `package.json`
3. Run `npm run build` locally to reproduce
4. Check for TypeScript errors

### Issue: Database Connection Fails

**Solution:**
1. Verify Supabase URL is correct
2. Check anon key is valid
3. Ensure project is not paused
4. Check RLS policies allow access

### Issue: Emails Not Sending

**Solution:**
1. Verify Edge Functions are deployed
2. Check Edge Function secrets are set
3. Review Edge Function logs for errors
4. Verify email service API keys are valid
5. Check database triggers are active

### Issue: Real-time Not Working

**Solution:**
1. Verify Realtime is enabled on table
2. Check WebSocket connection in browser DevTools
3. Verify RLS policies allow realtime subscription
4. Check browser console for errors

---

## Rollback Procedure

### Quick Rollback

1. Go to Vercel Dashboard → Deployments
2. Find previous working deployment
3. Click three dots → "Promote to Production"
4. Confirm rollback

### Database Rollback

```bash
# List migrations
supabase migration list

# Rollback to specific migration
supabase db reset --db-url YOUR_DATABASE_URL
```

---

## Security Checklist

- [ ] RLS policies enabled on all tables
- [ ] API keys stored as environment variables (not in code)
- [ ] HTTPS enforced on custom domain
- [ ] Supabase anon key has restricted permissions
- [ ] Edge Functions have rate limiting
- [ ] Database backups enabled
- [ ] Error messages don't expose sensitive data

---

## Performance Checklist

- [ ] Database indexes on frequently queried columns
- [ ] Edge Functions have appropriate timeout limits
- [ ] Images optimized with Next.js Image component
- [ ] Code splitting enabled (automatic with Next.js)
- [ ] Caching configured for static assets
- [ ] Real-time subscriptions filtered properly

---

## Support Resources

- **Supabase Documentation:** https://supabase.com/docs
- **Vercel Documentation:** https://vercel.com/docs
- **Next.js Documentation:** https://nextjs.org/docs
- **Project GitHub:** (your repository URL)

---

## Maintenance

### Weekly Tasks
- Check error logs for issues
- Monitor Edge Function execution times
- Review slow query logs

### Monthly Tasks
- Update dependencies
- Review database performance
- Check for security updates
- Analyze usage metrics

---

**Deployment Status:** Ready for Production ✅
