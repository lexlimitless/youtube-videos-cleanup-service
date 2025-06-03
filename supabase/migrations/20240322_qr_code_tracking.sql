-- Add new columns to qr_codes table
ALTER TABLE qr_codes
ADD COLUMN click_count INTEGER DEFAULT 0,
ADD COLUMN last_clicked TIMESTAMP WITH TIME ZONE,
ADD COLUMN redirect_id UUID DEFAULT gen_random_uuid(),
ADD COLUMN original_url TEXT;

-- Copy existing URLs to original_url
UPDATE qr_codes SET original_url = url;

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

-- Create function to update click count
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

-- Create trigger for click count
CREATE TRIGGER update_click_count
AFTER INSERT ON qr_code_clicks
FOR EACH ROW
EXECUTE FUNCTION increment_click_count();

-- Add RLS policies for clicks table
ALTER TABLE qr_code_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own QR code clicks"
ON qr_code_clicks
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM qr_codes
        WHERE qr_codes.id = qr_code_clicks.qr_code_id
        AND qr_codes.clerk_user_id = auth.uid()
    )
); 