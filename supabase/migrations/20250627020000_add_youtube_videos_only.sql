-- Create youtube_videos table to store video metadata
CREATE TABLE IF NOT EXISTS youtube_videos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    youtube_video_id VARCHAR(255) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    published_at TIMESTAMP WITH TIME ZONE,
    view_count INTEGER,
    like_count INTEGER,
    comment_count INTEGER,
    duration VARCHAR(50),
    channel_id VARCHAR(255) NOT NULL,
    channel_title VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, youtube_video_id)
);

-- Add index for efficient querying (only if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_youtube_videos_user_id') THEN
        CREATE INDEX idx_youtube_videos_user_id ON youtube_videos(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_youtube_videos_published_at') THEN
        CREATE INDEX idx_youtube_videos_published_at ON youtube_videos(published_at DESC);
    END IF;
END $$;

-- Add youtube_video_id column to trackable_links table (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trackable_links' AND column_name = 'youtube_video_id') THEN
        ALTER TABLE trackable_links ADD COLUMN youtube_video_id UUID REFERENCES youtube_videos(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add index for the foreign key (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_trackable_links_youtube_video_id') THEN
        CREATE INDEX idx_trackable_links_youtube_video_id ON trackable_links(youtube_video_id);
    END IF;
END $$;

-- Enable RLS (only if not already enabled)
ALTER TABLE youtube_videos ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for youtube_videos (only if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'youtube_videos' AND policyname = 'Users can view their own youtube videos') THEN
        CREATE POLICY "Users can view their own youtube videos" ON youtube_videos
            FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'youtube_videos' AND policyname = 'Users can insert their own youtube videos') THEN
        CREATE POLICY "Users can insert their own youtube videos" ON youtube_videos
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'youtube_videos' AND policyname = 'Users can update their own youtube videos') THEN
        CREATE POLICY "Users can update their own youtube videos" ON youtube_videos
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'youtube_videos' AND policyname = 'Users can delete their own youtube videos') THEN
        CREATE POLICY "Users can delete their own youtube videos" ON youtube_videos
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$; 