import { supabaseAdmin } from '../../src/server/supabase-admin.js';
import { withAuth } from '../../src/middleware/auth.js';

async function handler(req, res) {
  const { userId } = req.auth;

  if (req.method === 'GET') {
    const { id } = req.query;
    
    if (id) {
      // Get specific link
      const { data, error } = await supabaseAdmin
        .from('links')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (error) return res.status(500).json({ error: error.message });
      if (!data) return res.status(404).json({ error: 'Link not found' });
      
      return res.status(200).json({ data });
    } else {
      // Get all links for user
      const { data, error } = await supabaseAdmin
        .from('links')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ data });
    }
  }

  if (req.method === 'POST') {
    const { destination_url, title, platform, attribution_window_days, youtube_video_id } = req.body;
    
    if (!destination_url) {
      return res.status(400).json({ error: 'Missing destination_url' });
    }

    // Generate short code
    const shortCode = Math.random().toString(36).substring(2, 8);

    let finalTitle = title || '';
    if (platform === 'YouTube' && youtube_video_id) {
      // Fetch YouTube integration for this user
      const { data: integration, error: integrationError } = await supabaseAdmin
        .from('user_integrations')
        .select('*')
        .eq('user_id', userId)
        .eq('provider', 'youtube')
        .eq('is_connected', true)
        .single();
      if (!integrationError && integration && integration.provider_access_token) {
        // Fetch video details from YouTube API
        const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${youtube_video_id}`;
        const statsRes = await fetch(statsUrl, {
          headers: { Authorization: `Bearer ${integration.provider_access_token}` },
        });
        const statsData = await statsRes.json();
        if (statsRes.ok && statsData.items && statsData.items.length > 0) {
          const videoData = statsData.items[0];
          finalTitle = videoData.snippet.title;
          // Upsert video details into youtube_videos
          await supabaseAdmin.from('youtube_videos').upsert({
            user_id: userId,
            youtube_video_id: youtube_video_id,
            title: videoData.snippet.title,
            description: videoData.snippet.description,
            thumbnail_url: videoData.snippet.thumbnails?.high?.url || '',
            published_at: videoData.snippet.publishedAt,
            view_count: parseInt(videoData.statistics.viewCount) || null,
            channel_id: videoData.snippet.channelId,
            channel_title: videoData.snippet.channelTitle,
            fetched_at: new Date().toISOString(),
          }, { onConflict: 'user_id,youtube_video_id' });
        }
      }
    }

    const { data, error } = await supabaseAdmin
      .from('links')
      .insert([{
        user_id: userId,
        destination_url,
        short_code: shortCode,
        title: finalTitle,
        platform: platform || 'YouTube',
        attribution_window_days: attribution_window_days || 7,
        youtube_video_id: youtube_video_id || null
      }])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ data });
  }

  if (req.method === 'PUT') {
    const { id, destination_url, title, platform, attribution_window_days } = req.body;
    
    if (!id) {
      return res.status(400).json({ error: 'Missing id' });
    }

    const { data, error } = await supabaseAdmin
      .from('links')
      .update({
        destination_url,
        title: title || '',
        platform: platform || 'YouTube',
        attribution_window_days: attribution_window_days || 7,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Link not found' });
    
    return res.status(200).json({ data });
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'Missing id' });
    }

    const { error } = await supabaseAdmin
      .from('links')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAuth(handler); 