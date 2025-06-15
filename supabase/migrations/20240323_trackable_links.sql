-- Create links table
CREATE TABLE IF NOT EXISTS links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  short_code TEXT UNIQUE NOT NULL,
  destination_url TEXT NOT NULL,
  title TEXT,
  platform TEXT CHECK (platform IN ('YouTube', 'Instagram')),
  attribution_window_days INTEGER DEFAULT 7,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create clicks table
CREATE TABLE IF NOT EXISTS clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_code TEXT REFERENCES links(short_code),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT,
  location TEXT,
  session_id TEXT
);

-- Create calls table
CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_code TEXT REFERENCES links(short_code),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  event_id TEXT,
  calendly_email TEXT
);

-- Create sales table
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_code TEXT REFERENCES links(short_code),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  amount NUMERIC,
  currency TEXT,
  stripe_customer_id TEXT
);

-- Enable Row Level Security
ALTER TABLE links ENABLE ROW LEVEL SECURITY;
ALTER TABLE clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Create policies for links table
CREATE POLICY "Users can view their own links"
ON links FOR SELECT
USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can insert their own links"
ON links FOR INSERT
WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can update their own links"
ON links FOR UPDATE
USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can delete their own links"
ON links FOR DELETE
USING (user_id::text = auth.uid()::text);

-- Create policies for clicks table
CREATE POLICY "Users can view clicks for their links"
ON clicks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM links
    WHERE links.short_code = clicks.short_code
    AND links.user_id::text = auth.uid()::text
  )
);

CREATE POLICY "Public can insert clicks"
ON clicks FOR INSERT
WITH CHECK (true);

-- Create policies for calls table
CREATE POLICY "Users can view calls for their links"
ON calls FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM links
    WHERE links.short_code = calls.short_code
    AND links.user_id::text = auth.uid()::text
  )
);

CREATE POLICY "Public can insert calls"
ON calls FOR INSERT
WITH CHECK (true);

-- Create policies for sales table
CREATE POLICY "Users can view sales for their links"
ON sales FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM links
    WHERE links.short_code = sales.short_code
    AND links.user_id::text = auth.uid()::text
  )
);

CREATE POLICY "Public can insert sales"
ON sales FOR INSERT
WITH CHECK (true);

-- Create function to generate short code
CREATE OR REPLACE FUNCTION generate_short_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
BEGIN
  LOOP
    new_code := floor(random() * 10000)::TEXT;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM links WHERE short_code = new_code);
  END LOOP;
  RETURN new_code;
END;
$$ LANGUAGE plpgsql; 