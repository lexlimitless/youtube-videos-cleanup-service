import { supabaseAdmin } from '../../src/server/supabase-admin.js';
import { withAuth } from '../../src/middleware/auth.js';

async function handler(req, res, userId) {
  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('user_integrations')
      .select('*')
      .eq('user_id', userId);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ data });
  }

  if (req.method === 'DELETE') {
    const { provider } = req.body;
    if (!provider) return res.status(400).json({ error: 'Missing provider' });
    const { error } = await supabaseAdmin
      .from('user_integrations')
      .update({
        is_connected: false,
        access_token: null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('provider', provider);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAuth(handler); 