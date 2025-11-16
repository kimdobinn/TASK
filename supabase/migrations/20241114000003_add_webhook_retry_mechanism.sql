-- Migration: Add retry mechanism and error handling for webhooks
-- Task 20, Subtask 4: Error Handling and Retry Mechanism Implementation
-- Created: 2024-11-14

-- ========================================================================
-- Webhook Failure Tracking Table
-- ========================================================================

-- Create table to track failed webhook attempts for retry mechanism
CREATE TABLE IF NOT EXISTS webhook_failures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES booking_requests(id) ON DELETE CASCADE,
    webhook_type TEXT NOT NULL CHECK (webhook_type IN ('new_request', 'approved', 'rejected')),
    recipient_email TEXT NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 1,
    last_error TEXT,
    last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    next_retry_at TIMESTAMPTZ,
    max_retries INTEGER NOT NULL DEFAULT 3,
    status TEXT NOT NULL CHECK (status IN ('pending', 'retrying', 'failed', 'succeeded')) DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_webhook_failures_status ON webhook_failures(status);
CREATE INDEX IF NOT EXISTS idx_webhook_failures_next_retry ON webhook_failures(next_retry_at) WHERE status = 'retrying';
CREATE INDEX IF NOT EXISTS idx_webhook_failures_booking_id ON webhook_failures(booking_id);

COMMENT ON TABLE webhook_failures IS 'Tracks failed webhook attempts with retry information';
COMMENT ON COLUMN webhook_failures.attempt_count IS 'Number of times webhook delivery has been attempted';
COMMENT ON COLUMN webhook_failures.next_retry_at IS 'When the next retry should be attempted (exponential backoff)';


-- ========================================================================
-- Enhanced Trigger Functions with Error Handling
-- ========================================================================

-- Enhanced function for new booking notifications with error handling
CREATE OR REPLACE FUNCTION notify_new_booking()
RETURNS TRIGGER AS $$
DECLARE
    tutor_email TEXT;
    http_response RECORD;
BEGIN
    -- Get tutor email from user_profiles
    SELECT email INTO tutor_email
    FROM user_profiles
    WHERE id = NEW.tutor_id;

    -- Only send notification if tutor email exists
    IF tutor_email IS NOT NULL THEN
        BEGIN
            -- Invoke Edge Function to send notification
            SELECT * INTO http_response
            FROM net.http_post(
                url := current_setting('app.settings.supabase_url') || '/functions/v1/send-booking-notification',
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key')
                ),
                body := jsonb_build_object(
                    'type', 'new_request',
                    'bookingId', NEW.id::text,
                    'recipientEmail', tutor_email
                ),
                timeout_milliseconds := 10000  -- 10 second timeout
            );

            -- Check if request failed (status not 2xx)
            IF http_response.status_code IS NULL OR http_response.status_code >= 300 THEN
                -- Log failure for retry mechanism
                INSERT INTO webhook_failures (
                    booking_id,
                    webhook_type,
                    recipient_email,
                    last_error,
                    next_retry_at,
                    status
                ) VALUES (
                    NEW.id,
                    'new_request',
                    tutor_email,
                    'HTTP ' || COALESCE(http_response.status_code::text, 'timeout'),
                    NOW() + INTERVAL '5 minutes',  -- First retry in 5 minutes
                    'retrying'
                );

                -- Log error but don't fail the transaction
                RAISE WARNING 'Failed to send new booking notification for booking %. Status: %. Will retry.',
                    NEW.id,
                    COALESCE(http_response.status_code::text, 'timeout');
            END IF;

        EXCEPTION
            WHEN OTHERS THEN
                -- Log exception for retry mechanism
                INSERT INTO webhook_failures (
                    booking_id,
                    webhook_type,
                    recipient_email,
                    last_error,
                    next_retry_at,
                    status
                ) VALUES (
                    NEW.id,
                    'new_request',
                    tutor_email,
                    SQLERRM,
                    NOW() + INTERVAL '5 minutes',
                    'retrying'
                );

                -- Log error but don't fail the booking creation
                RAISE WARNING 'Exception sending new booking notification for booking %: %. Will retry.',
                    NEW.id,
                    SQLERRM;
        END;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Enhanced function for status update notifications with error handling
CREATE OR REPLACE FUNCTION notify_status_update()
RETURNS TRIGGER AS $$
DECLARE
    student_email TEXT;
    notification_type TEXT;
    http_response RECORD;
BEGIN
    -- Only proceed if status actually changed and is approved or rejected
    IF OLD.status IS DISTINCT FROM NEW.status
       AND NEW.status IN ('approved', 'rejected') THEN

        -- Get student email from user_profiles
        SELECT email INTO student_email
        FROM user_profiles
        WHERE id = NEW.student_id;

        -- Determine notification type based on status
        notification_type := NEW.status;

        -- Only send notification if student email exists
        IF student_email IS NOT NULL THEN
            BEGIN
                -- Invoke Edge Function to send notification
                SELECT * INTO http_response
                FROM net.http_post(
                    url := current_setting('app.settings.supabase_url') || '/functions/v1/send-booking-notification',
                    headers := jsonb_build_object(
                        'Content-Type', 'application/json',
                        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key')
                    ),
                    body := jsonb_build_object(
                        'type', notification_type,
                        'bookingId', NEW.id::text,
                        'recipientEmail', student_email
                    ),
                    timeout_milliseconds := 10000  -- 10 second timeout
                );

                -- Check if request failed (status not 2xx)
                IF http_response.status_code IS NULL OR http_response.status_code >= 300 THEN
                    -- Log failure for retry mechanism
                    INSERT INTO webhook_failures (
                        booking_id,
                        webhook_type,
                        recipient_email,
                        last_error,
                        next_retry_at,
                        status
                    ) VALUES (
                        NEW.id,
                        notification_type,
                        student_email,
                        'HTTP ' || COALESCE(http_response.status_code::text, 'timeout'),
                        NOW() + INTERVAL '5 minutes',  -- First retry in 5 minutes
                        'retrying'
                    );

                    -- Log error but don't fail the transaction
                    RAISE WARNING 'Failed to send status update notification for booking %. Status: %. Will retry.',
                        NEW.id,
                        COALESCE(http_response.status_code::text, 'timeout');
                END IF;

            EXCEPTION
                WHEN OTHERS THEN
                    -- Log exception for retry mechanism
                    INSERT INTO webhook_failures (
                        booking_id,
                        webhook_type,
                        recipient_email,
                        last_error,
                        next_retry_at,
                        status
                    ) VALUES (
                        NEW.id,
                        notification_type,
                        student_email,
                        SQLERRM,
                        NOW() + INTERVAL '5 minutes',
                        'retrying'
                    );

                    -- Log error but don't fail the status update
                    RAISE WARNING 'Exception sending status update notification for booking %: %. Will retry.',
                        NEW.id,
                        SQLERRM;
            END;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ========================================================================
-- Webhook Retry Function (Manual or Scheduled Execution)
-- ========================================================================

-- Function to retry failed webhooks with exponential backoff
CREATE OR REPLACE FUNCTION retry_failed_webhooks()
RETURNS TABLE(
    retried_count INTEGER,
    succeeded_count INTEGER,
    failed_count INTEGER
) AS $$
DECLARE
    v_failure RECORD;
    v_http_response RECORD;
    v_retried INTEGER := 0;
    v_succeeded INTEGER := 0;
    v_failed INTEGER := 0;
    v_next_retry TIMESTAMPTZ;
BEGIN
    -- Process all failures that are ready for retry
    FOR v_failure IN
        SELECT *
        FROM webhook_failures
        WHERE status = 'retrying'
        AND next_retry_at <= NOW()
        AND attempt_count < max_retries
        ORDER BY next_retry_at
        LIMIT 100  -- Process max 100 at a time
    LOOP
        BEGIN
            -- Attempt to send the webhook
            SELECT * INTO v_http_response
            FROM net.http_post(
                url := current_setting('app.settings.supabase_url') || '/functions/v1/send-booking-notification',
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key')
                ),
                body := jsonb_build_object(
                    'type', v_failure.webhook_type,
                    'bookingId', v_failure.booking_id::text,
                    'recipientEmail', v_failure.recipient_email
                ),
                timeout_milliseconds := 10000
            );

            v_retried := v_retried + 1;

            -- Check if successful
            IF v_http_response.status_code >= 200 AND v_http_response.status_code < 300 THEN
                -- Mark as succeeded
                UPDATE webhook_failures
                SET
                    status = 'succeeded',
                    resolved_at = NOW(),
                    attempt_count = attempt_count + 1
                WHERE id = v_failure.id;

                v_succeeded := v_succeeded + 1;

                RAISE NOTICE 'Successfully retried webhook for booking %', v_failure.booking_id;
            ELSE
                -- Calculate next retry time with exponential backoff
                -- 5 min, 15 min, 45 min (total ~1 hour of retries)
                v_next_retry := NOW() + (POWER(3, v_failure.attempt_count) * INTERVAL '5 minutes');

                -- Update failure record
                UPDATE webhook_failures
                SET
                    attempt_count = attempt_count + 1,
                    last_error = 'HTTP ' || v_http_response.status_code::text,
                    last_attempt_at = NOW(),
                    next_retry_at = CASE
                        WHEN attempt_count + 1 >= max_retries THEN NULL
                        ELSE v_next_retry
                    END,
                    status = CASE
                        WHEN attempt_count + 1 >= max_retries THEN 'failed'
                        ELSE 'retrying'
                    END,
                    resolved_at = CASE
                        WHEN attempt_count + 1 >= max_retries THEN NOW()
                        ELSE NULL
                    END
                WHERE id = v_failure.id;

                IF v_failure.attempt_count + 1 >= v_failure.max_retries THEN
                    v_failed := v_failed + 1;
                    RAISE WARNING 'Webhook permanently failed for booking % after % attempts',
                        v_failure.booking_id,
                        v_failure.max_retries;
                END IF;
            END IF;

        EXCEPTION
            WHEN OTHERS THEN
                -- Handle exceptions during retry
                v_next_retry := NOW() + (POWER(3, v_failure.attempt_count) * INTERVAL '5 minutes');

                UPDATE webhook_failures
                SET
                    attempt_count = attempt_count + 1,
                    last_error = SQLERRM,
                    last_attempt_at = NOW(),
                    next_retry_at = CASE
                        WHEN attempt_count + 1 >= max_retries THEN NULL
                        ELSE v_next_retry
                    END,
                    status = CASE
                        WHEN attempt_count + 1 >= max_retries THEN 'failed'
                        ELSE 'retrying'
                    END,
                    resolved_at = CASE
                        WHEN attempt_count + 1 >= max_retries THEN NOW()
                        ELSE NULL
                    END
                WHERE id = v_failure.id;

                IF v_failure.attempt_count + 1 >= v_failure.max_retries THEN
                    v_failed := v_failed + 1;
                END IF;

                RAISE WARNING 'Exception retrying webhook for booking %: %',
                    v_failure.booking_id,
                    SQLERRM;
        END;
    END LOOP;

    -- Return statistics
    RETURN QUERY SELECT v_retried, v_succeeded, v_failed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION retry_failed_webhooks() IS 'Task 20.4: Retries failed webhooks with exponential backoff strategy';


-- ========================================================================
-- RLS Policies for webhook_failures table
-- ========================================================================

ALTER TABLE webhook_failures ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role has full access to webhook_failures"
    ON webhook_failures
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Authenticated users can view failures for their own bookings
CREATE POLICY "Users can view their own webhook failures"
    ON webhook_failures
    FOR SELECT
    TO authenticated
    USING (
        booking_id IN (
            SELECT id FROM booking_requests
            WHERE student_id = auth.uid() OR tutor_id = auth.uid()
        )
    );

GRANT SELECT ON webhook_failures TO authenticated;
GRANT ALL ON webhook_failures TO service_role;


-- ========================================================================
-- Monitoring Views
-- ========================================================================

-- View for webhook health monitoring
CREATE OR REPLACE VIEW webhook_health_stats AS
SELECT
    webhook_type,
    status,
    COUNT(*) as count,
    AVG(attempt_count) as avg_attempts,
    MAX(last_attempt_at) as last_attempt
FROM webhook_failures
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY webhook_type, status
ORDER BY webhook_type, status;

COMMENT ON VIEW webhook_health_stats IS 'Task 20.4: Webhook health monitoring statistics for the last 24 hours';

-- Grant access to the view
GRANT SELECT ON webhook_health_stats TO authenticated;
GRANT SELECT ON webhook_health_stats TO service_role;
