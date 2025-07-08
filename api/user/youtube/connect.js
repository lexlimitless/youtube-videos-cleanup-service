import { supabaseAdmin } from '../../../src/server/supabase-admin.js';
import { withAuth } from '../../../src/middleware/auth.js';

async function handler(req, res) {
  const { userId } = req.auth;

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code, state, userId: bodyUserId } = req.body;
    if (!code || !state || !bodyUserId) {
      return res.status(400).json({ error: 'Missing code, state, or userId' });
    }
    if (userId !== bodyUserId) {
      return res.status(403).json({ error: 'User mismatch' });
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.YOUTUBE_CLIENT_ID,
        client_secret: process.env.YOUTUBE_CLIENT_SECRET,
        code,
        redirect_uri: `${process.env.API_URL}/api/youtube/callback`,
      }),
    });
    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      return res.status(401).json({ error: 'Failed to exchange code for tokens', details: errorBody });
    }
    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokenData;
    if (!access_token) {
      return res.status(401).json({ error: 'No access token received from Google' });
    }
    const expiresAt = new Date(new Date().getTime() + expires_in * 1000).toISOString();

    // Fetch YouTube channel info
    const channelResponse = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
      headers: { 'Authorization': `Bearer ${access_token}` },
    });
    if (!channelResponse.ok) {
      const errorBody = await channelResponse.text();
      return res.status(500).json({ error: 'Failed to fetch YouTube channel info', details: errorBody });
    }
    const channelData = await channelResponse.json();
    if (!channelData.items || channelData.items.length === 0) {
      return res.status(404).json({ error: 'No YouTube channels found for this account' });
    }
    const channel = channelData.items[0];
    const channelId = channel.id;
    const channelSnippet = channel.snippet;

    // Store in user_integrations table
    const { error: integrationError } = await supabaseAdmin
      .from('user_integrations')
      .upsert({
        user_id: userId,
        provider: 'youtube',
        provider_access_token: access_token,
        provider_refresh_token: refresh_token,
        provider_token_expires_at: expiresAt,
        provider_user_id: channelId,
        provider_channel_id: channelId,
        provider_channel_title: channelSnippet.title,
        provider_channel_description: channelSnippet.description,
        provider_channel_thumbnail: channelSnippet.thumbnails?.default?.url,
        is_connected: true,
      }, { onConflict: 'user_id, provider' });
    if (integrationError) {
      return res.status(500).json({ error: 'Failed to store integration', details: integrationError });
    }

    // Store in youtube_accounts table
    const { error: youtubeAccountError } = await supabaseAdmin
      .from('youtube_accounts')
      .upsert({
        user_id: userId,
        channel_id: channelId,
        channel_title: channelSnippet.title,
        channel_description: channelSnippet.description,
        channel_thumbnail: channelSnippet.thumbnails?.default?.url,
        access_token: access_token,
        refresh_token: refresh_token,
        token_expires_at: expiresAt,
        is_connected: true,
      }, { onConflict: 'channel_id' });
    if (youtubeAccountError) {
      // Don't fail the whole process if this fails
    }

    return res.status(200).json({ success: true, channel_title: channelSnippet.title });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

export default withAuth(handler); 