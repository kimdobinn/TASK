-- Migration: Create database triggers for automatic email notifications
-- Task 17: New Booking Notification Function - Database trigger setup
-- Task 18: Status Update Notification Function - Database trigger setup
-- Created: 2024-11-14

-- ========================================================================
-- Task 17: Trigger for New Booking Requests
-- ========================================================================

-- Function to handle new booking notifications
CREATE OR REPLACE FUNCTION notify_new_booking()
RETURNS TRIGGER AS $$
DECLARE
    tutor_email TEXT;
BEGIN
    -- Get tutor email from user_profiles
    SELECT email INTO tutor_email
    FROM user_profiles
    WHERE id = NEW.tutor_id;

    -- Only send notification if tutor email exists
    IF tutor_email IS NOT NULL THEN
        -- Invoke Edge Function to send notification
        PERFORM net.http_post(
            url := current_setting('app.settings.supabase_url') || '/functions/v1/send-booking-notification',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key')
            ),
            body := jsonb_build_object(
                'type', 'new_request',
                'bookingId', NEW.id::text,
                'recipientEmail', tutor_email
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new booking requests
DROP TRIGGER IF EXISTS trigger_new_booking_notification ON booking_requests;
CREATE TRIGGER trigger_new_booking_notification
    AFTER INSERT ON booking_requests
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_booking();

COMMENT ON FUNCTION notify_new_booking() IS 'Task 17: Automatically send notification email to tutor when new booking request is created';
COMMENT ON TRIGGER trigger_new_booking_notification ON booking_requests IS 'Task 17: Triggers email notification to tutor for new booking requests';


-- ========================================================================
-- Task 18: Trigger for Booking Status Updates
-- ========================================================================

-- Function to handle booking status update notifications
CREATE OR REPLACE FUNCTION notify_status_update()
RETURNS TRIGGER AS $$
DECLARE
    student_email TEXT;
    notification_type TEXT;
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
            -- Invoke Edge Function to send notification
            PERFORM net.http_post(
                url := current_setting('app.settings.supabase_url') || '/functions/v1/send-booking-notification',
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key')
                ),
                body := jsonb_build_object(
                    'type', notification_type,
                    'bookingId', NEW.id::text,
                    'recipientEmail', student_email
                )
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for status updates
DROP TRIGGER IF EXISTS trigger_status_update_notification ON booking_requests;
CREATE TRIGGER trigger_status_update_notification
    AFTER UPDATE ON booking_requests
    FOR EACH ROW
    EXECUTE FUNCTION notify_status_update();

COMMENT ON FUNCTION notify_status_update() IS 'Task 18: Automatically send notification email to student when booking status changes to approved or rejected';
COMMENT ON TRIGGER trigger_status_update_notification ON booking_requests IS 'Task 18: Triggers email notification to student for booking status changes';


-- ========================================================================
-- Configuration Settings (need to be set via Supabase Dashboard or CLI)
-- ========================================================================

-- NOTE: The following settings need to be configured in your Supabase project:
--
-- 1. Enable the `http` extension (pg_net):
--    CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;
--
-- 2. Set the Supabase URL and anon key:
--    ALTER DATABASE postgres SET app.settings.supabase_url = 'https://your-project.supabase.co';
--    ALTER DATABASE postgres SET app.settings.supabase_anon_key = 'your-anon-key';
--
-- These are typically set automatically by Supabase, but if you encounter errors,
-- you may need to configure them manually via the dashboard.
