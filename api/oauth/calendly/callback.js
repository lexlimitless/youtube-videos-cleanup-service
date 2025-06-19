import { supabaseAdmin } from '../../../src/server/supabase-admin.js';

export default async function handler(req, res) {
  const { code, state } = req.query;

  if (!code || !state) {
    return res.status(400).send('Missing code or state');
  }

  try {
    const stateObj = JSON.parse(atob(state));
    const { user_id: userId } = stateObj;

    const tokenResponse = await fetch('https://auth.calendly.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: process.env.VITE_CALENDLY_CLIENT_ID,
        client_secret: process.env.CALENDLY_CLIENT_SECRET,
        code,
        redirect_uri: `${process.env.VITE_API_URL}/oauth/calendly/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      console.error('Failed to get token from Calendly:', errorBody);
      return res.status(500).send('Failed to authenticate with Calendly');
    }

    const tokenData = await tokenResponse.json();
    const { access_token } = tokenData;

    const userResponse = await fetch('https://api.calendly.com/users/me', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const userData = await userResponse.json();
    const organizationUri = userData.resource.current_organization;

    const webhookUrl = `${process.env.VITE_API_URL}/webhooks/calendly`;

    const webhookResponse = await fetch('https://api.calendly.com/webhook_subscriptions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${access_token}`,
      },
      body: JSON.stringify({
        url: webhookUrl,
        events: ['invitee.created'],
        organization: organizationUri,
        scope: 'organization',
      }),
    });

    if (!webhookResponse.ok) {
      const errorBody = await webhookResponse.json();
      console.error('Calendly webhook setup failed:', errorBody);
      return res.status(500).send('Failed to set up Calendly webhook.');
    }
    
    const webhookData = await webhookResponse.json();
    const webhookId = webhookData.resource.uri;

    const { error: integrationError } = await supabaseAdmin
      .from('user_integrations')
      .upsert({
        user_id: userId,
        provider: 'calendly',
        access_token,
        is_connected: true,
        webhook_id: webhookId,
      }, { onConflict: 'user_id, provider' });

    if (integrationError) {
      console.error('Supabase user_integrations upsert error:', integrationError);
      throw integrationError;
    }

    const { error: webhookStatusError } = await supabaseAdmin
      .from('webhook_status')
      .upsert({
        provider: 'calendly',
        is_active: true,
        last_checked_at: new Date().toISOString(),
        webhook_id: webhookId,
        user_id: userId,
      }, { onConflict: 'user_id, provider' });

    if (webhookStatusError) {
      console.error('Supabase webhook_status upsert error:', webhookStatusError);
      throw webhookStatusError;
    }

    res.redirect('/integrations');
  } catch (error) {
    console.error('Error in Calendly callback:', error);
    res.status(500).send('Internal Server Error');
  }
} 