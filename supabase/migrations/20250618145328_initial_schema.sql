-- Drop existing objects if they exist
DROP FUNCTION IF EXISTS update_user_integrations_updated_at();
DROP FUNCTION IF EXISTS update_webhook_status_updated_at();
DROP TABLE IF EXISTS user_integrations;
DROP TABLE IF EXISTS webhook_status;

-- Create user_integrations table
CREATE TABLE user_integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider VARCHAR NOT NULL,
  access_token TEXT,
  is_connected BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_user_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_integrations_updated_at
  BEFORE UPDATE ON user_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_user_integrations_updated_at();

-- Create webhook_status table
CREATE TABLE webhook_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider VARCHAR NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT false,
  last_checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trigger to update webhook_status updated_at
CREATE OR REPLACE FUNCTION update_webhook_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_webhook_status_updated_at
  BEFORE UPDATE ON webhook_status
  FOR EACH ROW
  EXECUTE FUNCTION update_webhook_status_updated_at();

-- Add RLS policies
ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_status ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own integrations" ON user_integrations;
DROP POLICY IF EXISTS "Users can update their own integrations" ON user_integrations;
DROP POLICY IF EXISTS "Authenticated users can view webhook status" ON webhook_status;
DROP POLICY IF EXISTS "Service role can update webhook status" ON webhook_status;

-- Users can only access their own integrations
CREATE POLICY "Users can view their own integrations"
  ON user_integrations
  FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own integrations"
  ON user_integrations
  FOR UPDATE
  USING (auth.uid()::text = user_id);

-- Webhook status can be accessed by authenticated users
CREATE POLICY "Authenticated users can view webhook status"
  ON webhook_status
  FOR SELECT
  TO authenticated
  USING (true);

-- Only service role can update webhook status
CREATE POLICY "Service role can update webhook status"
  ON webhook_status
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
