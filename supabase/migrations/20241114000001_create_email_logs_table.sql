-- Migration: Create email_logs table for tracking email notifications
-- Task 17: New Booking Notification Function
-- Created: 2024-11-14

-- Create email_logs table
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES booking_requests(id) ON DELETE CASCADE,
    recipient_email TEXT NOT NULL,
    email_type TEXT NOT NULL CHECK (email_type IN ('new_request', 'approved', 'rejected', 'reminder')),
    message_id TEXT,
    status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'pending')),
    error_message TEXT,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_logs_booking_id ON email_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient_email ON email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);

-- Add comments for documentation
COMMENT ON TABLE email_logs IS 'Tracks all email notifications sent through the platform';
COMMENT ON COLUMN email_logs.booking_id IS 'Reference to the booking request that triggered this email';
COMMENT ON COLUMN email_logs.recipient_email IS 'Email address where the notification was sent';
COMMENT ON COLUMN email_logs.email_type IS 'Type of email notification (new_request, approved, rejected, reminder)';
COMMENT ON COLUMN email_logs.message_id IS 'Email provider message ID for tracking';
COMMENT ON COLUMN email_logs.status IS 'Current status of the email (sent, failed, pending)';
COMMENT ON COLUMN email_logs.error_message IS 'Error details if email sending failed';

-- Enable Row Level Security
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Service role can do anything (for Edge Functions)
CREATE POLICY "Service role has full access to email_logs"
    ON email_logs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Users can view their own email logs (students see their emails, tutors see theirs)
CREATE POLICY "Users can view their own email logs"
    ON email_logs
    FOR SELECT
    TO authenticated
    USING (
        recipient_email IN (
            SELECT email FROM auth.users WHERE id = auth.uid()
        )
    );

-- Grant necessary permissions
GRANT SELECT ON email_logs TO authenticated;
GRANT ALL ON email_logs TO service_role;
