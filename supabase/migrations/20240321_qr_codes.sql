-- Create QR codes table
CREATE TABLE IF NOT EXISTS qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;

-- Create policies for Row Level Security
CREATE POLICY "Users can create their own QR codes"
ON qr_codes FOR INSERT
WITH CHECK (clerk_user_id = current_setting('app.clerk_user_id', TRUE));

CREATE POLICY "Users can view their own QR codes"
ON qr_codes FOR SELECT
USING (clerk_user_id = current_setting('app.clerk_user_id', TRUE));

CREATE POLICY "Users can update their own QR codes"
ON qr_codes FOR UPDATE
USING (clerk_user_id = current_setting('app.clerk_user_id', TRUE))
WITH CHECK (clerk_user_id = current_setting('app.clerk_user_id', TRUE));

CREATE POLICY "Users can delete their own QR codes"
ON qr_codes FOR DELETE
USING (clerk_user_id = current_setting('app.clerk_user_id', TRUE));

-- Create function to handle updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_qr_codes_updated_at
    BEFORE UPDATE ON qr_codes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 