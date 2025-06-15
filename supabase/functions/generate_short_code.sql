-- Create function to generate short code
CREATE OR REPLACE FUNCTION public.generate_short_code()
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