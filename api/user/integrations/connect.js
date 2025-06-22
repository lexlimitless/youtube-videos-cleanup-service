import { supabaseAdmin } from '../../../src/server/supabase-admin.js';
import { withAuth } from '../../../src/middleware/auth.js';

async function handler(req, res) {
  const { userId } = req.auth;

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
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

    const tokenResponse = await fetch('https://auth.calendly.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!tokenResponse.ok) {
        const errorBody = await tokenResponse.json();
        console.error('Failed to get token from Calendly for user:', userId, errorBody);
        return res.status(401).json({ error: 'Failed to authenticate with Calendly.' });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in;

    const expiresAt = new Date(new Date().getTime() + expiresIn * 1000).toISOString();

    const userResponse = await fetch('https://api.calendly.com/users/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!userResponse.ok) {
        console.error('Failed to fetch Calendly user data for user:', userId);
        throw new Error('Failed to fetch user data from Calendly');
    }
    
    const userData = await userResponse.json();
    const organizationUri = userData.resource.current_organization;
    const calendlyUserUri = userData.resource.uri;

    let webhookId;
    const webhookUrl = `${process.env.API_URL}/api/webhooks/calendly`;
    
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
    } else {
        const errorBody = await webhookResponse.json();
        console.error('Calendly webhook setup failed for user:', userId, errorBody);
        throw new Error('Failed to set up Calendly webhook.');
    }

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

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error(`Error connecting integration for user: ${userId}`, error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

export default withAuth(handler); 