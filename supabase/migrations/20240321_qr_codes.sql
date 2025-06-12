-- Create QR codes table if it doesn't exist
CREATE TABLE IF NOT EXISTS qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL DEFAULT '',
  original_url TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own QR codes" ON qr_codes;
DROP POLICY IF EXISTS "Users can insert their own QR codes" ON qr_codes;
DROP POLICY IF EXISTS "Users can update their own QR codes" ON qr_codes;
DROP POLICY IF EXISTS "Users can delete their own QR codes" ON qr_codes;
DROP POLICY IF EXISTS "Public can read QR codes for redirect" ON qr_codes;
DROP POLICY IF EXISTS "Public can insert clicks" ON qr_code_clicks;

-- Create policies for QR codes
CREATE POLICY "Users can view their own QR codes"
ON qr_codes FOR SELECT
TO authenticated
USING (clerk_user_id = auth.uid()::text);

CREATE POLICY "Users can insert their own QR codes"
ON qr_codes FOR INSERT
TO authenticated
WITH CHECK (clerk_user_id = auth.uid()::text);

CREATE POLICY "Users can update their own QR codes"
ON qr_codes FOR UPDATE
TO authenticated
USING (clerk_user_id = auth.uid()::text)
WITH CHECK (clerk_user_id = auth.uid()::text);

CREATE POLICY "Users can delete their own QR codes"
ON qr_codes FOR DELETE
TO authenticated
USING (clerk_user_id = auth.uid()::text);

-- Important: Allow public read access for redirects
CREATE POLICY "Public can read QR codes for redirect"
ON qr_codes FOR SELECT
TO anon
USING (true);  -- This allows public read access, which is needed for redirects

-- Create policy for click tracking
CREATE POLICY "Public can insert clicks"
ON qr_code_clicks FOR INSERT
TO anon
WITH CHECK (true);  -- Allow public insertion of clicks

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_qr_codes_updated_at
    BEFORE UPDATE ON qr_codes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 