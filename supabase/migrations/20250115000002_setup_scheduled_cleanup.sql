-- Enable the pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a function to call the Edge Function
CREATE OR REPLACE FUNCTION trigger_youtube_cleanup()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    response_status INTEGER;
    response_body TEXT;
BEGIN
    -- Call the Edge Function using http_post
    SELECT status, content INTO response_status, response_body
    FROM net.http_post(
        url := 'https://ivwmbyptulpwbdpghamp.supabase.co/functions/v1/cleanup-youtube-videos',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}',
        body := '{"removeUnreferenced": true, "maxAgeDays": 90, "staleFetchDays": 30, "inactiveUserDays": 180, "removeDisconnected": true, "dryRun": false}'
    );
    
    -- Log the result
    INSERT INTO admin_logs (user_id, action, details, created_at)
    VALUES (
        'system',
        'scheduled_youtube_cleanup',
        jsonb_build_object(
            'response_status', response_status,
            'response_body', response_body,
            'scheduled_at', now(),
            'cleanup_options', '{"removeUnreferenced": true, "maxAgeDays": 90, "staleFetchDays": 30, "inactiveUserDays": 180, "removeDisconnected": true}'
        ),
        now()
    );
    
    -- Raise notice for monitoring
    RAISE NOTICE 'YouTube cleanup scheduled run completed. Status: %, Response: %', response_status, response_body;
    
EXCEPTION WHEN OTHERS THEN
    -- Log any errors
    INSERT INTO admin_logs (user_id, action, details, created_at)
    VALUES (
        'system',
        'scheduled_youtube_cleanup_error',
        jsonb_build_object(
            'error', SQLERRM,
            'error_detail', SQLSTATE,
            'scheduled_at', now()
        ),
        now()
    );
    
    RAISE NOTICE 'YouTube cleanup scheduled run failed: %', SQLERRM;
END;
$$;

-- Schedule the cleanup to run every Sunday at 3 AM UTC
SELECT cron.schedule(
    'youtube-videos-cleanup-sunday-3am',
    '0 3 * * 0', -- Every Sunday at 3 AM UTC
    'SELECT trigger_youtube_cleanup();'
);

-- Also create a test function that can be called manually
CREATE OR REPLACE FUNCTION test_youtube_cleanup()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Call the Edge Function with dry run for testing
    PERFORM net.http_post(
        url := 'https://ivwmbyptulpwbdpghamp.supabase.co/functions/v1/cleanup-youtube-videos',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}',
        body := '{"removeUnreferenced": true, "maxAgeDays": 90, "staleFetchDays": 30, "inactiveUserDays": 180, "removeDisconnected": true, "dryRun": true}'
    );
    
    RAISE NOTICE 'Test cleanup run initiated (dry run mode)';
END;
$$;

-- Add comments for documentation
COMMENT ON FUNCTION trigger_youtube_cleanup() IS 'Triggers the YouTube videos cleanup Edge Function with production settings';
COMMENT ON FUNCTION test_youtube_cleanup() IS 'Test function to trigger cleanup in dry run mode'; 