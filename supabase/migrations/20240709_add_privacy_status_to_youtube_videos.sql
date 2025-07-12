-- 20240709_add_privacy_status_to_youtube_videos.sql
-- Adds privacy_status column to youtube_videos for storing YouTube video privacy (public/private/unlisted)

ALTER TABLE youtube_videos ADD COLUMN IF NOT EXISTS privacy_status TEXT; 