const { createClient } = require('@supabase/supabase-js');
const { getAuth } = require('@clerk/nextjs/server');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = await getAuth(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const pageToken = req.query.pageToken;
    const limit = req.query.limit ? parseInt(req.query.limit) : 15;

    // Check if user has YouTube integration
    const { data: integration, error: integrationError } = await supabase
      .from('user_integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'youtube')
      .eq('is_connected', true)
      .single();

    if (integrationError || !integration) {
      return res.status(400).json({ 
        error: 'YouTube integration not connected',
        message: 'Please connect your YouTube account in the Integrations page to view your videos.'
      });
    }

    // Check if access token is still valid
    if (!integration.provider_access_token || 
        (integration.provider_token_expires_at && new Date(integration.provider_token_expires_at) < new Date())) {
      return res.status(400).json({ 
        error: 'YouTube access token expired',
        message: 'Please reconnect your YouTube account in the Integrations page.'
      });
    }

    // Fetch videos from YouTube API
    const youtubeApiUrl = 'https://www.googleapis.com/youtube/v3/search';
    const params = new URLSearchParams({
      part: 'snippet',
      channelId: integration.provider_channel_id,
      order: 'date',
      type: 'video',
      maxResults: limit.toString(),
      key: process.env.YOUTUBE_API_KEY
    });

    if (pageToken) {
      params.append('pageToken', pageToken);
    }

    const youtubeResponse = await fetch(`${youtubeApiUrl}?${params}`, {
      headers: {
        'Authorization': `Bearer ${integration.provider_access_token}`,
      },
    });

    if (!youtubeResponse.ok) {
      let errorData = {};
      try { errorData = await youtubeResponse.json(); } catch (e) {}
      console.error('YouTube API error:', errorData);
      
      if (youtubeResponse.status === 401) {
        return res.status(400).json({ 
          error: 'YouTube access token invalid',
          message: 'Please reconnect your YouTube account in the Integrations page.'
        });
      }
      
      return res.status(500).json({ 
        error: 'Failed to fetch videos from YouTube',
        message: 'There was an error fetching your videos. Please try again later.'
      });
    }

    const youtubeData = await youtubeResponse.json();

    // Get video IDs for detailed information
    const videoIds = youtubeData.items.map(item => item.id.videoId).join(',');

    // Fetch detailed video information
    const videoDetailsUrl = 'https://www.googleapis.com/youtube/v3/videos';
    const videoParams = new URLSearchParams({
      part: 'snippet,statistics,contentDetails',
      id: videoIds,
      key: process.env.YOUTUBE_API_KEY
    });

    const videoDetailsResponse = await fetch(`${videoDetailsUrl}?${videoParams}`, {
      headers: {
        'Authorization': `Bearer ${integration.provider_access_token}`,
      },
    });

    if (!videoDetailsResponse.ok) {
      return res.status(500).json({ 
        error: 'Failed to fetch video details',
        message: 'There was an error fetching video details. Please try again later.'
      });
    }

    const videoDetailsData = await videoDetailsResponse.json();

    // Process and store videos in database
    const videos = videoDetailsData.items.map(video => ({
      user_id: userId,
      youtube_video_id: video.id,
      title: video.snippet.title,
      description: video.snippet.description,
      thumbnail_url: (video.snippet.thumbnails && video.snippet.thumbnails.high && video.snippet.thumbnails.high.url) || (video.snippet.thumbnails && video.snippet.thumbnails.medium && video.snippet.thumbnails.medium.url) || '',
      published_at: video.snippet.publishedAt,
      view_count: parseInt(video.statistics.viewCount) || 0,
      like_count: parseInt(video.statistics.likeCount) || 0,
      comment_count: parseInt(video.statistics.commentCount) || 0,
      duration: video.contentDetails.duration,
      channel_id: video.snippet.channelId,
      channel_title: video.snippet.channelTitle,
    }));

    // Upsert videos to database (update if exists, insert if not)
    const { error: upsertError } = await supabase
      .from('youtube_videos')
      .upsert(videos, { 
        onConflict: 'user_id,youtube_video_id',
        ignoreDuplicates: false 
      });

    if (upsertError) {
      console.error('Database upsert error:', upsertError);
      // Continue even if database update fails, return the data anyway
    }

    // Return formatted response
    const formattedVideos = videos.map(video => ({
      id: video.youtube_video_id,
      title: video.title,
      description: video.description,
      thumbnail_url: video.thumbnail_url,
      published_at: video.published_at,
      view_count: video.view_count,
      like_count: video.like_count,
      comment_count: video.comment_count,
      duration: video.duration,
      channel_id: video.channel_id,
      channel_title: video.channel_title,
    }));

    return res.status(200).json({
      videos: formattedVideos,
      nextPageToken: youtubeData.nextPageToken,
      hasMore: !!youtubeData.nextPageToken,
      totalResults: youtubeData.pageInfo && youtubeData.pageInfo.totalResults ? youtubeData.pageInfo.totalResults : 0,
    });

  } catch (error) {
    console.error('YouTube videos API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'An unexpected error occurred. Please try again later.'
    });
  }
}; 