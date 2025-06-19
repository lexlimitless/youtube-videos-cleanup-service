ALTER TABLE webhook_status ADD COLUMN user_id TEXT;

-- Assuming a default user or handle existing rows appropriately
-- For example, you might want to associate existing rows with a specific user
-- or handle them based on your application's logic.
-- This example leaves the user_id as NULL for existing rows,
-- which you should update manually if needed.

-- Make user_id and provider unique together
ALTER TABLE webhook_status DROP CONSTRAINT IF EXISTS webhook_status_provider_key;
ALTER TABLE webhook_status ADD CONSTRAINT webhook_status_user_id_provider_key UNIQUE (user_id, provider);

-- Add foreign key constraint to users table if it exists and is appropriate
-- ALTER TABLE webhook_status ADD CONSTRAINT fk_user
--   FOREIGN KEY(user_id) REFERENCES auth.users(id);

-- Update RLS policies to be user-specific
DROP POLICY IF EXISTS "Authenticated users can view webhook status" ON webhook_status;
DROP POLICY IF EXISTS "Service role can update webhook status" ON webhook_status;

CREATE POLICY "Users can view their own webhook status"
  ON webhook_status
  FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own webhook status"
  ON webhook_status
  FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own webhook status"
  ON webhook_status
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id); 