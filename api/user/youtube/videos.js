import { createClient } from '@supabase/supabase-js';
import { withAuth } from '../../../src/middleware/auth.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function refreshYouTubeToken(refreshToken) {
  const params = new URLSearchParams({
    client_id: process.env.YOUTUBE_CLIENT_ID,
    client_secret: process.env.YOUTUBE_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  if (!response.ok) {
    throw new Error('Failed to refresh YouTube token');
  }

  return await response.json(); // contains access_token, expires_in, etc.
}

async function handler(req, res) {
  const { userId } = req.auth;
  console.log('YouTube Videos API - userId:', userId);

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
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

    console.log('YouTube Videos API - integration:', integration);
    console.log('YouTube Videos API - integrationError:', integrationError);

    if (integrationError || !integration) {
      return res.status(400).json({ 
        error: 'YouTube integration not connected',
        message: 'Please connect your YouTube account in the Integrations page to view your videos.'
      });
    }

    // --- Token refresh logic ---
    const now = new Date();
    let accessToken = integration.provider_access_token;
    let expiresAt = integration.provider_token_expires_at ? new Date(integration.provider_token_expires_at) : null;

    // If token is expired or about to expire in the next 2 minutes
    if (!accessToken || (expiresAt && expiresAt < new Date(now.getTime() + 2 * 60 * 1000))) {
      if (!integration.provider_refresh_token) {
        return res.status(400).json({
          error: 'YouTube refresh token missing',
          message: 'Please reconnect your YouTube account in the Integrations page.'
        });
      }
      try {
        const tokenData = await refreshYouTubeToken(integration.provider_refresh_token);
        accessToken = tokenData.access_token;
        expiresAt = new Date(now.getTime() + tokenData.expires_in * 1000);

        // Update DB
        await supabase
          .from('user_integrations')
          .update({
            provider_access_token: accessToken,
            provider_token_expires_at: expiresAt.toISOString(),
          })
          .eq('user_id', userId)
          .eq('provider', 'youtube');
        console.log('YouTube Videos API - token refreshed');
      } catch (err) {
        console.error('YouTube Videos API - token refresh failed:', err);
        return res.status(400).json({
          error: 'YouTube token refresh failed',
          message: 'Please reconnect your YouTube account in the Integrations page.'
        });
      }
    }

    // --- Use accessToken for YouTube API calls ---
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

    let youtubeResponse = await fetch(`${youtubeApiUrl}?${params}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    // If unauthorized, try refreshing once more
    if (youtubeResponse.status === 401 && integration.provider_refresh_token) {
      try {
        const tokenData = await refreshYouTubeToken(integration.provider_refresh_token);
        accessToken = tokenData.access_token;
        expiresAt = new Date(now.getTime() + tokenData.expires_in * 1000);
        await supabase
          .from('user_integrations')
          .update({
            provider_access_token: accessToken,
            provider_token_expires_at: expiresAt.toISOString(),
          })
          .eq('user_id', userId)
          .eq('provider', 'youtube');
        youtubeResponse = await fetch(`${youtubeApiUrl}?${params}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });
        console.log('YouTube Videos API - token refreshed after 401');
      } catch (err) {
        console.error('YouTube Videos API - token refresh after 401 failed:', err);
        return res.status(400).json({
          error: 'YouTube token refresh failed after 401',
          message: 'Please reconnect your YouTube account in the Integrations page.'
        });
      }
    }

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
        'Authorization': `Bearer ${accessToken}`,
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
}

export default withAuth(handler); 