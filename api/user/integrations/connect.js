import { supabaseAdmin } from '../../../src/server/supabase-admin.js';
import { withAuth } from '../../../src/middleware/auth.js';

async function handler(req, res) {
  const { userId } = req.auth;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { provider, code, codeVerifier } = req.body;

    if (provider !== 'calendly' || !code || !codeVerifier) {
      return res.status(400).json({ error: 'Invalid provider or missing authorization code/verifier' });
    }

    const payload = {
      grant_type: 'authorization_code',
      client_id: process.env.VITE_CALENDLY_CLIENT_ID,
      client_secret: process.env.CALENDLY_CLIENT_SECRET,
      code: code,
      redirect_uri: `${process.env.API_URL}/integrations/calendly-callback`,
      code_verifier: codeVerifier,
    };

    console.log('--- Calendly Token Exchange ---');
    console.log('Payload sent to Calendly (excluding secrets):', {
      grant_type: payload.grant_type,
      client_id: payload.client_id,
      redirect_uri: payload.redirect_uri,
      client_secret_present: !!payload.client_secret,
      client_secret_length: payload.client_secret?.length || 0,
      api_url_present: !!process.env.API_URL,
    });

    // Exchange authorization code for access token, now including the client_secret
    const tokenResponse = await fetch('https://auth.calendly.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!tokenResponse.ok) {
        const errorBody = await tokenResponse.json();
        console.error('Failed to get token from Calendly:', errorBody);
        return res.status(401).json({ error: 'Failed to authenticate with Calendly.' });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in;

    // Calculate expiration time
    const expiresAt = new Date(new Date().getTime() + expiresIn * 1000).toISOString();

    // Use the access token to get user's organization URI from Calendly
    const userResponse = await fetch('https://api.calendly.com/users/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!userResponse.ok) {
        console.error('Failed to fetch Calendly user data');
        throw new Error('Failed to fetch user data from Calendly');
    }
    
    const userData = await userResponse.json();
    const organizationUri = userData.resource.current_organization;
    const calendlyUserUri = userData.resource.uri;

    let webhookId;
    const webhookUrl = `${process.env.API_URL}/webhooks/calendly/user/${userId}`;
    
    // Attempt to create the webhook subscription
    const webhookResponse = await fetch('https://api.calendly.com/webhook_subscriptions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        url: webhookUrl,
        events: ['invitee.created'],
        organization: organizationUri,
        scope: 'user',
        user: calendlyUserUri,
      }),
    });

    if (webhookResponse.ok) {
        const webhookData = await webhookResponse.json();
        webhookId = webhookData.resource.uri;
        console.log(`Successfully created new webhook for user ${userId}: ${webhookId}`);

    } else {
        const errorBody = await webhookResponse.json();
        console.error('Calendly webhook setup failed:', errorBody);
        throw new Error('Failed to set up Calendly webhook.');
    }

    // Save the user-specific integration details to the database
    await supabaseAdmin.from('user_integrations').upsert({
      user_id: userId,
      provider: 'calendly',
      provider_access_token: accessToken,
      provider_refresh_token: refreshToken,
      provider_token_expires_at: expiresAt,
      is_connected: true,
      webhook_id: webhookId,
      calendly_organization_uri: organizationUri,
      calendly_user_uri: calendlyUserUri,
    }, { onConflict: 'user_id, provider' });

    // The webhook_status table is now managed independently and not tied to each user.
    // We no longer update it here for every user.

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('Error connecting integration:', error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

export default withAuth(handler); 