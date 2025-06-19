import { supabaseAdmin } from '../../../src/server/supabase-admin.js';

export default async function handler(req, res) {
  console.log('Calendly OAuth callback endpoint hit');
  // Log environment for debugging
  console.log('Using PRODUCTION Calendly environment');
  console.log('Client ID:', process.env.CALENDLY_CLIENT_ID);
  console.log('Redirect URI:', process.env.CALENDLY_REDIRECT_URI);

  const { code, state } = req.query;
  if (!code || !state) {
    console.error('Missing code or state in callback');
    return res.status(400).send('Missing required parameters');
  }

  // Decode state parameter to get user ID
  let stateData;
  try {
    console.log('Raw state from query:', state);
    stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    console.log('Decoded state data:', stateData);
  } catch (e) {
    console.error('Invalid state parameter:', e);
    return res.status(400).send('Invalid state parameter');
  }

  const { user_id } = stateData;
  if (!user_id) {
    console.error('Missing user_id in state');
    return res.status(400).send('Missing user ID');
  }

  console.log('User ID from state (exact value):', user_id);
  console.log('User ID character codes:', Array.from(user_id).map(c => `${c}: ${c.charCodeAt(0)}`));

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

    // Get user's organization URI
    const userRes = await fetch('https://api.calendly.com/users/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json'
      }
    });
    const userData = await userRes.json();
    console.log('Calendly user data:', userData);

    if (!userData.resource?.current_organization) {
      console.error('Failed to get user organization:', userData);
      return res.status(500).send('Failed to get user organization');
    }

    // Set up webhook subscription
    const webhookUrl = `${process.env.VERCEL_URL || 'https://qr-code-generator-e5k7asgp0-paul-amazinggains-projects.vercel.app'}/api/webhooks/calendly`;
    const webhookRes = await fetch('https://api.calendly.com/webhook_subscriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: webhookUrl,
        organization: userData.resource.current_organization,
        scope: 'organization',
        events: ['invitee.created']
      })
    });
    const webhookData = await webhookRes.json();
    console.log('Calendly webhook setup response:', webhookData);

    // Initialize webhook status if it doesn't exist
    const { error: webhookError } = await supabaseAdmin
      .from('webhook_status')
      .upsert([
        {
          provider: 'calendly',
          is_active: true,
          last_checked_at: new Date().toISOString(),
          webhook_id: webhookData.resource?.id // Store the webhook ID
        }
      ], { onConflict: 'provider' });

    if (webhookError) {
      console.error('Error initializing webhook status:', webhookError);
    }

    // Store the access token for the user
    console.log('Attempting to store integration with user_id:', user_id);
    const { data: integrationData, error } = await supabaseAdmin
      .from('user_integrations')
      .upsert([
        {
          user_id,
          provider: 'calendly',
          access_token: tokenData.access_token,
          is_connected: true,
          webhook_id: webhookData.resource?.id // Store the webhook ID with the integration
        }
      ], { onConflict: 'user_id,provider' });

    console.log('Integration storage result:', { data: integrationData, error });
    
    if (error) {
      console.error('Supabase upsert error:', error);
      return res.status(500).send('Failed to store access token');
    }

    // Double check the stored data
    const { data: verifyData, error: verifyError } = await supabaseAdmin
      .from('user_integrations')
      .select('*')
      .eq('user_id', user_id)
      .eq('provider', 'calendly')
      .single();

    console.log('Verification query result:', { data: verifyData, error: verifyError });

    // Redirect to integrations page
    res.writeHead(302, { Location: '/integrations' });
    res.end();
  } catch (e) {
    console.error('OAuth callback error:', e);
    res.status(500).send('OAuth callback error');
  }
} 