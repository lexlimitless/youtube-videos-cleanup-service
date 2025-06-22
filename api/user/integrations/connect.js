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

    if (tokenData.access_token) {
      const newExpiresAt = new Date(new Date().getTime() + tokenData.expires_in * 1000);

      const userResponse = await fetch('https://api.calendly.com/v2/users/me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      const userData = await userResponse.json();

      if (!userResponse.ok || !userData.resource) {
        console.error('Failed to fetch Calendly user details:', userData);
        throw new Error('Could not fetch Calendly user details.');
      }
      
      const calendly_user_uri = userData.resource.uri;
      const calendly_organization_uri = userData.resource.current_organization;

      const { error: dbError } = await supabaseAdmin
        .from('user_integrations')
        .upsert(
          {
            user_id: userId,
            provider: 'calendly',
            provider_access_token: tokenData.access_token,
            provider_refresh_token: tokenData.refresh_token,
            provider_token_expires_at: newExpiresAt.toISOString(),
            is_connected: true,
            calendly_user_uri: calendly_user_uri,
            calendly_organization_uri: calendly_organization_uri
          },
          { onConflict: 'user_id, provider' }
        );

      if (dbError) throw dbError;

      // Now, create the webhook subscription
      const webhookUrl = `${process.env.API_URL}/api/webhooks/calendly`;
      
      const webhookPayload = {
        url: webhookUrl,
        events: ['invitee.created', 'invitee.canceled'],
        organization: calendly_organization_uri,
        scope: 'organization',
        user: calendly_user_uri,
      };

      const webhookRes = await fetch('https://api.calendly.com/v2/webhook_subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(webhookPayload),
      });

      if (!webhookRes.ok) {
        const errorBody = await webhookRes.json();
        console.error('Failed to create webhook:', errorBody);
        if (errorBody.title !== 'Hook with this url already exists') {
          throw new Error(`Webhook creation failed: ${errorBody.message}`);
        }
        console.log('Webhook already exists, which is acceptable.');
      } else {
        const webhookData = await webhookRes.json();
        await supabaseAdmin.from('user_integrations').update({
          webhook_id: webhookData.resource.uri,
        }).eq('user_id', userId).eq('provider', 'calendly');
        console.log('Successfully created and stored webhook subscription.');
      }
    }

    res.redirect('/integrations');
  } catch (error) {
    console.error('Error connecting integration:', error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

export default withAuth(handler); 