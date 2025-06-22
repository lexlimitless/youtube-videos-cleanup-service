import { supabaseAdmin } from '../../../src/server/supabase-admin.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user_id } = req.body;
  if (!user_id) {
    return res.status(400).json({ error: 'Missing user_id' });
  }

  try {
    // Update the integration status in the database
    const { error } = await supabaseAdmin
      .from('user_integrations')
      .update({
        is_connected: false,
        access_token: null, // Clear the access token
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user_id)
      .eq('provider', 'calendly');

    if (error) {
      console.error('Error in old Calendly disconnect endpoint:', error);
      return res.status(500).json({ error: 'Failed to disconnect Calendly' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error in disconnect handler:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 