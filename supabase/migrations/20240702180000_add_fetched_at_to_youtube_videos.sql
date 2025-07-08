-- Add fetched_at column to youtube_videos for caching
ALTER TABLE youtube_videos ADD COLUMN IF NOT EXISTS fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Backfill existing rows with current timestamp if needed
UPDATE youtube_videos SET fetched_at = NOW() WHERE fetched_at IS NULL; 