-- Add tracking tables for the application

-- Create trackable_links table
CREATE TABLE IF NOT EXISTS trackable_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  original_url TEXT NOT NULL,
  short_code VARCHAR(10) NOT NULL UNIQUE,
  title VARCHAR(255),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create clicks table
CREATE TABLE IF NOT EXISTS clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  short_code VARCHAR(10) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create calls table (for Calendly bookings)
CREATE TABLE IF NOT EXISTS calls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  short_code VARCHAR(10) NOT NULL,
  event_id TEXT,
  calendly_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sales table
CREATE TABLE IF NOT EXISTS sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  short_code VARCHAR(10) NOT NULL,
  amount DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'USD',
  payment_method TEXT,
  customer_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trackable_links_user_id ON trackable_links(user_id);
CREATE INDEX IF NOT EXISTS idx_trackable_links_short_code ON trackable_links(short_code);
CREATE INDEX IF NOT EXISTS idx_clicks_short_code ON clicks(short_code);
CREATE INDEX IF NOT EXISTS idx_calls_short_code ON calls(short_code);
CREATE INDEX IF NOT EXISTS idx_sales_short_code ON sales(short_code);

-- Add RLS policies
ALTER TABLE trackable_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage their own links" ON trackable_links;
DROP POLICY IF EXISTS "Users can view clicks for their links" ON clicks;
DROP POLICY IF EXISTS "Users can view calls for their links" ON calls;
DROP POLICY IF EXISTS "Users can view sales for their links" ON sales;
DROP POLICY IF EXISTS "Service role can manage all tracking data" ON trackable_links;
DROP POLICY IF EXISTS "Service role can manage all tracking data" ON clicks;
DROP POLICY IF EXISTS "Service role can manage all tracking data" ON calls;
DROP POLICY IF EXISTS "Service role can manage all tracking data" ON sales;

-- Users can manage their own trackable links
CREATE POLICY "Users can manage their own links"
  ON trackable_links
  FOR ALL
  USING (auth.uid()::text = user_id);

-- Users can view clicks for their links
CREATE POLICY "Users can view clicks for their links"
  ON clicks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trackable_links 
      WHERE trackable_links.short_code = clicks.short_code 
      AND trackable_links.user_id = auth.uid()::text
    )
  );

-- Users can view calls for their links
CREATE POLICY "Users can view calls for their links"
  ON calls
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trackable_links 
      WHERE trackable_links.short_code = calls.short_code 
      AND trackable_links.user_id = auth.uid()::text
    )
  );

-- Users can view sales for their links
CREATE POLICY "Users can view sales for their links"
  ON sales
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trackable_links 
      WHERE trackable_links.short_code = sales.short_code 
      AND trackable_links.user_id = auth.uid()::text
    )
  );

-- Service role can manage all tracking data
CREATE POLICY "Service role can manage all tracking data"
  ON trackable_links
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage all tracking data"
  ON clicks
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage all tracking data"
  ON calls
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage all tracking data"
  ON sales
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true); 