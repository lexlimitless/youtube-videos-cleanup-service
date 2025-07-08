-- Add fields needed for OAuth integrations (YouTube, Calendly, etc.)
-- Only add fields that don't already exist to avoid conflicts

-- Add provider-specific fields to user_integrations table
ALTER TABLE user_integrations 
ADD COLUMN IF NOT EXISTS provider_access_token TEXT,
ADD COLUMN IF NOT EXISTS provider_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS provider_token_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS webhook_id TEXT,
ADD COLUMN IF NOT EXISTS provider_user_id TEXT,
ADD COLUMN IF NOT EXISTS provider_channel_id TEXT,
ADD COLUMN IF NOT EXISTS provider_channel_title TEXT,
ADD COLUMN IF NOT EXISTS provider_channel_description TEXT,
ADD COLUMN IF NOT EXISTS provider_channel_thumbnail TEXT;

-- Create a youtube_accounts table for storing YouTube-specific data
CREATE TABLE IF NOT EXISTS youtube_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  channel_id TEXT NOT NULL UNIQUE,
  channel_title TEXT,
  channel_description TEXT,
  channel_thumbnail TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  is_connected BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trigger to update updated_at for youtube_accounts
CREATE OR REPLACE FUNCTION update_youtube_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_youtube_accounts_updated_at
  BEFORE UPDATE ON youtube_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_youtube_accounts_updated_at();

-- Add RLS policies for youtube_accounts
ALTER TABLE youtube_accounts ENABLE ROW LEVEL SECURITY;

-- Users can only access their own YouTube accounts
CREATE POLICY "Users can manage their own YouTube accounts"
  ON youtube_accounts
  FOR ALL
  USING (auth.uid()::text = user_id);

-- Service role can manage all YouTube accounts
CREATE POLICY "Service role can manage all YouTube accounts"
  ON youtube_accounts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_youtube_accounts_user_id ON youtube_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_youtube_accounts_channel_id ON youtube_accounts(channel_id); 