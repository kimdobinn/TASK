# Webhook Monitoring and Management

**Task 20, Subtask 4: Error Handling and Retry Mechanism**

This guide covers monitoring webhook health, managing failures, and triggering retries.

---

## Overview

The webhook system includes:
- ✅ Automatic retry with exponential backoff
- ✅ Failure tracking in `webhook_failures` table
- ✅ Health monitoring views
- ✅ Manual retry capabilities
- ✅ Circuit breaker pattern (max 3 retries)

---

## Retry Strategy

### Exponential Backoff Schedule

| Attempt | Delay      | Total Time Elapsed |
|---------|------------|--------------------|
| 1       | Immediate  | 0 minutes          |
| 2       | 5 minutes  | 5 minutes          |
| 3       | 15 minutes | 20 minutes         |
| 4       | 45 minutes | 65 minutes         |

After 3 failed attempts (4 total tries), the webhook is marked as **permanently failed**.

---

## Monitoring Webhook Health

### View Overall Health Statistics

```sql
-- View webhook health for the last 24 hours
SELECT * FROM webhook_health_stats;
```

**Expected Output:**
```
webhook_type  | status    | count | avg_attempts | last_attempt
--------------+-----------+-------+--------------+------------------
new_request   | succeeded | 45    | 1.0          | 2024-11-14 10:30
new_request   | retrying  | 2     | 2.5          | 2024-11-14 10:25
approved      | succeeded | 30    | 1.0          | 2024-11-14 10:28
rejected      | failed    | 1     | 4.0          | 2024-11-14 09:15
```

### View Pending Retries

```sql
-- See all webhooks waiting for retry
SELECT
    id,
    booking_id,
    webhook_type,
    recipient_email,
    attempt_count,
    last_error,
    next_retry_at,
    next_retry_at - NOW() as time_until_retry
FROM webhook_failures
WHERE status = 'retrying'
ORDER BY next_retry_at;
```

### View Permanently Failed Webhooks

```sql
-- See all permanently failed webhooks
SELECT
    wf.id,
    wf.booking_id,
    wf.webhook_type,
    wf.recipient_email,
    wf.attempt_count,
    wf.last_error,
    wf.created_at,
    wf.resolved_at,
    br.subject,
    br.status as booking_status
FROM webhook_failures wf
LEFT JOIN booking_requests br ON wf.booking_id = br.id
WHERE wf.status = 'failed'
ORDER BY wf.resolved_at DESC;
```

### View Recent Webhook Activity

```sql
-- See last 50 webhook attempts with details
SELECT
    wf.webhook_type,
    wf.recipient_email,
    wf.status,
    wf.attempt_count,
    wf.last_error,
    wf.last_attempt_at,
    br.subject,
    student.full_name as student_name,
    tutor.full_name as tutor_name
FROM webhook_failures wf
JOIN booking_requests br ON wf.booking_id = br.id
LEFT JOIN user_profiles student ON br.student_id = student.id
LEFT JOIN user_profiles tutor ON br.tutor_id = tutor.id
ORDER BY wf.last_attempt_at DESC
LIMIT 50;
```

---

## Manual Retry Management

### Retry All Pending Webhooks

```sql
-- Manually trigger retry for all pending webhooks
SELECT * FROM retry_failed_webhooks();
```

**Output:**
```
retried_count | succeeded_count | failed_count
--------------+-----------------+-------------
15            | 12              | 3
```

### Retry Specific Webhook

```sql
-- Force retry a specific webhook immediately
UPDATE webhook_failures
SET
    next_retry_at = NOW(),
    status = 'retrying'
WHERE id = 'webhook-failure-uuid'
AND status != 'succeeded';

-- Then run retry function
SELECT * FROM retry_failed_webhooks();
```

### Reset Failed Webhook for Retry

```sql
-- Give a permanently failed webhook another chance
UPDATE webhook_failures
SET
    status = 'retrying',
    attempt_count = 0,
    next_retry_at = NOW(),
    resolved_at = NULL
WHERE id = 'webhook-failure-uuid';

-- Trigger retry
SELECT * FROM retry_failed_webhooks();
```

### Manually Mark as Succeeded

```sql
-- If you manually sent the email, mark webhook as succeeded
UPDATE webhook_failures
SET
    status = 'succeeded',
    resolved_at = NOW()
WHERE id = 'webhook-failure-uuid';
```

---

## Scheduled Retry Job (Recommended)

### Option 1: Supabase Edge Function with Cron

Create a cron job to run the retry function periodically:

**File:** `supabase/functions/retry-webhooks/index.ts`

```typescript
import { createSupabaseClient } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  const supabase = createSupabaseClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Call the retry function
  const { data, error } = await supabase.rpc('retry_failed_webhooks')

  if (error) {
    console.error('Error retrying webhooks:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  console.log('Retry results:', data)

  return new Response(JSON.stringify({
    success: true,
    results: data
  }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

**File:** `supabase/functions/retry-webhooks/cron.yml`

```yaml
# Run every 10 minutes
schedule: "*/10 * * * *"
```

### Option 2: pg_cron Extension

```sql
-- Enable pg_cron extension (Supabase Pro plan)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule retry job to run every 10 minutes
SELECT cron.schedule(
    'retry-webhooks',
    '*/10 * * * *',  -- Every 10 minutes
    $$SELECT retry_failed_webhooks()$$
);

-- View scheduled jobs
SELECT * FROM cron.job;

-- Remove the job if needed
SELECT cron.unschedule('retry-webhooks');
```

---

## Alerting and Notifications

### Check for High Failure Rate

```sql
-- Alert if failure rate > 10% in last hour
WITH recent_stats AS (
    SELECT
        COUNT(*) FILTER (WHERE status = 'succeeded') as succeeded,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) as total
    FROM webhook_failures
    WHERE created_at > NOW() - INTERVAL '1 hour'
)
SELECT
    *,
    CASE
        WHEN total > 0 AND (failed::float / total::float) > 0.1
        THEN '🚨 ALERT: High failure rate detected!'
        ELSE '✅ Normal operation'
    END as alert_status
FROM recent_stats;
```

### Monitor Stuck Retries

```sql
-- Find webhooks that have been retrying for too long (>2 hours)
SELECT
    id,
    booking_id,
    webhook_type,
    attempt_count,
    created_at,
    NOW() - created_at as stuck_duration
FROM webhook_failures
WHERE status = 'retrying'
AND created_at < NOW() - INTERVAL '2 hours'
ORDER BY created_at;
```

---

## Debugging Failed Webhooks

### Analyze Error Patterns

```sql
-- Group failures by error message
SELECT
    last_error,
    COUNT(*) as occurrence_count,
    MIN(created_at) as first_seen,
    MAX(created_at) as last_seen
FROM webhook_failures
WHERE status IN ('failed', 'retrying')
AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY last_error
ORDER BY occurrence_count DESC;
```

### Check Email Delivery Status

```sql
-- Compare webhook failures with email logs
SELECT
    wf.webhook_type,
    wf.status as webhook_status,
    wf.attempt_count,
    wf.last_error,
    el.status as email_status,
    el.error_message as email_error
FROM webhook_failures wf
LEFT JOIN email_logs el ON wf.booking_id = el.booking_id
    AND wf.webhook_type = el.email_type
WHERE wf.created_at > NOW() - INTERVAL '1 hour'
ORDER BY wf.created_at DESC;
```

### Test Edge Function Directly

```bash
# Test if Edge Function is reachable
curl -X POST https://your-project.supabase.co/functions/v1/send-booking-notification \
  -H "Authorization: Bearer your-anon-key" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "new_request",
    "bookingId": "test-uuid",
    "recipientEmail": "test@example.com"
  }' \
  -v  # Verbose output for debugging
```

---

## Performance Metrics

### Average Processing Time

```sql
-- Calculate average webhook processing time
SELECT
    webhook_type,
    AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))) as avg_seconds,
    MIN(EXTRACT(EPOCH FROM (resolved_at - created_at))) as min_seconds,
    MAX(EXTRACT(EPOCH FROM (resolved_at - created_at))) as max_seconds,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (resolved_at - created_at))) as p95_seconds
FROM webhook_failures
WHERE status = 'succeeded'
AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY webhook_type;
```

### Success Rate Over Time

```sql
-- Hourly success rate for last 24 hours
SELECT
    DATE_TRUNC('hour', created_at) as hour,
    COUNT(*) FILTER (WHERE status = 'succeeded') as succeeded,
    COUNT(*) FILTER (WHERE status = 'failed') as failed,
    COUNT(*) as total,
    ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'succeeded') / COUNT(*), 2) as success_rate_pct
FROM webhook_failures
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;
```

---

## Cleanup and Maintenance

### Archive Old Successes

```sql
-- Delete successful webhook records older than 7 days
DELETE FROM webhook_failures
WHERE status = 'succeeded'
AND resolved_at < NOW() - INTERVAL '7 days';
```

### Keep Failed Records for Analysis

```sql
-- Archive (don't delete) failed webhooks older than 30 days
-- You might want to create an archive table first
CREATE TABLE IF NOT EXISTS webhook_failures_archive (LIKE webhook_failures);

-- Move old failures to archive
INSERT INTO webhook_failures_archive
SELECT * FROM webhook_failures
WHERE status = 'failed'
AND resolved_at < NOW() - INTERVAL '30 days';

-- Then delete from main table
DELETE FROM webhook_failures
WHERE status = 'failed'
AND resolved_at < NOW() - INTERVAL '30 days';
```

---

## Troubleshooting Common Issues

### Issue: All webhooks failing

**Check:**
1. Is the Edge Function deployed?
   ```bash
   supabase functions list
   ```

2. Are database settings correct?
   ```sql
   SELECT current_setting('app.settings.supabase_url');
   SELECT current_setting('app.settings.supabase_anon_key');
   ```

3. Is pg_net extension enabled?
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_net';
   ```

### Issue: Webhooks stuck in retrying state

**Solution:**
```sql
-- Manually trigger retry
SELECT * FROM retry_failed_webhooks();
```

### Issue: High retry count but no permanent failures

This might indicate transient network issues. Check:
```sql
SELECT
    last_error,
    COUNT(*)
FROM webhook_failures
WHERE status = 'retrying'
GROUP BY last_error;
```

---

## Best Practices

1. **Monitor daily** - Check webhook_health_stats view once per day
2. **Set up alerts** - Alert on >10% failure rate
3. **Schedule retries** - Run retry function every 10-15 minutes
4. **Clean up regularly** - Archive old records monthly
5. **Investigate patterns** - Review error messages for recurring issues
6. **Test after deployments** - Always test webhooks after Edge Function updates

---

## Success Criteria

✅ **Task 20.4 Complete When:**
1. Retry mechanism handles transient failures
2. Exponential backoff prevents overwhelming services
3. Failed webhooks are tracked and reportable
4. Manual retry capability works
5. Monitoring queries provide visibility
6. Cleanup procedures documented

---

## Next Steps

After Task 20 completion:
1. Deploy all migrations
2. Set up scheduled retry job
3. Configure monitoring alerts
4. Proceed to Task 21: Real-time Dashboard Updates
