import { supabase } from '../../../src/server/supabase.js';

export default async function handler(req, res) {
  console.log('Calendly OAuth callback endpoint hit');
  // Log environment for debugging
  console.log('Using PRODUCTION Calendly environment');
  console.log('Client ID:', process.env.CALENDLY_CLIENT_ID);
  console.log('Redirect URI:', process.env.CALENDLY_REDIRECT_URI);

  const { code, state, user_id } = req.query;
  if (!code) {
    console.error('Missing code in callback');
    return res.status(400).send('Missing code');
  }

  if (!process.env.CALENDLY_REDIRECT_URI) {
    console.error('Missing CALENDLY_REDIRECT_URI environment variable');
    return res.status(500).send('Server configuration error');
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch('https://auth.calendly.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.CALENDLY_CLIENT_ID,
        client_secret: process.env.CALENDLY_CLIENT_SECRET,
        redirect_uri: process.env.CALENDLY_REDIRECT_URI,
      }),
    });
    const tokenData = await tokenRes.json();
    console.log('Calendly token response:', tokenData);
    if (!tokenData.access_token) {
      console.error('OAuth failed:', tokenData);
      return res.status(400).send('OAuth failed');
    }

    // Store the access token for the user (assume user_id is available)
    const { error } = await supabase.from('user_integrations').upsert([
      {
        user_id: user_id || 'demo-user', // Replace with real user ID from session
        provider: 'calendly',
        access_token: tokenData.access_token,
        is_connected: true,
      }
    ], { onConflict: 'user_id,provider' });
    if (error) {
      console.error('Supabase upsert error:', error);
      return res.status(500).send('Failed to store access token');
    }

    // Redirect to integrations page
    res.writeHead(302, { Location: '/integrations' });
    res.end();
  } catch (e) {
    console.error('OAuth callback error:', e);
    res.status(500).send('OAuth callback error');
  }
} 