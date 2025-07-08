import { supabaseAdmin } from '../server/supabase-admin.js';

export async function getYouTubeAccessToken(userId) {
  const { data: integration, error } = await supabaseAdmin
    .from('user_integrations')
    .select('provider_access_token, provider_refresh_token, provider_token_expires_at')
    .eq('user_id', userId)
    .eq('provider', 'youtube')
    .single();

  if (error || !integration) {
    console.error(`Error fetching YouTube integration for user ${userId}:`, error);
    return null;
  }

  // If no token expiration is stored, assume the token is still valid
  if (!integration.provider_token_expires_at) {
    return integration.provider_access_token;
  }

  const tokenExpiresAt = new Date(integration.provider_token_expires_at).getTime();
  const now = new Date().getTime();
  const buffer = 5 * 60 * 1000; // 5-minute buffer

  // If token is not about to expire, return it
  if (now < tokenExpiresAt - buffer) {
    return integration.provider_access_token;
  }

  // Token is expired or about to expire, refresh it
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.YOUTUBE_CLIENT_ID,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET,
      refresh_token: integration.provider_refresh_token,
    }),
  });

  const tokenData = await response.json();

  if (!response.ok) {
    console.error(`Failed to refresh YouTube token for user ${userId}:`, tokenData);
    // Potentially delete the integration here if the refresh token is invalid
    return null;
  }

  // Update the database with the new token information
  const newExpiresAt = new Date(new Date().getTime() + tokenData.expires_in * 1000);
  const { error: updateError } = await supabaseAdmin
    .from('user_integrations')
    .update({
      provider_access_token: tokenData.access_token,
      provider_refresh_token: tokenData.refresh_token || integration.provider_refresh_token,
      provider_token_expires_at: newExpiresAt.toISOString(),
    })
    .eq('user_id', userId)
    .eq('provider', 'youtube');

  if (updateError) {
    console.error(`Error updating refreshed YouTube token for user ${userId}:`, updateError);
    // Even if DB update fails, return the new token for immediate use
  }

  return tokenData.access_token;
}

export async function getYouTubeChannelInfo(userId) {
  const accessToken = await getYouTubeAccessToken(userId);
  if (!accessToken) {
    return null;
  }

  try {
    const response = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error(`Failed to fetch YouTube channel info for user ${userId}:`, response.status);
      return null;
    }

    const data = await response.json();
    return data.items?.[0] || null;
  } catch (error) {
    console.error(`Error fetching YouTube channel info for user ${userId}:`, error);
    return null;
  }
}

export async function getYouTubeVideos(userId, maxResults = 50) {
  const accessToken = await getYouTubeAccessToken(userId);
  if (!accessToken) {
    return null;
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&forMine=true&type=video&maxResults=${maxResults}&order=date`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error(`Failed to fetch YouTube videos for user ${userId}:`, response.status);
      return null;
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error(`Error fetching YouTube videos for user ${userId}:`, error);
    return null;
  }
} 