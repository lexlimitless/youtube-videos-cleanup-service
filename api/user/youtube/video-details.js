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

  return await response.json();
}

async function handler(req, res) {
  const { userId } = req.auth;
  console.log('YouTube Video Details API - userId:', userId);

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { videoId } = req.query;
  if (!videoId) {
    return res.status(400).json({ error: 'Video ID is required' });
  }

  try {
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
        message: 'Please connect your YouTube account in the Integrations page.'
      });
    }

    // Check if we already have detailed info in cache
    const { data: cachedVideo, error: cacheError } = await supabase
      .from('youtube_videos')
      .select('*')
      .eq('user_id', userId)
      .eq('youtube_video_id', videoId)
      .single();

    // If we have cached data with all details, return it
    if (!cacheError && cachedVideo && 
        cachedVideo.view_count !== null && 
        cachedVideo.like_count !== null && 
        cachedVideo.comment_count !== null && 
        cachedVideo.duration !== null && 
        cachedVideo.privacy_status !== null) {
      console.log('YouTube Video Details API - Returning cached detailed data for video:', videoId);
      return res.status(200).json({
        id: cachedVideo.youtube_video_id,
        title: cachedVideo.title,
        description: cachedVideo.description,
        thumbnail_url: cachedVideo.thumbnail_url,
        published_at: cachedVideo.published_at,
        view_count: cachedVideo.view_count,
        like_count: cachedVideo.like_count,
        comment_count: cachedVideo.comment_count,
        duration: cachedVideo.duration,
        channel_id: cachedVideo.channel_id,
        channel_title: cachedVideo.channel_title,
        privacyStatus: cachedVideo.privacy_status,
        cached: true
      });
    }

    // Token refresh logic
    let accessToken = integration.provider_access_token;
    let expiresAt = integration.provider_token_expires_at ? new Date(integration.provider_token_expires_at) : null;
    const now = new Date();

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
        console.log('YouTube Video Details API - token refreshed');
      } catch (err) {
        console.error('YouTube Video Details API - token refresh failed:', err);
        return res.status(400).json({
          error: 'YouTube token refresh failed',
          message: 'Please reconnect your YouTube account in the Integrations page.'
        });
      }
    }

    // Fetch detailed video information from YouTube API
    const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails,status&id=${videoId}`;
    console.log('YouTube Video Details API - Fetching detailed video stats from:', statsUrl);
    
    const statsRes = await fetch(statsUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    const statsData = await statsRes.json();
    if (!statsRes.ok || !statsData.items || statsData.items.length === 0) {
      return res.status(404).json({ 
        error: 'Video not found',
        message: 'The requested video could not be found or you may not have access to it.'
      });
    }

    const videoData = statsData.items[0];
    const detailedVideo = {
      id: videoData.id,
      title: videoData.snippet.title,
      description: videoData.snippet.description,
      thumbnail_url: videoData.snippet.thumbnails?.high?.url || '',
      published_at: videoData.snippet.publishedAt,
      view_count: parseInt(videoData.statistics.viewCount) || 0,
      like_count: parseInt(videoData.statistics.likeCount) || 0,
      comment_count: parseInt(videoData.statistics.commentCount) || 0,
      duration: videoData.contentDetails.duration,
      channel_id: videoData.snippet.channelId,
      channel_title: videoData.snippet.channelTitle,
      privacyStatus: videoData.status?.privacyStatus || 'public',
    };

    // Update the database with detailed information
    const updateData = {
      view_count: detailedVideo.view_count,
      like_count: detailedVideo.like_count,
      comment_count: detailedVideo.comment_count,
      duration: detailedVideo.duration,
      privacy_status: detailedVideo.privacyStatus,
      fetched_at: now.toISOString(),
    };

    await supabase
      .from('youtube_videos')
      .update(updateData)
      .eq('user_id', userId)
      .eq('youtube_video_id', videoId);

    console.log('YouTube Video Details API - Updated video details in database for video:', videoId);

    return res.status(200).json({
      ...detailedVideo,
      cached: false
    });

  } catch (error) {
    console.error('YouTube Video Details API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'An unexpected error occurred. Please try again later.'
    });
  }
}

export default withAuth(handler); 