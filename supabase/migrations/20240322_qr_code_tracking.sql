-- Add new columns to qr_codes table if they don't exist
DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE qr_codes ADD COLUMN click_count INTEGER DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;

    BEGIN
        ALTER TABLE qr_codes ADD COLUMN last_clicked TIMESTAMP WITH TIME ZONE;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;

    BEGIN
        ALTER TABLE qr_codes ADD COLUMN redirect_id UUID DEFAULT gen_random_uuid();
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;

    BEGIN
        ALTER TABLE qr_codes ADD COLUMN original_url TEXT;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
END $$;

-- Copy existing URLs to original_url if it's empty
UPDATE qr_codes SET original_url = url WHERE original_url IS NULL;

-- Create clicks tracking table
CREATE TABLE IF NOT EXISTS qr_code_clicks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    qr_code_id UUID REFERENCES qr_codes(id) ON DELETE CASCADE,
    clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address TEXT,
    user_agent TEXT,
    country TEXT,
    city TEXT
);

-- Create function to update click count if it doesn't exist
CREATE OR REPLACE FUNCTION increment_click_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE qr_codes
    SET 
        click_count = click_count + 1,
        last_clicked = NEW.clicked_at
    WHERE id = NEW.qr_code_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_click_count ON qr_code_clicks;

-- Create trigger for click count
CREATE TRIGGER update_click_count
AFTER INSERT ON qr_code_clicks
FOR EACH ROW
EXECUTE FUNCTION increment_click_count();

-- Enable Row Level Security for clicks table
ALTER TABLE qr_code_clicks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own QR code clicks" ON qr_code_clicks;
DROP POLICY IF EXISTS "Public can insert clicks" ON qr_code_clicks;
DROP POLICY IF EXISTS "Public can read QR codes for redirect" ON qr_codes;

-- Create policies for clicks table
CREATE POLICY "Users can view their own QR code clicks"
ON qr_code_clicks
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM qr_codes
        WHERE qr_codes.id = qr_code_clicks.qr_code_id
        AND qr_codes.clerk_user_id = auth.uid()::text
    )
);

-- Allow public insertion of clicks
CREATE POLICY "Public can insert clicks"
ON qr_code_clicks
FOR INSERT
WITH CHECK (true);

-- Allow public to read QR codes for redirect
CREATE POLICY "Public can read QR codes for redirect"
ON qr_codes
FOR SELECT
USING (true); 