import { supabaseAdmin } from '../../../src/server/supabase-admin.js';
import { withAuth } from '../../../src/middleware/auth.js';

async function handler(req, res, userId) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { provider, accessToken } = req.body;

    if (provider !== 'calendly' || !accessToken) {
      return res.status(400).json({ error: 'Invalid provider or missing access token' });
    }

    // Use the access token to get user's organization URI from Calendly
    const userResponse = await fetch('https://api.calendly.com/users/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!userResponse.ok) throw new Error('Failed to fetch user data from Calendly');
    
    const userData = await userResponse.json();
    const organizationUri = userData.resource.current_organization;

    // Set up the webhook subscription with Calendly
    const webhookUrl = `${process.env.VITE_API_URL}/webhooks/calendly`;
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
        scope: 'organization',
      }),
    });

    if (!webhookResponse.ok) {
        const errorBody = await webhookResponse.json();
        console.error('Calendly webhook setup failed:', errorBody);
        throw new Error('Failed to set up Calendly webhook.');
    }
    
    const webhookData = await webhookResponse.json();
    const webhookId = webhookData.resource.uri;

    // Save the integration details to the database
    await supabaseAdmin.from('user_integrations').upsert({
      user_id: userId,
      provider: 'calendly',
      access_token: accessToken,
      is_connected: true,
      webhook_id: webhookId,
    }, { onConflict: 'user_id, provider' });

    // Save the webhook status to the database
    await supabaseAdmin.from('webhook_status').upsert({
      provider: 'calendly',
      is_active: true,
      webhook_id: webhookId,
      user_id: userId,
    }, { onConflict: 'user_id, provider' });

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('Error connecting integration:', error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

export default withAuth(handler); 