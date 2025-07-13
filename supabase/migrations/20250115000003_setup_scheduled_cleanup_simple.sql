-- Enable the pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a function to log scheduled cleanup attempts
CREATE OR REPLACE FUNCTION log_scheduled_cleanup_attempt()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Log the scheduled cleanup attempt
    INSERT INTO admin_logs (user_id, action, details, created_at)
    VALUES (
        'system',
        'scheduled_youtube_cleanup_triggered',
        jsonb_build_object(
            'scheduled_at', now(),
            'cleanup_options', '{"removeUnreferenced": true, "maxAgeDays": 90, "staleFetchDays": 30, "inactiveUserDays": 180, "removeDisconnected": true}',
            'note', 'This is a scheduled trigger. The actual cleanup should be called via external cron job or Edge Function trigger.'
        ),
        now()
    );
    
    RAISE NOTICE 'Scheduled YouTube cleanup trigger logged at %', now();
END;
$$;

-- Schedule the logging function to run every Sunday at 3 AM UTC
SELECT cron.schedule(
    'youtube-videos-cleanup-sunday-3am',
    '0 3 * * 0', -- Every Sunday at 3 AM UTC
    'SELECT log_scheduled_cleanup_attempt();'
);

-- Create a function to manually trigger cleanup (for testing)
CREATE OR REPLACE FUNCTION manual_trigger_cleanup()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Log the manual trigger
    INSERT INTO admin_logs (user_id, action, details, created_at)
    VALUES (
        'system',
        'manual_youtube_cleanup_triggered',
        jsonb_build_object(
            'triggered_at', now(),
            'note', 'Manual cleanup trigger. Use external cron job to call the Edge Function.'
        ),
        now()
    );
    
    RAISE NOTICE 'Manual cleanup trigger logged. Call the Edge Function manually or set up external cron job.';
END;
$$;

-- Add comments for documentation
COMMENT ON FUNCTION log_scheduled_cleanup_attempt() IS 'Logs scheduled cleanup attempts (internal trigger)';
COMMENT ON FUNCTION manual_trigger_cleanup() IS 'Manual trigger for cleanup (for testing)'; 