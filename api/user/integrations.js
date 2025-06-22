import { supabaseAdmin } from '../../src/server/supabase-admin.js';
import { withAuth } from '../../src/middleware/auth.js';
import { getCalendlyAccessToken } from '../../src/lib/calendly.js';

async function handler(req, res) {
  const { userId } = req.auth;

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('user_integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('is_connected', true);

    if (error) return res.status(500).json({ error: error.message });
    
    return res.status(200).json({ data });
  }

  if (req.method === 'DELETE') {
    const { provider } = req.body;
    if (provider !== 'calendly') {
      return res.status(400).json({ error: 'Unsupported provider for disconnect.' });
    }

    // Get the user's integration details including webhook ID
    const { data: integration, error: fetchError } = await supabaseAdmin
      .from('user_integrations')
      .select('webhook_id, provider_access_token')
      .eq('user_id', userId)
      .eq('provider', provider)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error(`Error fetching integration for user ${userId}:`, fetchError);
      return res.status(500).json({ error: 'Failed to fetch integration details.' });
    }

    // Delete the webhook from Calendly if it exists
    if (integration?.webhook_id) {
      try {
        const accessToken = await getCalendlyAccessToken(userId);
        if (accessToken) {
          const webhookDeleteResponse = await fetch(integration.webhook_id, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          });
          
          if (webhookDeleteResponse.ok) {
            // Webhook deleted successfully
          } else {
            console.warn(`Failed to delete webhook for user ${userId}, but proceeding with disconnect. Status: ${webhookDeleteResponse.status}`);
          }
        }
      } catch (webhookError) {
        console.error(`Error deleting webhook for user ${userId}, but proceeding with disconnect:`, webhookError);
      }
    }

    // Revoke the access token
    const accessToken = await getCalendlyAccessToken(userId);
    if (!accessToken) {
      console.warn(`Could not get Calendly access token for user ${userId}, but proceeding with disconnect.`);
    } else {
      try {
        await fetch('https://auth.calendly.com/oauth/revoke', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${process.env.CALENDLY_CLIENT_ID}:${process.env.CALENDLY_CLIENT_SECRET}`).toString('base64')}`
          },
          body: `token=${accessToken}`
        });
      } catch (revokeError) {
        console.error(`Error revoking Calendly token for user ${userId}, but proceeding with disconnect.`, revokeError);
      }
    }
    
    // Delete the integration from the database
    const { error: dbError } = await supabaseAdmin
      .from('user_integrations')
      .delete()
      .eq('user_id', userId)
      .eq('provider', provider);

    if (dbError) {
      console.error(`Error deleting integration from DB for user ${userId}:`, dbError);
      return res.status(500).json({ error: 'Failed to disconnect integration.' });
    }

    return res.status(200).json({ success: true, message: 'Integration disconnected successfully.' });
  }

  res.setHeader('Allow', ['GET', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default withAuth(handler); 