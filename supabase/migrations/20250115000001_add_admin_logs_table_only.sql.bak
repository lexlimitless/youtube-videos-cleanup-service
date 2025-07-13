-- Create admin_logs table for tracking administrative operations
CREATE TABLE IF NOT EXISTS admin_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_admin_logs_user_id ON admin_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON admin_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at DESC);

-- Enable RLS
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only view their own admin logs
CREATE POLICY "Users can view their own admin logs"
    ON admin_logs
    FOR SELECT
    USING (auth.uid()::text = user_id);

-- Users can insert their own admin logs
CREATE POLICY "Users can insert their own admin logs"
    ON admin_logs
    FOR INSERT
    WITH CHECK (auth.uid()::text = user_id);

-- Service role can manage all admin logs
CREATE POLICY "Service role can manage all admin logs"
    ON admin_logs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Add comment to table
COMMENT ON TABLE admin_logs IS 'Table for tracking administrative operations like cleanup tasks';
COMMENT ON COLUMN admin_logs.action IS 'The type of administrative action performed';
COMMENT ON COLUMN admin_logs.details IS 'JSON object containing action-specific details and results'; 