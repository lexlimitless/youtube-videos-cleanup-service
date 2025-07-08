import { supabaseAdmin } from '../../src/server/supabase-admin.js';
import { withAuth } from '../../src/middleware/auth.js';

async function handler(req, res) {
  const { userId } = req.auth;

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code, error } = req.query;

    // Check for OAuth errors
    if (error) {
      console.error(`[YouTube OAuth] Error for user ${userId}:`, error);
      return res.redirect(`/integrations?error=youtube_oauth_error&message=${encodeURIComponent(error)}`);
    }

    // Validate authorization code
    if (!code) {
      console.error(`[YouTube OAuth] No authorization code provided for user ${userId}`);
      return res.redirect('/integrations?error=youtube_no_code');
    }

    console.log(`[YouTube OAuth] Processing authorization code for user ${userId}`);

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.YOUTUBE_CLIENT_ID,
        client_secret: process.env.YOUTUBE_CLIENT_SECRET,
        code: code,
        redirect_uri: `${process.env.API_URL}/api/youtube/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      console.error(`[YouTube OAuth] Token exchange failed for user ${userId}:`, errorBody);
      return res.redirect('/integrations?error=youtube_token_exchange_failed');
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokenData;

    if (!access_token) {
      console.error(`[YouTube OAuth] No access token received for user ${userId}`);
      return res.redirect('/integrations?error=youtube_no_access_token');
    }

    console.log(`[YouTube OAuth] Successfully obtained access token for user ${userId}`);

    // Fetch YouTube channel information
    const channelResponse = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
      {
        headers: {
          'Authorization': `Bearer ${access_token}`,
        },
      }
    );

    if (!channelResponse.ok) {
      const errorBody = await channelResponse.text();
      console.error(`[YouTube OAuth] Failed to fetch channel info for user ${userId}:`, errorBody);
      return res.redirect('/integrations?error=youtube_channel_fetch_failed');
    }

    const channelData = await channelResponse.json();
    
    if (!channelData.items || channelData.items.length === 0) {
      console.error(`[YouTube OAuth] No channels found for user ${userId}`);
      return res.redirect('/integrations?error=youtube_no_channels');
    }

    const channel = channelData.items[0];
    const channelId = channel.id;
    const channelSnippet = channel.snippet;

    console.log(`[YouTube OAuth] Found channel for user ${userId}:`, channelId);

    // Calculate token expiration
    const expiresAt = new Date(new Date().getTime() + expires_in * 1000).toISOString();

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
      console.error(`[YouTube OAuth] Failed to store integration for user ${userId}:`, integrationError);
      return res.redirect('/integrations?error=youtube_database_error');
    }

    // Store in youtube_accounts table for YouTube-specific data
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
      console.error(`[YouTube OAuth] Failed to store YouTube account for user ${userId}:`, youtubeAccountError);
      // Don't fail the entire process if this fails, as the main integration is stored
    }

    console.log(`[YouTube OAuth] Successfully connected YouTube channel for user ${userId}: ${channelId}`);

    // Redirect back to integrations page with success message
    return res.redirect('/integrations?success=youtube_connected&channel=' + encodeURIComponent(channelSnippet.title));

  } catch (error) {
    console.error(`[YouTube OAuth] Unexpected error for user ${userId}:`, error);
    return res.redirect('/integrations?error=youtube_unexpected_error');
  }
}

export default withAuth(handler); 