-- 20240709_alter_youtube_videos_user_id_to_text.sql

-- 1. Drop the foreign key constraint
ALTER TABLE youtube_videos DROP CONSTRAINT IF EXISTS youtube_videos_user_id_fkey;

-- 2. Drop the existing RLS policy
DROP POLICY IF EXISTS "Users can view their own youtube videos" ON youtube_videos;

-- 3. Alter the user_id column to TEXT
ALTER TABLE youtube_videos ALTER COLUMN user_id TYPE TEXT;

-- 4. Recreate the RLS policy for Clerk user IDs (TEXT)
CREATE POLICY "Users can view their own youtube videos"
  ON youtube_videos
  FOR SELECT
  USING (user_id = auth.uid());

-- 5. (Optional) If you have INSERT/UPDATE/DELETE policies, recreate them as well:
-- Example for INSERT:
-- CREATE POLICY "Users can insert their own youtube videos"
--   ON youtube_videos
--   FOR INSERT
--   WITH CHECK (user_id = auth.uid());

-- Example for UPDATE:
-- CREATE POLICY "Users can update their own youtube videos"
--   ON youtube_videos
--   FOR UPDATE
--   USING (user_id = auth.uid());

-- Example for DELETE:
-- CREATE POLICY "Users can delete their own youtube videos"
--   ON youtube_videos
--   FOR DELETE
--   USING (user_id = auth.uid()); 