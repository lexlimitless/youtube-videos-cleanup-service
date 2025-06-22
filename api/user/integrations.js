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
    
    console.log('GET integrations for user:', userId, 'Data:', data);
    return res.status(200).json({ data });
  }

  if (req.method === 'DELETE') {
    const { provider } = req.body;
    if (provider !== 'calendly') {
      return res.status(400).json({ error: 'Unsupported provider for disconnect.' });
    }

    // Get the user's access token to revoke it
    const accessToken = await getCalendlyAccessToken(userId);
    if (!accessToken) {
      // Even if token is missing, proceed to delete from our DB
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
        console.log(`Successfully revoked Calendly token for user ${userId}`);
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