import { supabaseAdmin } from '../server/supabase-admin.js';

export async function getCalendlyAccessToken(userId) {
  const { data: integration, error } = await supabaseAdmin
    .from('user_integrations')
    .select('provider_access_token, provider_refresh_token, provider_token_expires_at')
    .eq('user_id', userId)
    .eq('provider', 'calendly')
    .single();

  if (error || !integration) {
    console.error(`Error fetching Calendly integration for user ${userId}:`, error);
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
  console.log(`Refreshing Calendly token for user ${userId}`);
  const response = await fetch('https://auth.calendly.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: process.env.CALENDLY_CLIENT_ID,
      client_secret: process.env.CALENDLY_CLIENT_SECRET,
      refresh_token: integration.provider_refresh_token,
    }),
  });

  const tokenData = await response.json();

  if (!response.ok) {
    console.error(`Failed to refresh Calendly token for user ${userId}:`, tokenData);
    // Potentially delete the integration here if the refresh token is invalid
    return null;
  }

  // Update the database with the new token information
  const newExpiresAt = new Date(new Date().getTime() + tokenData.expires_in * 1000);
  const { error: updateError } = await supabaseAdmin
    .from('user_integrations')
    .update({
      provider_access_token: tokenData.access_token,
      provider_refresh_token: tokenData.refresh_token,
      provider_token_expires_at: newExpiresAt.toISOString(),
    })
    .eq('user_id', userId)
    .eq('provider', 'calendly');

  if (updateError) {
    console.error(`Error updating refreshed Calendly token for user ${userId}:`, updateError);
    // Even if DB update fails, return the new token for immediate use
  }

  return tokenData.access_token;
} 