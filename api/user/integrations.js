import { supabaseAdmin } from '../../src/server/supabase-admin.js';
import { withAuth } from '../../src/middleware/auth.js';

async function handler(req, res) {
  const { userId } = req.auth;

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('user_integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('is_connected', true);

    if (error) return res.status(500).json({ error: error.message });
    
    console.log('GET integrations for user:', userId, 'Data:', data);
    return res.status(200).json({ data });
  }

  if (req.method === 'DELETE') {
    const { provider } = req.body;
    if (!provider) return res.status(400).json({ error: 'Missing provider' });

    try {
      // Get the current integration data to access tokens and webhook IDs
      const { data: integration, error: getError } = await supabaseAdmin
        .from('user_integrations')
        .select('*')
        .eq('user_id', userId)
        .eq('provider', provider)
        .single();

      if (getError) throw getError;

      // We only need to revoke the token and delete the local records.
      // The shared webhook is never deleted on a single user's disconnect.
      if (provider === 'calendly' && integration?.access_token) {
        // Revoke the OAuth token
        try {
          await fetch('https://auth.calendly.com/oauth/revoke', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              client_id: process.env.CALENDLY_CLIENT_ID,
              client_secret: process.env.CALENDLY_CLIENT_SECRET,
              token: integration.access_token,
            }),
          });
        } catch (e) {
          console.error('Error revoking Calendly token:', e);
        }
      }

      // Delete the user's integration record
      const { error: deleteError } = await supabaseAdmin
        .from('user_integrations')
        .delete()
        .eq('user_id', userId)
        .eq('provider', provider);

      if (deleteError) throw deleteError;

      // We also remove the user-specific webhook status record, if it exists.
      await supabaseAdmin
        .from('webhook_status')
        .delete()
        .eq('user_id', userId);

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error disconnecting integration:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAuth(handler); 