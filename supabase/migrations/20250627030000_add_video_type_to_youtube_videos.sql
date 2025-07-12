-- Add video_type column to youtube_videos table
ALTER TABLE youtube_videos 
ADD COLUMN video_type TEXT DEFAULT 'video';

-- Add index for better performance when filtering by video type
CREATE INDEX idx_youtube_videos_video_type ON youtube_videos(video_type); 